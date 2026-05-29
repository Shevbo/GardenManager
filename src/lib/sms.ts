export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendSms(phone: string, message: string): Promise<void> {
  const apiKey = process.env.SMSC_API_TOKEN

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[sms:dev-fallback] ${phone}: ${message}`)
      return
    }
    throw new Error('SMS provider not configured (SMSC_API_TOKEN missing)')
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    phones: phone,
    mes: message,
    sender: process.env.SMS_SENDER ?? 'SMSC.RU',
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
