import { sendEmail } from './email'

const TELEGRAM_API = 'https://api.telegram.org/bot'

export async function sendTelegramAdmin(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !chatId) {
    console.warn('[telegram:dev-fallback]', text)
    return
  }
  try {
    await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
  } catch (e) {
    console.warn('[telegram] send failed:', (e as Error).message)
  }
}

type AdminNewRegistrationInput = {
  requestedAddress: string
  userName: string | null
  userEmail: string | null
  registrationId: string
  apartmentNumber?: string | null
  areaSqm?: number | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function notifyAdminNewRegistration(input: AdminNewRegistrationInput): Promise<void> {
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? ''
  const url = appUrl ? `${appUrl}/admin/platform/registrations` : '/admin/platform/registrations'

  const userLine = [
    input.userName,
    input.userEmail ? `(${input.userEmail})` : '',
  ].filter(Boolean).join(' ')

  const aptLine = input.apartmentNumber ? `, кв. ${input.apartmentNumber}` : ''
  const areaLine = input.areaSqm ? ` · ${input.areaSqm} м²` : ''

  const tgText = `🏢 <b>Новая заявка на регистрацию</b>\n\n` +
    `Адрес: ${escapeHtml(input.requestedAddress)}${escapeHtml(aptLine)}\n` +
    `Заявитель: ${escapeHtml(userLine)}${escapeHtml(areaLine)}\n\n` +
    `<a href="${escapeHtml(url)}">Открыть очередь →</a>`

  await sendTelegramAdmin(tgText)

  if (adminEmail) {
    try {
      await sendEmail({
        to: adminEmail,
        subject: `Garden: новая заявка на регистрацию — ${input.requestedAddress}`,
        html: `<p>Поступила новая заявка на регистрацию:</p>
          <ul>
            <li><b>Адрес:</b> ${escapeHtml(input.requestedAddress)}${escapeHtml(aptLine)}</li>
            <li><b>Заявитель:</b> ${escapeHtml(userLine)}${escapeHtml(areaLine)}</li>
          </ul>
          <p><a href="${escapeHtml(url)}">Открыть очередь</a></p>`,
        text: `Новая заявка на регистрацию.\nАдрес: ${input.requestedAddress}${aptLine}\nЗаявитель: ${userLine}${areaLine}\n${url}`,
      })
    } catch (e) {
      console.warn('[email] admin notification failed:', (e as Error).message)
    }
  }
}

type UserApprovedInput = {
  email: string | null
  address: string
  orgName?: string | null
}

export async function notifyUserApproved(input: UserApprovedInput): Promise<void> {
  if (!input.email) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? ''
  try {
    await sendEmail({
      to: input.email,
      subject: 'Garden Manager: ваша заявка одобрена',
      html: `<p>Ваша регистрация по адресу <b>${escapeHtml(input.address)}</b> одобрена.</p>
        ${input.orgName ? `<p>Вы добавлены в ${escapeHtml(input.orgName)}.</p>` : ''}
        <p>Войдите в систему: <a href="${escapeHtml(appUrl)}">${escapeHtml(appUrl)}</a></p>`,
      text: `Ваша заявка одобрена. Адрес: ${input.address}. ${input.orgName ? `ЖК: ${input.orgName}. ` : ''}${appUrl}`,
    })
  } catch (e) {
    console.warn('[email] approved notification failed:', (e as Error).message)
  }
}
