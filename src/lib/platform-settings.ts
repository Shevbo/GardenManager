import prisma from './prisma'

/** Ключи настроек платформы (PlatformSetting key/value). */
export const SMS_SENDER_PHONE_KEY = 'sms_sender_phone'

export async function getPlatformSetting(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

/**
 * Номер SIM СМС-гейта — показывается жителям в подсказке «сохраните контакт»
 * (просьба Бориса). Источник — настройки платформы (админка «Управление»);
 * env-переменная оставлена как fallback на случай пустой настройки.
 */
export async function getSmsSenderPhone(): Promise<string | null> {
  const fromSettings = await getPlatformSetting(SMS_SENDER_PHONE_KEY)
  return fromSettings?.trim() || process.env.NEXT_PUBLIC_SMS_SENDER_PHONE?.trim() || null
}
