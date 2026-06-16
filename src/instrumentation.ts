/**
 * Next.js instrumentation hook — выполняется один раз при старте Node.js-сервера,
 * до того как загружается первый route handler. Используем для подгрузки всех секретов
 * из Ключника (smain:9093) в process.env текущего процесса.
 *
 * Стандарт: `ssh smain 'cat /home/shectory/workspaces/infra/lineman/docs/AGENT_KEYMASTER_ONBOARDING.md'`.
 * Значения попадают ТОЛЬКО в RAM этого процесса — никаких .env-файлов, никакого pm2 save.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const isDev = process.env.NODE_ENV !== 'production'
  const suffix = isDev ? '_DEV' : ''

  // env-имя в приложении  →  имя секрета в Ключнике (с _DEV суффиксом в dev)
  const mapping: Record<string, string> = {
    DATABASE_URL: `GARDEN_DATABASE_URL${suffix}`,
    NEXTAUTH_SECRET: `GARDEN_NEXTAUTH_SECRET${suffix}`,
    SHECTORY_AUTH_BRIDGE_SECRET: `SHECTORY_AUTH_BRIDGE_SECRET${suffix}`,
    DEEPSEEK_API_KEY: `DEEPSEEK_API_KEY${suffix}`,
    SMS_GATEWAY_URL: 'GARDEN_SMS_GATEWAY_URL',
    SMS_GATEWAY_AUTH: 'GARDEN_SMS_GATEWAY_AUTH',
    // App reads process.env.DADATA_API_KEY (legacy name), Ключник хранит как DADATA_API_TOKEN
    DADATA_API_KEY: 'DADATA_API_TOKEN',
    SMTP_PASSWORD: 'GARDEN_SMTP_NOREPLY_PASSWORD',
  }

  // Опциональные секреты: их отсутствие деградирует отдельную фичу, но НЕ должно
  // ронять весь сервер. Потребляющий код обязан сам терпеть отсутствие значения
  // (напр. auth.ts: verifyViaBridge → `if (!secret) return null`).
  const OPTIONAL = new Set<string>([
    'SHECTORY_AUTH_BRIDGE_SECRET', // SSO-мост с shectory-portal (email/пароль вход); телефонный OTP не зависит
  ])

  const { bootstrapSecrets } = await import('./lib/keymaster')
  const { loaded, failed } = await bootstrapSecrets(mapping)

  const fatal = Object.keys(failed).filter(k => !OPTIONAL.has(k))
  const degraded = Object.keys(failed).filter(k => OPTIONAL.has(k))

  console.log(`[instrumentation] keymaster: ${loaded.length} loaded, ${Object.keys(failed).length} failed`)
  if (degraded.length > 0) {
    console.warn(`[instrumentation] keymaster: optional secrets unavailable (feature degraded): ${degraded.join(', ')}`)
  }
  if (fatal.length > 0 && !isDev) {
    // В prod падаем только при отсутствии обязательных секретов — fail-loud по стандарту.
    throw new Error(`Keymaster bootstrap failed in production: ${fatal.join(', ')}`)
  }
}
