// Pure notification-preference types/labels — NO prisma, safe for client use.

export const NOTIFY_EVENTS = ['dm', 'org_chat', 'petition_status', 'assembly_status', 'agenda'] as const
export type NotifyEvent = (typeof NOTIFY_EVENTS)[number]

export const NOTIFY_EVENT_LABELS: Record<NotifyEvent, string> = {
  dm: 'Личные сообщения',
  org_chat: 'Сообщения в чате организации',
  petition_status: 'Статусы заявлений',
  assembly_status: 'Статусы собраний',
  agenda: 'Повестка собраний (предложения тем)',
}

export type ChannelPref = { inApp: boolean; email: boolean }
export type NotifyPrefs = Record<NotifyEvent, ChannelPref>

export const DEFAULT_PREFS: NotifyPrefs = {
  dm: { inApp: true, email: false },
  org_chat: { inApp: true, email: false },
  petition_status: { inApp: true, email: true },
  assembly_status: { inApp: true, email: true },
  agenda: { inApp: true, email: false },
}

/** Merge stored JSON prefs onto defaults (tolerant of partial/absent data). */
export function mergePrefs(raw: unknown): NotifyPrefs {
  const p = (raw && typeof raw === 'object') ? (raw as Record<string, Partial<ChannelPref>>) : {}
  const out = {} as NotifyPrefs
  for (const e of NOTIFY_EVENTS) {
    out[e] = {
      inApp: p[e]?.inApp ?? DEFAULT_PREFS[e].inApp,
      email: p[e]?.email ?? DEFAULT_PREFS[e].email,
    }
  }
  return out
}
