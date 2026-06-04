import { createElement } from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { RegistryRow } from '../types'
import { PEP_PLAQUE } from '../legal'
import { PII_FOOTNOTE } from '../../pii'

const s = StyleSheet.create({
  section: { marginTop: 18 },
  title: { fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  table: { flexDirection: 'column', borderTop: '1px solid #999', borderLeft: '1px solid #999' },
  row: { flexDirection: 'row' },
  cell: { borderRight: '1px solid #999', borderBottom: '1px solid #999', padding: 4, fontSize: 9 },
  num: { width: '6%' }, name: { width: '28%' }, apt: { width: '10%' },
  org: { width: '24%' }, date: { width: '20%' }, ver: { width: '12%' },
  header: { backgroundColor: '#EEE', fontWeight: 'bold' },
  plaque: { marginTop: 12, padding: 8, border: '1px solid #B8860B', backgroundColor: '#FCF6E3', fontSize: 8.5, lineHeight: 1.4, color: '#5A4A1A' },
  footnote: { marginTop: 8, fontSize: 7.5, color: '#777', lineHeight: 1.35 },
})

export function RegistrySection({ rows, masked }: { rows: RegistryRow[]; masked: boolean }) {
  return createElement(View, { style: s.section },
    createElement(Text, { style: s.title }, `Приложение. Реестр подписантов (${rows.length})`),
    createElement(View, { style: s.table },
      createElement(View, { style: [s.row, s.header] },
        createElement(Text, { style: [s.cell, s.num] }, '№'),
        createElement(Text, { style: [s.cell, s.name] }, 'ФИО'),
        createElement(Text, { style: [s.cell, s.apt] }, 'Кв.'),
        createElement(Text, { style: [s.cell, s.org] }, 'ЖК / Дом'),
        createElement(Text, { style: [s.cell, s.date] }, 'Дата подписания'),
        createElement(Text, { style: [s.cell, s.ver] }, 'Верификация'),
      ),
      ...rows.map(r => createElement(View, { key: r.num, style: s.row },
        createElement(Text, { style: [s.cell, s.num] }, String(r.num)),
        createElement(Text, { style: [s.cell, s.name] }, r.name),
        createElement(Text, { style: [s.cell, s.apt] }, r.apartment),
        createElement(Text, { style: [s.cell, s.org] }, r.org),
        createElement(Text, { style: [s.cell, s.date] }, r.signedAt),
        createElement(Text, { style: [s.cell, s.ver] }, r.verifiedVia),
      )),
    ),
    createElement(Text, { style: s.plaque }, PEP_PLAQUE),
    masked ? createElement(Text, { style: s.footnote }, PII_FOOTNOTE) : null,
  )
}
