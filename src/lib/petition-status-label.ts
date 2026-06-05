import type { PetitionStatus } from './petition-status'

/** Human-readable Russian labels for petition statuses (shown in the document header). */
export const STATUS_LABEL: Record<PetitionStatus, string> = {
  DRAFT: 'Черновик',
  DISCUSSION: 'Обсуждение',
  AI_REVISION: 'AI-ревизия',
  SIGNING: 'Подписание',
  CLOSED: 'Закрыт',
  EXPORTED: 'Выгружен',
}
