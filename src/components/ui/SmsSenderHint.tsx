/**
 * Подсказка о номере-отправителе СМС (просьба Бориса 2026-08-08): рекомендуем
 * сохранить сервисный номер в контакты, чтобы коды не резал антиспам оператора.
 * Номер задаётся NEXT_PUBLIC_SMS_SENDER_PHONE (в прод-.env, инлайнится при
 * сборке); пока номер не задан — текст без цифры, смысл сохраняется.
 */
const SENDER_PHONE = process.env.NEXT_PUBLIC_SMS_SENDER_PHONE

export function SmsSenderHint({ compact = false }: { compact?: boolean }) {
  const text = SENDER_PHONE
    ? `СМС придёт с номера ${SENDER_PHONE}. Рекомендуем сохранить его в контактах как «Garden Manager» — так сообщения не попадут под антиспам-фильтр вашего оператора связи.`
    : 'СМС придёт с сервисного номера системы. Рекомендуем сохранить его в контактах как «Garden Manager» после первого сообщения — так коды не попадут под антиспам-фильтр вашего оператора связи.'
  return (
    <p style={{
      fontSize: compact ? '11px' : '12px',
      color: 'var(--ink-soft)',
      lineHeight: 1.5,
      margin: compact ? '6px 0 0' : '8px 0 0',
    }}>
      📱 {text}
    </p>
  )
}
