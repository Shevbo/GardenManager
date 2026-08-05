import type { OrgGovRole } from '@prisma/client'

// Pure constants/labels — NO prisma import, safe to use from client components.
export type { OrgGovRole }

/** Governance positions, in display order. Platform-admin is separate (derived from email). */
export const GOV_ROLES: OrgGovRole[] = ['chairman', 'vice_chairman', 'secretary', 'org_admin', 'accountant']

export const GOV_ROLE_LABELS: Record<OrgGovRole, string> = {
  chairman: 'Председатель',
  vice_chairman: 'Заместитель председателя',
  secretary: 'Секретарь',
  org_admin: 'Администратор',
  accountant: 'Бухгалтер',
}

export const GOV_ROLE_HINTS: Record<OrgGovRole, string> = {
  chairman: 'Утверждает формальные действия организации',
  vice_chairman: 'Замещает председателя',
  secretary: 'Верстает материалы, выполняет действие после утверждения',
  org_admin: 'Помогает участникам с работой на платформе',
  accountant: 'Финансовые вопросы (в разработке)',
}

export type RoleHolder = { role: OrgGovRole; userId: string; userName: string | null }
