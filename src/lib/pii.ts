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
