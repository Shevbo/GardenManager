import { PDFDocument, PDFRawStream, PDFArray, PDFName, PDFRef } from 'pdf-lib'
import { inflateSync } from 'node:zlib'

/**
 * Measures a rendered PDF: total page count and an approximate count of text lines
 * on the LAST page (number of text-show operators — a proxy for «строк»). Used to
 * enforce the no-thin-widow rule (≥ MIN lines on the last page).
 */
export async function measurePdf(pdf: Buffer): Promise<{ pages: number; lastPageLines: number }> {
  const doc = await PDFDocument.load(pdf)
  const ctx = doc.context
  const pages = doc.getPages()
  const last = pages[pages.length - 1]
  const contents = last.node.get(PDFName.of('Contents'))
  const resolve = (x: unknown) => (x instanceof PDFRef ? ctx.lookup(x) : x)
  const c = resolve(contents)
  const streams = c instanceof PDFArray ? c.asArray().map(resolve) : [c]
  let text = ''
  for (const s of streams) {
    if (s instanceof PDFRawStream) {
      let bytes: Uint8Array = s.contents
      try { bytes = inflateSync(Buffer.from(bytes)) } catch { /* not deflated */ }
      text += Buffer.from(bytes).toString('latin1')
    }
  }
  const lastPageLines = (text.match(/\bTJ\b/g) || []).length + (text.match(/\bTj\b/g) || []).length
  return { pages: pages.length, lastPageLines }
}
