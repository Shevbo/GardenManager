import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUploadUrl, buildKey } from '@/lib/storage'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { filename, contentType, petitionId, orgId, size } =
    body as {
      filename?: string
      contentType?: string
      petitionId?: string
      orgId?: string
      size?: number
    }

  if (!filename || !contentType || !petitionId || !orgId) {
    return NextResponse.json(
      { error: 'filename, contentType, petitionId, orgId required' },
      { status: 400 }
    )
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: 'Тип файла не разрешён' },
      { status: 400 }
    )
  }

  if (size && size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Файл слишком большой (максимум 10 МБ)' },
      { status: 400 }
    )
  }

  const key = buildKey(orgId, petitionId, filename)
  const uploadUrl = await getUploadUrl(key, contentType)

  return NextResponse.json({ uploadUrl, key })
}
