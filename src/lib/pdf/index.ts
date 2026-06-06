import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { registerPdfFonts } from './fonts'
import { OfficialLetter, type OfficialLetterProps } from './layouts/official-letter'
import { PoliceStatement } from './layouts/police-statement'
import { Explanation } from './layouts/explanation'
import type { LayoutKey, RegistryRow } from './types'

export { buildRegistryRows } from './registry-data'
export type { RegistryRow } from './types'

export interface RenderInput {
  layoutKey: LayoutKey
  values: Record<string, string>
  title?: string
  recipient?: string | null
  fromLine?: string | null
  contact?: string | null
  bodyText?: string
  date?: string | null
  rows?: RegistryRow[]
  masked?: boolean
  footerSubject?: string
  docNumber?: string | null
  hideFooter?: boolean
  fontSize?: number
  paraGap?: number
}

export async function renderPackagePdf(parts: RenderInput[]): Promise<Buffer> {
  const buffers: Buffer[] = []
  for (const p of parts) buffers.push(await renderDocumentPdf(p))
  const merged = await PDFDocument.create()
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf)
    const pages = await merged.copyPages(src, src.getPageIndices())
    pages.forEach(pg => merged.addPage(pg))
  }
  const font = await merged.embedFont(StandardFonts.Helvetica)
  const total = merged.getPageCount()
  merged.getPages().forEach((pg, i) => {
    const label = `${i + 1} / ${total}`
    const size = 9
    const w = font.widthOfTextAtSize(label, size)
    pg.drawText(label, { x: (pg.getWidth() - w) / 2, y: 18, size, font, color: rgb(0.6, 0.6, 0.6) })
  })
  const out = await merged.save()
  return Buffer.from(out)
}

export async function renderDocumentPdf(input: RenderInput): Promise<Buffer> {
  registerPdfFonts()
  let element
  if (input.layoutKey === 'official-letter') {
    const props: OfficialLetterProps = {
      title: input.title ?? '',
      recipient: input.recipient,
      fromLine: input.fromLine,
      contact: input.contact,
      bodyText: input.bodyText ?? '',
      date: input.date,
      rows: input.rows,
      masked: input.masked,
      footerSubject: input.footerSubject,
      docNumber: input.docNumber,
      hideFooter: input.hideFooter,
      fontSize: input.fontSize,
      paraGap: input.paraGap,
    }
    element = createElement(OfficialLetter, props)
  } else if (input.layoutKey === 'police-statement') {
    element = createElement(PoliceStatement, { values: input.values })
  } else {
    element = createElement(Explanation, { values: input.values })
  }
  return renderToBuffer(element as any)
}
