import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Roboto',
  src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
})

const styles = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 11, padding: 50, lineHeight: 1.5 },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, borderBottom: '1px solid #ccc', paddingBottom: 4 },
  body: { fontSize: 11, textAlign: 'justify' },
  table: { flexDirection: 'column', borderTop: '1px solid #ccc', borderLeft: '1px solid #ccc' },
  row: { flexDirection: 'row' },
  cell: { borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', padding: 4, fontSize: 9 },
  cellNum: { width: '5%' },
  cellName: { width: '25%' },
  cellApt: { width: '10%' },
  cellOrg: { width: '25%' },
  cellDate: { width: '20%' },
  cellVerif: { width: '15%' },
  header: { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
  disclaimer: { fontSize: 9, color: '#555', marginTop: 20 },
})

export interface RegistryRow {
  num: number
  name: string
  apartment: string
  org: string
  signedAt: string
  verifiedVia: string
}

type SignatureInput = {
  id: string
  petitionId: string
  userId: string
  verifiedVia: string
  legalConsent: boolean
  signedAt: Date
  user: { name?: string | null; email?: string | null; phone?: string | null }
  membership?: { apartment?: { number: string } | null; org?: { name: string } | null } | null
}

export function buildRegistryRows(signatures: SignatureInput[]): RegistryRow[] {
  return signatures.map((s, i) => ({
    num: i + 1,
    name: s.user.name ?? s.user.email ?? s.user.phone ?? 'Аноним',
    apartment: s.membership?.apartment?.number ?? '—',
    org: s.membership?.org?.name ?? '—',
    signedAt: s.signedAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
    verifiedVia: s.verifiedVia === 'sms' ? 'SMS' : s.verifiedVia === 'email' ? 'Email' : s.verifiedVia.toUpperCase(),
  }))
}

function PetitionPDF({ title, finalText, rows }: { title: string; finalText: string; rows: RegistryRow[] }) {
  return createElement(Document, {},
    createElement(Page, { size: 'A4', style: styles.page },
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.title }, title),
        createElement(Text, { style: styles.body }, finalText),
      ),
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'Реестр подписей'),
        createElement(View, { style: styles.table },
          createElement(View, { style: [styles.row, styles.header] },
            createElement(Text, { style: [styles.cell, styles.cellNum] }, '№'),
            createElement(Text, { style: [styles.cell, styles.cellName] }, 'ФИО'),
            createElement(Text, { style: [styles.cell, styles.cellApt] }, 'Кв.'),
            createElement(Text, { style: [styles.cell, styles.cellOrg] }, 'ЖК / Дом'),
            createElement(Text, { style: [styles.cell, styles.cellDate] }, 'Дата подписания'),
            createElement(Text, { style: [styles.cell, styles.cellVerif] }, 'Верификация'),
          ),
          ...rows.map(r =>
            createElement(View, { key: r.num, style: styles.row },
              createElement(Text, { style: [styles.cell, styles.cellNum] }, String(r.num)),
              createElement(Text, { style: [styles.cell, styles.cellName] }, r.name),
              createElement(Text, { style: [styles.cell, styles.cellApt] }, r.apartment),
              createElement(Text, { style: [styles.cell, styles.cellOrg] }, r.org),
              createElement(Text, { style: [styles.cell, styles.cellDate] }, r.signedAt),
              createElement(Text, { style: [styles.cell, styles.cellVerif] }, r.verifiedVia),
            )
          ),
        ),
        createElement(Text, { style: styles.disclaimer },
          `Подписи собраны через платформу Garden Manager (garden.shectory.ru). ` +
          `Каждый подписант подтвердил своё согласие через верифицированный канал связи (SMS или email). ` +
          `Дата и время фиксации подписи указаны по московскому времени.`
        ),
      ),
    )
  )
}

export async function generatePetitionPdf(
  title: string,
  finalText: string,
  signatures: SignatureInput[]
): Promise<Buffer> {
  const rows = buildRegistryRows(signatures)
  const element = createElement(PetitionPDF, { title, finalText, rows })
  return renderToBuffer(element as any)
}
