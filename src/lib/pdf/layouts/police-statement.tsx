import { createElement } from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { fontFamily: 'LiberationSerif', fontSize: 11, padding: 40, lineHeight: 1.4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  col: { width: '47%' },
  dutyTitle: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  dutySub: { fontSize: 9, textAlign: 'center', marginBottom: 8 },
  line: { borderBottom: '1px solid #000', marginVertical: 6, minHeight: 12 },
  smallLabel: { fontSize: 8, color: '#444' },
  addr: { fontSize: 12, marginBottom: 4 },
  warn: { fontSize: 11, marginVertical: 14 },
  title: { fontSize: 14, fontWeight: 'bold', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
  bodyLine: { borderBottom: '1px solid #000', minHeight: 16, marginBottom: 2 },
  prosba: { fontStyle: 'italic', marginBottom: 6 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
})

/** v(name) reads a fieldValues key; '' if absent. */
export interface BlankProps { values: Record<string, string> }

export function PoliceStatement({ values }: BlankProps) {
  const v = (k: string) => values[k] ?? ''
  return createElement(Document, {},
    createElement(Page, { size: 'A4', style: s.page },
      createElement(View, { style: s.top },
        createElement(View, { style: s.col },
          createElement(Text, { style: s.dutyTitle }, 'ДЕЖУРНАЯ ЧАСТЬ'),
          createElement(Text, { style: s.dutySub }, 'Зарегистрировать в КУСП'),
          createElement(View, { style: s.line }),
          createElement(Text, { style: s.smallLabel }, 'В срок до ________ провести проверку в порядке ст. ст. 144-145 УПК РФ.'),
          createElement(View, { style: s.line }),
          createElement(Text, { style: s.smallLabel }, '(дата, подпись)'),
          createElement(View, { style: s.line }),
          createElement(Text, { style: s.smallLabel }, 'Вх. № ________ от ________'),
        ),
        createElement(View, { style: s.col },
          createElement(Text, { style: s.addr }, v('addressee_org') || 'Начальнику ОМВД России'),
          createElement(Text, { style: s.addr }, [v('addressee_rank'), v('addressee_name')].filter(Boolean).join(' ')),
          createElement(Text, { style: s.smallLabel }, 'Ф.И.О.:'),
          createElement(Text, { style: s.addr }, v('applicant_name')),
          createElement(Text, { style: s.smallLabel }, 'Дата рождения:'),
          createElement(Text, { style: s.addr }, v('applicant_birthdate')),
          createElement(Text, { style: s.smallLabel }, 'прож.:'),
          createElement(Text, { style: s.addr }, v('applicant_address')),
          createElement(Text, { style: s.smallLabel }, 'Контактный телефон:'),
          createElement(Text, { style: s.addr }, v('applicant_phone')),
          createElement(Text, { style: s.smallLabel }, 'Адрес эл. почты:'),
          createElement(Text, { style: s.addr }, v('applicant_email')),
        ),
      ),
      createElement(Text, { style: s.warn },
        'Об уголовной ответственности за преступление, предусмотренное ст. 306 УК РФ (заведомо ложный донос) предупреждён(а). ✓'),
      createElement(Text, { style: s.title }, 'ЗАЯВЛЕНИЕ'),
      createElement(Text, { style: s.prosba }, 'Прошу Вас:'),
      ...v('statement_body').split(/\n+/).filter(Boolean).map((p, i) =>
        createElement(Text, { key: i, style: { marginBottom: 4 } }, p)),
      createElement(Text, { style: { marginTop: 10, fontStyle: 'italic' } }, 'Написано собственноручно, дополнений нет.'),
      createElement(View, { style: s.footRow },
        createElement(Text, {}, v('sign_date')),
        createElement(Text, {}, `${v('applicant_name')}  / подпись`),
      ),
    ),
  )
}
