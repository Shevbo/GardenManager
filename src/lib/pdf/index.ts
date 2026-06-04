import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
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
    }
    element = createElement(OfficialLetter, props)
  } else if (input.layoutKey === 'police-statement') {
    element = createElement(PoliceStatement, { values: input.values })
  } else {
    element = createElement(Explanation, { values: input.values })
  }
  return renderToBuffer(element as any)
}
