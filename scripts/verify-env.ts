/**
 * Проверка env после bootstrap из Ключника.
 *
 * Запуск этого скрипта НЕ запускает instrumentation.ts автоматически (это hook Next.js).
 * Поэтому когда вы запускаете `npm run verify:env`, секреты ещё не подгружены — и это норм:
 * скрипт скажет, что они отсутствуют. Это нормально вне `next dev` / `next start`.
 *
 * Внутри Next.js (после bootstrap) process.env содержит все нужные секреты в RAM.
 */

const KEYMASTER_LOADED = [
  // подгружаются instrumentation.ts из Ключника при старте сервера
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'SHECTORY_AUTH_BRIDGE_SECRET',
  'DEEPSEEK_API_KEY',
  'SMS_GATEWAY_URL',
  'SMS_GATEWAY_AUTH',
]

const NON_SECRET_REQUIRED = [
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'AUTH_TRUST_HOST',
]

const NON_SECRET_OPTIONAL = [
  'SMS_SENDER',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'DEEPSEEK_BASE_URL',
  'SHECTORY_PORTAL_URL',
  'TELEGRAM_ADMIN_CHAT_ID',
  'PLATFORM_ADMIN_EMAIL',
  'KEYMASTER_URL',
  'KEYMASTER_REQUESTER',
]

const KEYMASTER_OPTIONAL = [
  // эти секреты опциональны — если в маппинге instrumentation.ts их нет, app gracefully degrades
  'DADATA_API_KEY',
  'UNISENDER_API_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY',
  'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET',
  'AUTH_YANDEX_ID', 'AUTH_YANDEX_SECRET',
  'AUTH_VK_ID', 'AUTH_VK_SECRET',
]

let missingRequired = 0
let missingKeymaster = 0

function check(name: string, level: 'required' | 'keymaster-required' | 'optional' | 'keymaster-optional') {
  const v = process.env[name]
  const present = !!v && v.trim().length > 0
  let symbol = '○'
  let color = '\x1b[33m'
  if (present) { symbol = '✓'; color = '\x1b[32m' }
  else if (level === 'required') { symbol = '✗'; color = '\x1b[31m'; missingRequired++ }
  else if (level === 'keymaster-required') { symbol = '⊘'; color = '\x1b[34m'; missingKeymaster++ }
  console.log(`  ${color}${symbol}\x1b[0m ${name}`)
}

console.log('\nGarden Manager — env verification\n')
console.log('NON-SECRET REQUIRED (must be in .env files):')
NON_SECRET_REQUIRED.forEach(n => check(n, 'required'))

console.log('\nKEYMASTER-LOADED (populated by src/instrumentation.ts at server start):')
console.log('  ⊘ = expected absent outside `next dev/start` runtime')
KEYMASTER_LOADED.forEach(n => check(n, 'keymaster-required'))

console.log('\nNON-SECRET OPTIONAL:')
NON_SECRET_OPTIONAL.forEach(n => check(n, 'optional'))

console.log('\nKEYMASTER-OPTIONAL (extend instrumentation.ts mapping if needed):')
KEYMASTER_OPTIONAL.forEach(n => check(n, 'keymaster-optional'))

console.log('')
if (missingRequired === 0) {
  console.log('\x1b[32mAll required non-secrets present.\x1b[0m')
} else {
  console.log(`\x1b[31m${missingRequired} required non-secrets MISSING — app will fail.\x1b[0m`)
}
if (missingKeymaster > 0) {
  console.log(`\x1b[34m${missingKeymaster} keymaster-loaded values absent — normal outside next runtime. Inside next dev/start they will be populated.\x1b[0m`)
}
console.log('')
process.exit(missingRequired > 0 ? 1 : 0)
