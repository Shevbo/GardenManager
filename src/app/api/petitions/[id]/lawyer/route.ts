import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'
import { lawyerChat } from '@/lib/deepseek'
import { buildLawyerContext } from '@/lib/lawyer'
import { webSearch, webSearchEnabled } from '@/lib/lawyer-tools'
import { getLawyerQuota } from '@/lib/settings'
import { formatDocNumber } from '@/lib/doc-number'
import { STATUS_LABEL } from '@/lib/petition-status-label'
import type { PetitionStatus } from '@/lib/petition-status'

const ADMIN_ROLES = ['org_admin', 'council_member', 'coalition_admin']

async function resolveIsAdmin(userId: string, orgId: string): Promise<boolean> {
  if (await isPlatformAdmin(userId)) return true
  const membership = await prisma.membership.findFirst({
    where: { userId, orgId },
    select: { role: true },
  })
  return !!membership && ADMIN_ROLES.includes(membership.role)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    select: { orgId: true },
  })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [messages, quota] = await Promise.all([
    prisma.petitionLawyerMessage.findMany({
      where: { petitionId: id },
      orderBy: { createdAt: 'asc' },
    }),
    getLawyerQuota(prisma),
  ])

  // Resolve author names in a single query
  const userIds = [...new Set(messages.map(m => m.userId).filter((uid): uid is string => uid !== null))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map(u => [u.id, u]))

  const isAdmin = await resolveIsAdmin(session.user.id, petition.orgId)

  const used = messages.filter(m => m.role === 'user' && m.userId === session.user.id).length

  const result = messages.map(m => {
    let authorName: string
    if (m.role === 'assistant' || !m.userId) {
      authorName = 'Юрист ИИ'
    } else {
      const u = userMap.get(m.userId)
      authorName = u?.name ?? u?.email ?? 'Участник'
    }
    return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt, authorName }
  })

  return NextResponse.json({ messages: result, quota, used, isAdmin })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    select: {
      orgId: true,
      title: true,
      draftText: true,
      finalText: true,
      status: true,
      docYear: true,
      docSeq: true,
    },
  })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { content } = body as { content?: string }
  const trimmed = content?.trim() ?? ''
  if (!trimmed) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const isAdmin = await resolveIsAdmin(session.user.id, petition.orgId)

  if (!isAdmin) {
    const [used, quota] = await Promise.all([
      prisma.petitionLawyerMessage.count({
        where: { petitionId: id, role: 'user', userId: session.user.id },
      }),
      getLawyerQuota(prisma),
    ])
    if (used >= quota) {
      return NextResponse.json(
        { error: 'Достигнут лимит вопросов юристу ИИ для этого документа', quota },
        { status: 403 }
      )
    }
  }

  // Save user message
  const userMessage = await prisma.petitionLawyerMessage.create({
    data: { petitionId: id, userId: session.user.id, role: 'user', content: trimmed },
  })

  // Build context
  const allMessages = await prisma.petitionLawyerMessage.findMany({
    where: { petitionId: id },
    orderBy: { createdAt: 'asc' },
  })

  const docNumber = formatDocNumber(petition.docYear, petition.docSeq)
  const statusLabel = STATUS_LABEL[petition.status as PetitionStatus] ?? petition.status
  const text = petition.finalText ?? petition.draftText ?? ''

  const context = buildLawyerContext(
    { docNumber, title: petition.title, status: statusLabel, text },
    allMessages.map(m => ({ role: m.role, content: m.content }))
  )

  // Web search (federation Lineman proxy) — injects fresh results when enabled.
  let usedSearch = false
  if (webSearchEnabled()) {
    const results = await webSearch(trimmed)
    if (results) {
      usedSearch = true
      context.push({ role: 'system', content: 'Актуальные результаты веб-поиска по вопросу (используй, если релевантно, со ссылками на источники):\n' + results })
    }
  }

  let assistantContent: string
  try {
    const result = await lawyerChat(context)
    assistantContent = (usedSearch ? '🔎 ' : '') + result.content
  } catch (err) {
    const error = err instanceof Error ? err.message : 'LLM error'
    return NextResponse.json({ error }, { status: 502 })
  }

  // Save assistant message
  const assistantMessage = await prisma.petitionLawyerMessage.create({
    data: { petitionId: id, userId: null, role: 'assistant', content: assistantContent },
  })

  return NextResponse.json({ userMessage, assistantMessage })
}
