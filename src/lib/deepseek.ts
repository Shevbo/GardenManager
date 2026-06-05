/**
 * Модели DeepSeek-шлюза.
 * DOC_MODEL — для работы с текстом документов на сайте (СТРОГО, юр-обработка, ревизия).
 * CHAT_MODEL — лёгкая модель для болтовни (на будущее).
 */
const DOC_MODEL = 'deepseek-v4-pro'
export const CHAT_MODEL = 'deepseek-v4-flash'

interface RevisionResult {
  revisedText: string
  summary: string
}

export async function revisePetitionWithComments(
  draftText: string,
  comments: Array<{ text: string; user: { name?: string | null; email?: string | null } }>
): Promise<RevisionResult> {
  if (!process.env.DEEPSEEK_API_KEY || !process.env.DEEPSEEK_BASE_URL) {
    throw new Error('DEEPSEEK_API_KEY and DEEPSEEK_BASE_URL must be set')
  }

  const commentsFormatted = comments
    .map((c, i) => `[${i + 1}] ${c.user.name ?? c.user.email ?? 'Собственник'}: ${c.text}`)
    .join('\n')

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DOC_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты — юридический редактор коллективных заявлений граждан.
Тебе дан черновик заявления и комментарии собственников жилья.
Интегрируй значимые замечания в текст. Сохрани официальный тон и юридическую точность.
Не добавляй новых фактов, которых нет в исходном тексте или комментариях.
Верни JSON: {"revisedText": "...", "summary": "кратко что изменилось"}`,
        },
        {
          role: 'user',
          content: `ЧЕРНОВИК ЗАЯВЛЕНИЯ:\n${draftText}\n\nКОММЕНТАРИИ СОБСТВЕННИКОВ:\n${commentsFormatted}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`DeepSeek API error: ${err}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const parsed: unknown = JSON.parse(data.choices[0].message.content)
  if (
    typeof parsed !== 'object' || parsed === null ||
    !('revisedText' in parsed) || typeof (parsed as { revisedText: unknown }).revisedText !== 'string' ||
    !('summary' in parsed) || typeof (parsed as { summary: unknown }).summary !== 'string'
  ) {
    throw new Error('DeepSeek returned unexpected response shape')
  }
  return parsed as RevisionResult
}

export async function summarizeDocument(title: string, body: string): Promise<string> {
  if (!process.env.DEEPSEEK_API_KEY || !process.env.DEEPSEEK_BASE_URL) {
    throw new Error('DEEPSEEK_API_KEY and DEEPSEEK_BASE_URL must be set')
  }

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DOC_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Одним абзацем (2–3 предложения) определи, что это за документ и его суть. Начни строго со слов "Данный документ является". Только на основе предоставленных данных, без выдумок и без воды.',
        },
        {
          role: 'user',
          content: `Заголовок: ${title}\n\nТекст:\n${body}`,
        },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`DeepSeek API error: ${err}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content.trim()
}

export interface LawyerTurn {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
}

export async function lawyerChat(
  messages: LawyerTurn[],
  tools?: object[]
): Promise<{ content: string; toolCalls?: { id: string; name: string; args: unknown }[] }> {
  if (!process.env.DEEPSEEK_API_KEY || !process.env.DEEPSEEK_BASE_URL) {
    throw new Error('DEEPSEEK_API_KEY and DEEPSEEK_BASE_URL must be set')
  }

  const body: Record<string, unknown> = {
    model: DOC_MODEL,
    messages,
    temperature: 0.3,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`DeepSeek API error: ${err}`)
  }

  const data = await response.json() as {
    choices: Array<{
      message: {
        content: string | null
        tool_calls?: Array<{
          id: string
          function: { name: string; arguments: string }
        }>
      }
    }>
  }

  const msg = data.choices[0].message
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    return {
      content: '',
      toolCalls: msg.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      })),
    }
  }

  return { content: msg.content ?? '' }
}

/**
 * Юридическая обработка текущего текста заявления (без комментариев) —
 * для кнопки «Обработать юристом ИИ» на этапе черновика.
 */
export async function legalPolishText(draftText: string): Promise<RevisionResult> {
  if (!process.env.DEEPSEEK_API_KEY || !process.env.DEEPSEEK_BASE_URL) {
    throw new Error('DEEPSEEK_API_KEY and DEEPSEEK_BASE_URL must be set')
  }

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DOC_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты — юридический редактор коллективных обращений и заявлений граждан РФ.
Тебе дан текст заявления. Отредактируй его: улучши юридическую точность и официальный тон,
исправь стиль и структуру, при уместности добавь корректные ссылки на нормы права.
НЕ выдумывай новые факты и обстоятельства, которых нет в исходном тексте.
Сохрани суть и все конкретные данные (адреса, ФИО, даты, суммы) без изменений.
Верни JSON: {"revisedText": "обработанный текст", "summary": "кратко что изменилось"}`,
        },
        { role: 'user', content: `ТЕКСТ ЗАЯВЛЕНИЯ:\n${draftText}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`DeepSeek API error: ${err}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const parsed: unknown = JSON.parse(data.choices[0].message.content)
  if (
    typeof parsed !== 'object' || parsed === null ||
    !('revisedText' in parsed) || typeof (parsed as { revisedText: unknown }).revisedText !== 'string' ||
    !('summary' in parsed) || typeof (parsed as { summary: unknown }).summary !== 'string'
  ) {
    throw new Error('DeepSeek returned unexpected response shape')
  }
  return parsed as RevisionResult
}

/**
 * Внедряет рекомендацию юриста ИИ в текст документа («Согласен — применить к тексту»).
 * Возвращает обновлённый текст документа.
 */
export async function applyRecommendation(documentText: string, recommendation: string): Promise<string> {
  if (!process.env.DEEPSEEK_API_KEY || !process.env.DEEPSEEK_BASE_URL) {
    throw new Error('DEEPSEEK_API_KEY and DEEPSEEK_BASE_URL must be set')
  }
  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: DOC_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты — юридический редактор. Тебе дан текст документа и рекомендация юриста.
Внедри рекомендацию в текст документа: аккуратно перепиши/дополни так, чтобы рекомендация была учтена,
сохрани официальный тон, структуру и все конкретные данные (адреса, ФИО, даты, суммы, номера норм).
ВАЖНО: НЕ задавай уточняющих вопросов и НЕ оставляй варианты на выбор. Если рекомендация содержит несколько
вариантов или вопросы — самостоятельно выбери наиболее юридически обоснованный вариант и примени его.
НЕ выдумывай новых фактов сверх рекомендации и исходного текста. ВСЕГДА возвращай готовый итоговый текст документа.
Верни строго JSON: {"revisedText": "обновлённый текст документа", "summary": "что изменено"}`,
        },
        { role: 'user', content: `ТЕКСТ ДОКУМЕНТА:\n${documentText}\n\nРЕКОМЕНДАЦИЯ ЮРИСТА:\n${recommendation}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })
  if (!response.ok) throw new Error(`DeepSeek API error: ${await response.text()}`)
  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const parsed: unknown = JSON.parse(data.choices[0].message.content)
  if (typeof parsed !== 'object' || parsed === null || typeof (parsed as { revisedText?: unknown }).revisedText !== 'string') {
    throw new Error('DeepSeek returned unexpected response shape')
  }
  return (parsed as { revisedText: string }).revisedText
}
