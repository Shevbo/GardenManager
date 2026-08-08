import prisma from './prisma'
import { getPlatformAdminUsers } from './permissions'

/**
 * Защита ИИ-юриста от prompt-injection (требование Бориса 2026-08-08):
 * 1) детектор попыток перехватить роль/выведать промпт или чужие ПДн;
 * 2) сигнал админам платформы: СМС немедленно (+ in-app + AuditLog),
 *    с кулдауном, чтобы серией попыток нельзя было устроить СМС-бомбёжку.
 * Детектор эвристический — второй эшелон; первый — правила в системном
 * промпте (lawyer.ts), которые модель обязана держать сама.
 */

const PATTERNS: Array<{ re: RegExp; label: string }> = [
  // Переопределение роли / инструкции
  { re: /ignore\s+(all\s+|the\s+)?(previous|above|prior)\s+instructions?/i, label: 'ignore-instructions' },
  { re: /disregard\s+(the\s+)?(above|previous|instructions)/i, label: 'disregard-instructions' },
  { re: /забудь\s+(все\s+|про\s+)?(инструкции|правила|указания)/i, label: 'забудь-инструкции' },
  { re: /не\s+обращай\s+внимания\s+на\s+(инструкции|правила|систем)/i, label: 'игнор-инструкций' },
  { re: /ты\s+(больше\s+не|теперь|отныне)\s+/i, label: 'смена-роли' },
  { re: /притворись|представь,?\s+что\s+ты\s+/i, label: 'смена-роли' },
  { re: /\bDAN\b|jailbreak|developer\s+mode|режим\s+разработчика/i, label: 'jailbreak' },
  { re: /(no|without)\s+restrictions|без\s+ограничений/i, label: 'снятие-ограничений' },
  // Выведывание промпта/контекста
  { re: /(system|системн[а-яё]+)\s+(prompt|промпт|инструкци\w+|сообщени\w+)/i, label: 'система-промпт' },
  { re: /(выведи|покажи|раскрой|процитируй|повтори|напечатай|print|reveal|show|repeat)\s+[^.\n]{0,40}(промпт|prompt|инструкци|instructions|настройк|правила\s+систем)/i, label: 'выведать-промпт' },
  { re: /(начальн[а-яё]+|исходн[а-яё]+|твои|ваши)\s+инструкци/i, label: 'выведать-промпт' },
  { re: /(скрыт[а-яё]+|hidden)\s+(част[а-яё]+|part|контекст|context)/i, label: 'выведать-контекст' },
  // Выведывание чужих ПДн
  { re: /(персональн[а-яё]+\s+данн[а-яё]+|пдн)\s+[^.\n]{0,40}(автор|участник|заявител|подписант|собственник|жильц|людей)/i, label: 'выведать-пдн' },
  { re: /(покажи|раскрой|выведи|назови|дай|сообщи)\s+[^.\n]{0,60}(телефон[а-яё]{0,3}|адрес[а-яё]{0,3}|контакт[а-яё]{0,3}|email|почт[а-яё]{0,2})\s+[^.\n]{0,40}(автора|участник|заявител|подписант|собственник)/i, label: 'выведать-пдн' },
  { re: /(раскрой|покажи|выведи)\s+[^.\n]{0,30}(контакты|данные)\s+(участников|жильцов|людей)/i, label: 'выведать-пдн' },
]

/** null — чисто; иначе метка сработавшего паттерна. */
export function detectPromptInjection(text: string): string | null {
  const t = text.slice(0, 4000)
  for (const { re, label } of PATTERNS) {
    if (re.test(t)) return label
  }
  return null
}

const SMS_COOLDOWN_MS = 10 * 60 * 1000
const lastSmsAt = new Map<string, number>()

/** Только для тестов. */
export function __resetPromptGuardState(): void {
  lastSmsAt.clear()
}

export async function reportInjectionAttempt(input: {
  petitionId: string
  userId: string
  pattern: string
  sample: string
  now?: number
}): Promise<void> {
  const now = input.now ?? Date.now()
  console.error(`[prompt-injection] petition=${input.petitionId} user=${input.userId} pattern=${input.pattern}`)

  try {
    const attacker = await prisma.user.findUnique({
      where: { id: input.userId }, select: { name: true, email: true },
    })
    const who = attacker?.name || attacker?.email || input.userId

    await prisma.auditLog.create({
      data: {
        actorId: input.userId,
        actorName: who,
        action: 'lawyer.injection_attempt',
        entity: 'Petition',
        entityId: input.petitionId,
        snapshot: { pattern: input.pattern, sample: input.sample.slice(0, 500) },
      },
    })

    const admins = await getPlatformAdminUsers()
    // In-app — каждый раз
    await Promise.all(admins.map(a =>
      prisma.notification.create({
        data: {
          userId: a.id,
          type: 'ext_failure',
          title: '🚨 Попытка взлома ИИ-юриста',
          body: `${who}: паттерн «${input.pattern}». Вопрос заблокирован, в ИИ не ушёл.`,
          href: `/admin/petitions/${input.petitionId}/discussion`,
        },
      }).catch(() => null)
    ))

    // СМС — немедленно, но с кулдауном на атакующего (анти-СМС-бомбёжка)
    const last = lastSmsAt.get(input.userId)
    if (last === undefined || now - last >= SMS_COOLDOWN_MS) {
      lastSmsAt.set(input.userId, now)
      const adminUsers = await prisma.user.findMany({
        where: { id: { in: admins.map(a => a.id) }, phone: { not: null }, phoneVerified: { not: null } },
        select: { phone: true },
      })
      const { sendSms } = await import('./sms')
      await Promise.all(adminUsers.map(u =>
        sendSms(u.phone!, `Garden: попытка взлома ИИ-юриста. ${who}, паттерн «${input.pattern}». Вопрос заблокирован.`).catch(() => null)
      ))
    }
  } catch (e) {
    console.error(`[prompt-injection] alert delivery failed: ${(e as Error).message}`)
  }
}
