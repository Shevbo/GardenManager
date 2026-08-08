import bcrypt from 'bcryptjs'
import prisma from './prisma'

/**
 * Локальные пароли garden-аккаунтов (решение Бориса 2026-08-08: пароль
 * придумывается при регистрации вместе с кодом). Хранение — bcrypt cost 12
 * в User.password; вход по паролю: сначала локальная проверка, затем
 * fallback на мост shectory-portal (auth.ts). Вход по email-коду остаётся.
 */

export const PASSWORD_MIN_LENGTH = 8

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`
  }
  if (password.length > 200) return 'Пароль слишком длинный'
  return null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/** true — email существует и пароль совпал с локальным хэшом. */
export async function verifyLocalPassword(email: string, password: string): Promise<{ id: string; email: string | null; name: string | null } | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, password: true },
  })
  if (!user?.password) return null
  const ok = await bcrypt.compare(password, user.password)
  return ok ? { id: user.id, email: user.email, name: user.name } : null
}
