import { createElement } from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { BlankProps } from './police-statement'

const s = StyleSheet.create({
  page: { fontFamily: 'LiberationSerif', fontSize: 11, padding: 40, lineHeight: 1.45 },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  city: { fontSize: 11, marginBottom: 12 },
  taker: { fontSize: 11, fontWeight: 'bold', marginBottom: 10 },
  field: { fontSize: 11, marginBottom: 6 },
  rights: { fontSize: 9, marginVertical: 12, lineHeight: 1.4, color: '#222' },
  q: { fontSize: 11, fontWeight: 'bold', marginVertical: 10 },
  confirm: { fontSize: 11, marginTop: 20 },
})

export function Explanation({ values }: BlankProps) {
  const v = (k: string) => values[k] ?? ''
  return createElement(Document, {},
    createElement(Page, { size: 'A4', style: s.page },
      createElement(Text, { style: s.title }, 'ОБЪЯСНЕНИЕ'),
      createElement(Text, { style: s.city }, v('city') || 'г. _______________'),
      createElement(Text, { style: s.taker }, v('taker_line') || 'принял объяснение от:'),
      createElement(Text, { style: s.field }, `ФИО: ${v('applicant_name')}`),
      createElement(Text, { style: s.field }, `Дата рождения: ${v('applicant_birthdate')}`),
      createElement(Text, { style: s.field }, `Место регистрации: ${v('applicant_address')}`),
      createElement(Text, { style: s.field }, `Место работы: ${v('workplace')}`),
      createElement(Text, { style: s.field }, `Телефон: ${v('applicant_phone')}`),
      createElement(Text, { style: s.rights },
        'В соответствии со ст. 51 Конституции РФ имею право отказаться свидетельствовать против самого себя, ' +
        'своего супруга (своей супруги) и других близких родственников. В соответствии с ч. 1 ст. 144 УПК РФ ' +
        'мне разъяснено, что полученные сведения могут быть использованы в качестве доказательств.'),
      createElement(Text, { style: s.q }, 'По существу заданных мне вопросов могу пояснить следующее:'),
      ...v('explanation_body').split(/\n+/).filter(Boolean).map((p, i) =>
        createElement(Text, { key: i, style: { marginBottom: 4 } }, p)),
      createElement(Text, { style: s.confirm }, 'С моих слов записано верно, мной прочитано: _______________'),
    ),
  )
}
