import { createElement } from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import { createHash } from 'node:crypto'

// Garden-styled "ПЭП" designer plaque — a branded footer badge shown on every
// significant document (collective letter, assembly protocol). Inspired by the
// OkiDoki e-signature card, restyled in the platform palette; sans-serif
// (Roboto) at a small size to contrast the serif body.

const FOREST = '#0A3D2E'
const AMBER = '#E8A020'
const CREAM = '#F7F5F0'
const CREAM_DARK = '#D6D0C4'
const INK_MID = '#3D3D38'
const INK_SOFT = '#6B6B63'

const s = StyleSheet.create({
  box: { marginTop: 16, border: `1px solid ${FOREST}`, borderRadius: 9, backgroundColor: CREAM, paddingVertical: 11, paddingHorizontal: 14 },
  brandRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 7 },
  mark: { width: 12, height: 12, borderRadius: 3, backgroundColor: AMBER, marginRight: 6 },
  brand: { fontFamily: 'Roboto', fontSize: 11.5, fontWeight: 'bold', color: FOREST, letterSpacing: 0.4 },
  statement: { fontFamily: 'Roboto', fontSize: 8.5, color: INK_MID, lineHeight: 1.5, textAlign: 'center', marginBottom: 9 },
  divider: { borderTop: `0.5px solid ${CREAM_DARK}`, marginBottom: 7 },
  id: { fontFamily: 'Roboto', fontSize: 9, fontWeight: 'bold', color: FOREST, textAlign: 'center', marginBottom: 3 },
  meta: { fontFamily: 'Roboto', fontSize: 7.5, color: INK_SOFT, textAlign: 'center' },
})

/** Stable OkiDoki-style hex identifier derived from the document's key. */
export function documentIdentifier(seed: string): string {
  return createHash('sha256').update(seed).digest('hex').slice(0, 24)
}

type Kind = 'letter' | 'protocol'

const STATEMENT: Record<Kind, (n: number) => string> = {
  letter: n =>
    `Документ подписан на платформе «Garden Manager» с использованием подтверждённых номеров телефонов ` +
    `подписантов в качестве простой электронной подписи (ПЭП) — вводом кода из СМС. Такая подпись ` +
    `равнозначна собственноручной (ч. 2 ст. 5, ст. 9 Федерального закона № 63-ФЗ). ` +
    `Подписантов в реестре: ${n}.`,
  protocol: n =>
    `Протокол общего собрания собственников сформирован и подписан на платформе «Garden Manager». ` +
    `Участники подтвердили участие и голосование простой электронной подписью (ПЭП) — вводом кода из ` +
    `СМС на подтверждённые номера телефонов. Подписей участников в реестре: ${n}.`,
}

export interface SignaturePlaqueProps {
  kind: Kind
  seed: string // stable document key (docNumber / assembly id) → identifier
  count: number // signatories in the registry
  date: string // formatted issue date
}

export function SignaturePlaque({ kind, seed, count, date }: SignaturePlaqueProps) {
  return createElement(View, { style: s.box, wrap: false },
    createElement(View, { style: s.brandRow },
      createElement(View, { style: s.mark }),
      createElement(Text, { style: s.brand }, 'Garden Manager'),
    ),
    createElement(Text, { style: s.statement }, STATEMENT[kind](count)),
    createElement(View, { style: s.divider }),
    createElement(Text, { style: s.id }, `Идентификатор документа: ${documentIdentifier(seed)}`),
    createElement(Text, { style: s.meta }, `Простая электронная подпись (ПЭП) · сформирован ${date}`),
  )
}
