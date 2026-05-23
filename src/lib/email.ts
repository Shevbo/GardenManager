import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM!

export async function sendNotSignedNotification(
  email: string,
  petitionTitle: string
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Срок подписания истёк — «${petitionTitle}»`,
    html: `
      <p>Здравствуйте!</p>
      <p>Срок подписания заявления <strong>«${petitionTitle}»</strong> истёк.</p>
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
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Финальный текст готов — подпишите заявление «${petitionTitle}»`,
    html: `
      <p>Здравствуйте!</p>
      <p>Финальный текст заявления <strong>«${petitionTitle}»</strong> готов.</p>
      <p><a href="${petitionUrl}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
        Подписать заявление
      </a></p>
      <p>С уважением,<br>Garden Manager</p>
    `,
  })
}
