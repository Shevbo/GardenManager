import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import path from 'path'
import { renderDocumentPdf, buildRegistryRows } from './pdf/index'
import type { SignatureInput } from './pdf/registry-data'
import type { ViewerContext } from './pdf/types'

export { buildRegistryRows }
export type { RegistryRow } from './pdf/types'

/**
 * Backward-compatible petition PDF. Renders via official-letter.
 * viewer defaults to admin (full PII) for server-side exports that already gate by role.
 */
export async function generatePetitionPdf(
  title: string,
  finalText: string,
  signatures: SignatureInput[],
  opts?: { recipient?: string | null; orgName?: string | null; viewer?: ViewerContext; docNumber?: string | null },
): Promise<Buffer> {
  const viewer = opts?.viewer ?? { viewerUserId: null, isAdmin: true }
  const rows = buildRegistryRows(signatures, viewer)
  return renderDocumentPdf({
    layoutKey: 'official-letter',
    values: {},
    title,
    bodyText: finalText,
    recipient: opts?.recipient ?? null,
    fromLine: opts?.orgName ?? null,
    rows,
    masked: !viewer.isAdmin,
    footerSubject: 'обращение',
    docNumber: opts?.docNumber ?? null,
  })
}

// ---------------------------------------------------------------------------
// Assembly protocol PDF (kept inline — not yet migrated to layout system)
// ---------------------------------------------------------------------------

const FONT_DIR = path.join(process.cwd(), 'public/fonts')

Font.register({
  family: 'Roboto',
  fonts: [
    { src: path.join(FONT_DIR, 'Roboto-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(FONT_DIR, 'Roboto-Bold.ttf'), fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 11, padding: 50, lineHeight: 1.5 },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, borderBottom: '1px solid #ccc', paddingBottom: 4 },
  body: { fontSize: 11, textAlign: 'justify' },
  disclaimer: { fontSize: 9, color: '#555', marginTop: 20 },
})

interface AssemblyProtocolInput {
  assembly: {
    title: string
    description: string | null
    type: string
    startsAt: Date
    endsAt: Date
    closedAt: Date | null
    quorumPercent: number
    createdByUser: { name: string | null }
    org: { name: string }
  }
  questions: Array<{
    order: number
    text: string
    requiredMajorityPct: number
    forArea: number
    againstArea: number
    abstainArea: number
    forPct: number
    passed: boolean
  }>
  quorumPct: number
  quorumReached: boolean
  totalEligibleArea: number
  totalVotedArea: number
}

function AssemblyProtocolPDF(input: AssemblyProtocolInput) {
  const { assembly, questions, quorumPct, quorumReached, totalEligibleArea, totalVotedArea } = input
  const typeLabel = assembly.type === 'online' ? 'Очное / онлайн' : 'Заочное (сбор бюллетеней)'

  return createElement(Document, {},
    createElement(Page, { size: 'A4', style: styles.page },
      createElement(Text, { style: styles.title }, 'ПРОТОКОЛ ОБЩЕГО СОБРАНИЯ СОБСТВЕННИКОВ'),

      createElement(View, { style: styles.section },
        createElement(Text, {}, `Организация: ${assembly.org.name}`),
        createElement(Text, {}, `Тема: ${assembly.title}`),
        createElement(Text, {}, `Форма проведения: ${typeLabel}`),
        createElement(Text, {}, `Дата начала: ${assembly.startsAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`),
        createElement(Text, {}, `Дата окончания: ${assembly.endsAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`),
        ...(assembly.closedAt ? [createElement(Text, {}, `Закрыто: ${assembly.closedAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`)] : []),
        createElement(Text, {}, `Инициатор: ${assembly.createdByUser.name ?? '—'}`),
      ),

      ...(assembly.description
        ? [createElement(View, { style: styles.section },
            createElement(Text, { style: styles.sectionTitle }, 'Повестка'),
            createElement(Text, { style: styles.body }, assembly.description),
          )]
        : []),

      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'Кворум'),
        createElement(Text, {}, `Требуемый кворум: ${assembly.quorumPercent}%`),
        createElement(Text, {}, `Площадь, представленная участниками: ${totalVotedArea.toFixed(2)} м² из ${totalEligibleArea.toFixed(2)} м² (${quorumPct.toFixed(1)}%)`),
        createElement(Text, { style: { fontWeight: 'bold', marginTop: 4 } },
          quorumReached ? 'Кворум достигнут.' : 'Кворум НЕ достигнут.'),
      ),

      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'Результаты голосования'),
        ...questions.map(q =>
          createElement(View, { key: q.order, style: { marginBottom: 12 } },
            createElement(Text, { style: { fontWeight: 'bold' } }, `Вопрос ${q.order + 1}. ${q.text}`),
            createElement(Text, {}, `Требуемое большинство: ${q.requiredMajorityPct}%`),
            createElement(Text, {}, `За: ${q.forArea.toFixed(2)} м² (${q.forPct.toFixed(1)}%)`),
            createElement(Text, {}, `Против: ${q.againstArea.toFixed(2)} м²`),
            createElement(Text, {}, `Воздержались: ${q.abstainArea.toFixed(2)} м²`),
            createElement(Text, { style: { fontWeight: 'bold', marginTop: 2, color: q.passed ? '#0A3D2E' : '#B91C1C' } },
              q.passed ? 'РЕШЕНИЕ ПРИНЯТО' : 'РЕШЕНИЕ НЕ ПРИНЯТО'),
          )
        ),
      ),

      createElement(Text, { style: styles.disclaimer },
        'Протокол сформирован автоматически платформой Garden Manager (garden.shectory.ru). ' +
        'Голоса учтены пропорционально площади собственности участников. ' +
        'Дата и время указаны по московскому времени.'
      ),
    )
  )
}

export async function generateAssemblyProtocolPdf(input: AssemblyProtocolInput): Promise<Buffer> {
  const element = createElement(AssemblyProtocolPDF, input)
  return renderToBuffer(element as any)
}
