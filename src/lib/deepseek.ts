interface RevisionResult {
  revisedText: string
  summary: string
}

export async function revisePetitionWithComments(
  draftText: string,
  comments: Array<{ text: string; user: { name?: string | null; email?: string | null } }>
): Promise<RevisionResult> {
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
      model: 'deepseek-chat',
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

  const data = await response.json()
  const result = JSON.parse(data.choices[0].message.content) as RevisionResult
  return result
}
