import { createElement, Fragment } from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { RegistryRow } from '../types'
import { RegistrySection } from '../components/registry'

const CM = 28.35 // 1cm in pt
const s = StyleSheet.create({
  page: { fontFamily: 'LiberationSerif', fontSize: 14, padding: 2 * CM, lineHeight: 1.4, paddingBottom: 2.4 * CM },
  header: { alignItems: 'flex-end', marginBottom: 24 },
  headerBlock: { width: '52%' },
  hLabel: { fontSize: 9, color: '#666', marginBottom: 2 },
  hValue: { fontSize: 12, marginBottom: 10, lineHeight: 1.4 },
  title: { fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginVertical: 16 },
  para: { textIndent: 1.5 * CM, marginBottom: 6, textAlign: 'justify' },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  footer: { position: 'absolute', bottom: 1.2 * CM, left: 2 * CM, right: 2 * CM, fontFamily: 'LiberationSerif', fontSize: 9, color: '#999' },
})

export interface OfficialLetterProps {
  title: string
  recipient?: string | null   // адресат (должность/звание/ФИО)
  fromLine?: string | null    // от кого (организация/инициатор)
  contact?: string | null     // контакт
  bodyText: string            // already substituted; paragraphs split on \n
  date?: string | null
  rows?: RegistryRow[]        // signatory registry (collective)
  masked?: boolean
  footerSubject?: string      // for footer "№ · название · тема · дата"
  docNumber?: string | null   // 2026-NNN — shown first in the footer colophon
  hideFooter?: boolean        // suppress the fixed footer (used in package merges)
}

export function OfficialLetter(props: OfficialLetterProps) {
  const paragraphs = props.bodyText.split(/\n+/).filter(Boolean)
  const footerLeft = [props.docNumber, props.title, props.footerSubject, props.date].filter(Boolean).join(' · ')
  return createElement(Document, {},
    createElement(Page, { size: 'A4', style: s.page },
      createElement(View, { style: s.header },
        createElement(View, { style: s.headerBlock },
          props.recipient ? createElement(Fragment, {},
            createElement(Text, { style: s.hLabel }, 'Кому'),
            createElement(Text, { style: s.hValue }, props.recipient)) : null,
          props.fromLine ? createElement(Fragment, {},
            createElement(Text, { style: s.hLabel }, 'От кого'),
            createElement(Text, { style: s.hValue }, props.fromLine)) : null,
          props.contact ? createElement(Fragment, {},
            createElement(Text, { style: s.hLabel }, 'Контакт'),
            createElement(Text, { style: s.hValue }, props.contact)) : null,
        ),
      ),
      createElement(Text, { style: s.title }, props.title),
      ...paragraphs.map((p, i) => createElement(Text, { key: i, style: s.para }, p)),
      createElement(View, { style: s.signRow },
        createElement(Text, {}, props.date ? `Дата: ${props.date}` : ''),
        createElement(Text, {}, '_____________ / подпись'),
      ),
      props.rows && props.rows.length
        ? createElement(RegistrySection, { rows: props.rows, masked: !!props.masked })
        : null,
      !props.hideFooter
        ? createElement(Text, { style: s.footer, fixed: true }, footerLeft)
        : null,
    ),
  )
}
