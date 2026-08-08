import type { ViewerContext } from './pdf/types'

export const MASK = '*ПДн скрыты*'

export const PII_FOOTNOTE =
  'Персональные данные подписантов (адреса, контакты) скрыты и доступны только автору ' +
  'обращения в соответствии с законодательством о персональных данных ' +
  '(Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных»). ' +
  'Полный документ выгружает и направляет адресату автор.'

/** Returns the value if the viewer may see it (author, or the data subject), else the mask. */
export function maskPii(
  value: string,
  { ownerUserId, viewer }: { ownerUserId: string | null; viewer: ViewerContext },
): string {
  if (!value) return value
  if (viewer.canSeePii) return value
  if (viewer.viewerUserId && viewer.viewerUserId === ownerUserId) return value
  return MASK
}

/**
 * The document header «От кого» (senderLine) carries the author's own personal
 * data — name, home address (incl. apartment), phone, e-mail. Only the author
 * may see it in full; for everyone else keep the leading name + representative
 * role and drop the contact block (ФИО stays visible, per the privacy rule).
 */
export function maskSenderLine(senderLine: string | null | undefined, canSeePii: boolean): string | null {
  if (!senderLine) return senderLine ?? null
  if (canSeePii) return senderLine
  const marker = senderLine.search(/(проживающ|по адресу|адрес\s*[:.]|тел\.?\s*[:.]|телефон|e-?mail|@|\bг\.\s|ул\.|д\.\s*\d|кв\.\s*\d)/i)
  let head = marker > 0 ? senderLine.slice(0, marker) : senderLine
  head = head.replace(/[\s,;.]+$/g, '').trim()
  // Safety net: if any digits survived (a leaked house/phone), keep just the first line.
  if (/\d/.test(head)) head = senderLine.split('\n')[0].replace(/[\s,;.]+$/g, '').trim()
  return head || 'От имени группы заявителей'
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE_RE = /(?:\+7|\b8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/g

/**
 * ПДн-токены из шапки «От кого»: строки с адресом/телефоном/email автора —
 * всё, что maskSenderLine отрезает от полной шапки для не-авторов.
 */
export function piiTokensFromSenderLine(senderLine: string | null | undefined): string[] {
  if (!senderLine) return []
  const head = maskSenderLine(senderLine, false) ?? ''
  const lines = senderLine
    .split('\n')
    .map(l => l.replace(/[\s,;.]+$/g, '').trim())
    .filter(l => l.length >= 5 && !head.includes(l))
  // Плюс фрагменты строк (по запятым): адрес в чате часто переформулирован
  // («ул. Летчиков, зд. 10» вместо полной строки шапки) — ловим кусками.
  const chunks = lines
    .flatMap(l => l.split(','))
    .map(c => c.replace(/[\s,;.]+$/g, '').trim())
    .filter(c => c.length >= 5)
  return [...new Set([...lines, ...chunks])]
}

/**
 * Маскирует ПДн в свободном тексте (история чата с юристом ИИ и т.п.) для
 * читателя без права на ПДн: email-адреса, телефоны РФ и известные строки
 * из шапки автора (адрес, представительство) → MASK.
 */
export function maskFreeTextPii(text: string, extraTokens: string[] = []): string {
  if (!text) return text
  let out = text.replace(EMAIL_RE, MASK).replace(PHONE_RE, MASK)
  for (const token of extraTokens) {
    if (token.length < 5) continue
    let idx = out.toLowerCase().indexOf(token.toLowerCase())
    while (idx !== -1) {
      out = out.slice(0, idx) + MASK + out.slice(idx + token.length)
      idx = out.toLowerCase().indexOf(token.toLowerCase(), idx + MASK.length)
    }
  }
  return out
}
