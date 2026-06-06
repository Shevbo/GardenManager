import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const CM = 28.35
let fontCache: Buffer | null = null
function serifBytes(): Buffer {
  if (!fontCache) fontCache = readFileSync(path.join(process.cwd(), 'public/fonts/LiberationSerif-Regular.ttf'))
  return fontCache
}

/**
 * Stamps the footer on every page (post-render, pdf-lib): left = meta line
 * («2026-NNN · название · тема · дата»), right = «стр. N из M». Cyrillic-capable.
 */
export async function stampFooter(pdf: Buffer, leftText: string): Promise<Buffer> {
  const doc = await PDFDocument.load(pdf)
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(serifBytes(), { subset: true })
  const pages = doc.getPages()
  const total = pages.length
  const grey = rgb(0.6, 0.6, 0.6)
  const size = 9
  const y = 1.15 * CM
  for (let i = 0; i < total; i++) {
    const page = pages[i]
    const { width } = page.getSize()
    const right = `стр. ${i + 1} из ${total}`
    const rw = font.widthOfTextAtSize(right, size)
    const leftMaxW = width - 2 * CM - (2 * CM + rw) - 12
    let left = leftText
    while (left.length > 0 && font.widthOfTextAtSize(left, size) > leftMaxW) {
      left = left.slice(0, -2)
    }
    if (left !== leftText && left.length > 1) left = left.slice(0, -1) + '…'
    page.drawText(left, { x: 2 * CM, y, size, font, color: grey })
    page.drawText(right, { x: width - 2 * CM - rw, y, size, font, color: grey })
  }
  return Buffer.from(await doc.save())
}
