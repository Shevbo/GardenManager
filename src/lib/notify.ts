import prisma from './prisma'
import { sendEmail } from './email'
import { mergePrefs, type NotifyEvent } from './notify-labels'

export * from './notify-labels'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function absUrl(href: string): string {
  const base = process.env.NEXTAUTH_URL ?? 'https://garden.shectory.ru'
  return href.startsWith('http') ? href : base.replace(/\/$/, '') + href
}

/** Deliver one notification to one user, respecting their per-event prefs. */
async function deliver(userId: string, type: NotifyEvent, title: string, href: string, body?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, notifyPrefs: true } })
  if (!user) return
  const pref = mergePrefs(user.notifyPrefs)[type]

  if (pref.inApp) {
    await prisma.notification.create({ data: { userId, type, title, href, body: body ?? null } })
  }
  if (pref.email && user.email) {
    try {
      await sendEmail({
        to: user.email,
        subject: title,
        html: `<p>${escapeHtml(body ?? title)}</p><p><a href="${absUrl(href)}">Открыть в Garden Manager</a></p>`,
      })
    } catch { /* email is best-effort; never break the request */ }
  }
}

export async function notifyDM(toUserId: string, fromName: string, href: string, preview: string) {
  await deliver(toUserId, 'dm', `Новое сообщение от ${fromName}`, href, preview)
}

/** «Вёрстка повестки»: события по предложениям тем (автору и управляющим). */
export async function notifyAgenda(toUserId: string, title: string, body?: string) {
  await deliver(toUserId, 'agenda', title, '/assemblies', body)
}

async function orgMemberIds(orgId: string, exceptUserId?: string): Promise<string[]> {
  const rows = await prisma.membership.findMany({ where: { orgId }, select: { userId: true }, distinct: ['userId'] })
  return rows.map(r => r.userId).filter(id => id !== exceptUserId)
}

export async function notifyOrgChat(orgId: string, senderUserId: string, orgName: string, senderName: string, preview: string) {
  const ids = await orgMemberIds(orgId, senderUserId)
  await Promise.all(ids.map(id => deliver(id, 'org_chat', `Новое сообщение в чате «${orgName}»`, `/chats/${orgId}`, `${senderName}: ${preview}`)))
}

export async function notifyAssemblyStatus(orgId: string, actorUserId: string, assemblyId: string, assemblyTitle: string, statusLabel: string) {
  const ids = await orgMemberIds(orgId, actorUserId)
  await Promise.all(ids.map(id => deliver(id, 'assembly_status', `Собрание «${assemblyTitle}»: ${statusLabel}`, `/assemblies/${assemblyId}`)))
}

export async function notifyPetitionStatus(orgId: string, actorUserId: string, petitionId: string, petitionTitle: string, statusLabel: string) {
  const ids = await orgMemberIds(orgId, actorUserId)
  await Promise.all(ids.map(id => deliver(id, 'petition_status', `Заявление «${petitionTitle}»: ${statusLabel}`, `/admin/petitions`)))
}
