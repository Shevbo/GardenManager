import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM!

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendNotSignedNotification(
  email: string,
  petitionTitle: string
): Promise<void> {
  const safeTitle = escapeHtml(petitionTitle)
  const safeSubjectTitle = petitionTitle.replace(/[\r\n]/g, ' ')
  await resend.emails.send({
    from: FROM,
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
  await resend.emails.send({
    from: FROM,
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
