import type { ViewerContext } from './pdf/types'

export const MASK = '*ПДн скрыты*'

export const PII_FOOTNOTE =
  'Персональные данные подписантов (ФИО, адреса, контакты) скрыты и доступны только автору ' +
  'и администратору организации в соответствии с законодательством о персональных данных ' +
  '(Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных»).'

/** Returns the value if the viewer may see it (admin, or the data subject), else the mask. */
export function maskPii(
  value: string,
  { ownerUserId, viewer }: { ownerUserId: string | null; viewer: ViewerContext },
): string {
  if (!value) return value
  if (viewer.isAdmin) return value
  if (viewer.viewerUserId && viewer.viewerUserId === ownerUserId) return value
  return MASK
}
