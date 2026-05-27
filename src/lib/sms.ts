export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendSms(phone: string, message: string): Promise<void> {
  const login = process.env.SMS_API_LOGIN
  const password = process.env.SMS_API_PASSWORD

  if (!login || !password) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[sms:dev-fallback] ${phone}: ${message}`)
      return
    }
    throw new Error('SMS provider not configured (SMS_API_LOGIN/SMS_API_PASSWORD missing)')
  }

  const params = new URLSearchParams({
    login,
    psw: password,
    phones: phone,
    mes: message,
    sender: process.env.SMS_SENDER ?? 'GARDEN',
    fmt: '3',
  })

  const res = await fetch(`https://smsc.ru/sys/send.php?${params}`, {
    method: 'GET',
  })

  if (!res.ok) {
    throw new Error(`SMS provider HTTP error: ${res.status}`)
  }

  const data = await res.json() as { error?: string; error_code?: number }
  if (data.error) {
    throw new Error(`SMS send failed: ${data.error} (code: ${data.error_code})`)
  }
}
