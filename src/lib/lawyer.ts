import type { LawyerTurn } from './deepseek'

export const LAWYER_SYSTEM_PROMPT =
  'Ты — ведущий юрист по жилищному праву Российской Федерации с большой практикой. ' +
  'Отвечаешь точно и по существу, со ссылками на действующие нормы (Жилищный кодекс РФ, ' +
  'Гражданский кодекс РФ, профильные федеральные законы и постановления Правительства). ' +
  'Опираешься на текст обсуждаемого документа. Структурируешь ответ. В конце добавляешь ' +
  'краткую оговорку, что ответ носит информационный характер и не заменяет очную юридическую консультацию.'

export function buildLawyerContext(
  doc: { docNumber: string | null; title: string; status: string; text: string },
  thread: { role: string; content: string }[]
): LawyerTurn[] {
  const systemContent =
    LAWYER_SYSTEM_PROMPT +
    '\n\nКАРТОЧКА ДОКУМЕНТА:\n' +
    'Номер: ' + (doc.docNumber ?? '—') + '\n' +
    'Заголовок: ' + doc.title + '\n' +
    'Статус: ' + doc.status + '\n' +
    'Текст:\n' + doc.text.slice(0, 4000)

  const historyTurns: LawyerTurn[] = thread.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))

  return [{ role: 'system', content: systemContent }, ...historyTurns]
}
