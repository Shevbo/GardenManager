import nodemailer from 'nodemailer'

type SendInput = {
  to: string
  subject: string
  html: string
  text?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'mail.shectory.ru',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER ?? 'noreply@shectory.ru',
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export async function sendEmail({ to, subject, html, text }: SendInput): Promise<void> {
  const smtpPassword = process.env.SMTP_PASSWORD
  const fromEmail = process.env.EMAIL_FROM ?? 'noreply@shectory.ru'

  if (!smtpPassword) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[email:dev-fallback] ${to} — ${subject}`)
      return
    }
    throw new Error('Email provider not configured (SMTP_PASSWORD missing)')
  }

  const fromName = process.env.EMAIL_FROM_NAME ?? 'Garden Manager'
  const transport = createTransport()

  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ''),
  })
}

export async function sendNotSignedNotification(
  email: string,
  petitionTitle: string
): Promise<void> {
  const safeTitle = escapeHtml(petitionTitle)
  const safeSubjectTitle = petitionTitle.replace(/[\r\n]/g, ' ')
  await sendEmail({
    to: email,
    subject: `Срок подписания истёк — «${safeSubjectTitle}»`,
    html: `
      <p>Здравствуйте!</p>
      <p>Срок подписания заявления <strong>«${safeTitle}»</strong> истёк.</p>
      <p>Ваши комментарии были учтены при подготовке финального текста,
         однако в реестр подписей вы не включены.</p>
      <p>Заявление будет подано в органы от имени подписавших собственников.</p>
      <p>С уважением,<br>Garden Manager</p>
    `,
  })
}

export async function sendSigningInvite(
  email: string,
  petitionTitle: string,
  petitionUrl: string
): Promise<void> {
  const safeTitle = escapeHtml(petitionTitle)
  const safeSubjectTitle = petitionTitle.replace(/[\r\n]/g, ' ')
  const safeUrl = escapeHtml(petitionUrl)
  await sendEmail({
    to: email,
    subject: `Финальный текст готов — подпишите заявление «${safeSubjectTitle}»`,
    html: `
      <p>Здравствуйте!</p>
      <p>Финальный текст заявления <strong>«${safeTitle}»</strong> готов.</p>
      <p><a href="${safeUrl}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
        Подписать заявление
      </a></p>
      <p>С уважением,<br>Garden Manager</p>
    `,
  })
}

export async function sendEmailOtp(email: string, otp: string): Promise<void> {
  const safeOtp = escapeHtml(otp)
  await sendEmail({
    to: email,
    subject: `Ваш код Garden Manager: ${otp}`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;">
        <h2 style="color:#0A3D2E;font-size:20px;margin-bottom:16px;">Код подтверждения</h2>
        <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1A1A18;margin:24px 0;">${safeOtp}</p>
        <p style="color:#6B6B63;font-size:14px;">Код действителен 10 минут.</p>
        <p style="color:#6B6B63;font-size:12px;margin-top:24px;">
          Если вы не запрашивали код — проигнорируйте это письмо.
        </p>
      </div>
    `,
    text: `Ваш код Garden Manager: ${otp}\nКод действителен 10 минут.`,
  })
}
