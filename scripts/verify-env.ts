const REQUIRED = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'SHECTORY_AUTH_BRIDGE_SECRET',
]

const RECOMMENDED = [
  'DADATA_API_KEY',
  'SMS_API_LOGIN',
  'SMS_API_PASSWORD',
  'EMAIL_FROM',
  'RESEND_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_ADMIN_CHAT_ID',
  'PLATFORM_ADMIN_EMAIL',
]

const OPTIONAL = [
  'DEEPSEEK_API_KEY',
  'S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY',
  'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET',
  'AUTH_YANDEX_ID', 'AUTH_YANDEX_SECRET',
  'AUTH_VK_ID', 'AUTH_VK_SECRET',
]

let exitCode = 0

function check(name: string, level: 'required' | 'recommended' | 'optional') {
  const v = process.env[name]
  const present = !!v && v.trim().length > 0
  const symbol = present ? '✓' : (level === 'required' ? '✗' : '○')
  const color = present ? '\x1b[32m' : (level === 'required' ? '\x1b[31m' : '\x1b[33m')
  console.log(`  ${color}${symbol}\x1b[0m ${name}`)
  if (!present && level === 'required') exitCode = 1
}

console.log('\nGarden Manager — env verification\n')
console.log('REQUIRED:')
REQUIRED.forEach(n => check(n, 'required'))
console.log('\nRECOMMENDED (graceful fallback if missing):')
RECOMMENDED.forEach(n => check(n, 'recommended'))
console.log('\nOPTIONAL:')
OPTIONAL.forEach(n => check(n, 'optional'))
console.log('')

if (exitCode === 0) {
  console.log('\x1b[32mAll required env vars present.\x1b[0m\n')
} else {
  console.log('\x1b[31mMissing required env vars — app will fail to start.\x1b[0m\n')
}
process.exit(exitCode)
