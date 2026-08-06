import prisma from './prisma'
import { getPlatformAdminUsers } from './permissions'

/**
 * Сигнализация о сбоях ВНЕШНИХ служб (SMTP, SMS-гейт, DaData, DeepSeek…).
 *
 * Контракт: любой интеграционный сбой (а) структурно логируется в pm2-лог —
 * его видят Клод и infra-guard по строке `[ext-fail]`; (б) платформенным
 * админам падает in-app уведомление в колокольчик (best-effort, с кулдауном,
 * чтобы шторм ошибок не превратился в шторм уведомлений).
 *
 * НИКОГДА не шлёт email (сбой почты не должен пытаться чиниться почтой)
 * и никогда не бросает — сигнализация не имеет права ломать основной запрос.
 */

export type ExtService = 'smtp' | 'sms' | 'dadata' | 'deepseek' | (string & {})

const COOLDOWN_MS = 30 * 60 * 1000
const lastAlertAt = new Map<string, number>()

/** Только для тестов. */
export function __resetExtAlertState(): void {
  lastAlertAt.clear()
}

export async function reportExtFailure(service: ExtService, error: unknown, now: number = Date.now()): Promise<void> {
  const msg = error instanceof Error ? error.message : String(error)
  // Строка для pm2-логов/infra-guard — единый грепабельный формат.
  console.error(`[ext-fail] service=${service} msg=${msg.slice(0, 300)}`)

  const last = lastAlertAt.get(service)
  if (last !== undefined && now - last < COOLDOWN_MS) return
  lastAlertAt.set(service, now)

  try {
    const admins = await getPlatformAdminUsers()
    await Promise.all(admins.map(a =>
      prisma.notification.create({
        data: {
          userId: a.id,
          type: 'ext_failure',
          title: `⚠ Сбой внешней службы: ${service}`,
          body: msg.slice(0, 500),
          href: '/admin/platform',
        },
      })
    ))
  } catch (e) {
    // Не удалось донести — хотя бы в лог; наружу не бросаем.
    console.error(`[ext-fail] alert delivery failed: ${(e as Error).message}`)
  }
}
