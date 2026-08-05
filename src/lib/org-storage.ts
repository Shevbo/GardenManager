import { promises as fs } from 'fs'
import path from 'path'

// Org photos live on disk outside the repo so they survive deploys.
// Override with GARDEN_UPLOADS_DIR; the path stored in OrgPhoto.path is relative.
function uploadsRoot(): string {
  return process.env.GARDEN_UPLOADS_DIR || '/var/www/garden-uploads'
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function extForMime(mime: string): string | null {
  return MIME_EXT[mime] ?? null
}

export function orgPhotoRelPath(orgId: string, photoId: string, ext: string): string {
  return path.posix.join('orgs', orgId, `${photoId}.${ext}`)
}

/** Write bytes for a photo; returns nothing (path is computed by the caller). */
export async function writePhoto(relPath: string, bytes: Buffer): Promise<void> {
  const abs = path.join(uploadsRoot(), relPath)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, bytes)
}

export async function readPhoto(relPath: string): Promise<Buffer> {
  // Guard against path traversal — resolve and confirm it stays under the root.
  const root = path.resolve(uploadsRoot())
  const abs = path.resolve(root, relPath)
  if (!abs.startsWith(root + path.sep)) throw new Error('Invalid path')
  return fs.readFile(abs)
}

export async function deletePhotoFile(relPath: string): Promise<void> {
  const root = path.resolve(uploadsRoot())
  const abs = path.resolve(root, relPath)
  if (!abs.startsWith(root + path.sep)) return
  try { await fs.unlink(abs) } catch { /* already gone */ }
}
