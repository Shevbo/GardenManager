const REPLACEMENTS: [RegExp, string][] = [
  // улица variants → ул
  [/улица/g, 'ул'],
  [/ул\.?(?=[\s,]|$)/g, 'ул'],
  // дом variants → д
  [/дом/g, 'д'],
  [/д\.?(?=[\s,]|$)/g, 'д'],
  // корпус variants → корп
  [/корпус/g, 'корп'],
  [/корп\.?(?=[\s,]|$)/g, 'корп'],
  // строение variants → стр
  [/строение/g, 'стр'],
  [/стр\.?(?=[\s,]|$)/g, 'стр'],
  // проспект variants → пр-кт
  [/проспект/g, 'пр-кт'],
  [/пр\.?(?=[\s,]|$)/g, 'пр-кт'],
  // переулок → пер
  [/переулок/g, 'пер'],
  [/пер\.?(?=[\s,]|$)/g, 'пер'],
  // бульвар → б-р
  [/бульвар/g, 'б-р'],
  [/б\.?(?=[\s,]|$)/g, 'б-р'],
]

const APARTMENT_RE = /,?\s*(?:кв(?:\.|артира)?|квартира)\s*\.?\s*\S+\s*$/i

export function normalizeAddress(raw: string): string {
  if (!raw) return ''
  let s = raw.trim().toLowerCase()
  if (!s) return ''

  // remove apartment portion before further normalization
  s = s.replace(APARTMENT_RE, '')

  // replace common quoting characters with spaces
  s = s.replace(/[«»""''`]/g, ' ')

  // apply abbreviation replacements
  for (const [re, rep] of REPLACEMENTS) {
    s = s.replace(re, rep)
  }

  // remove residual punctuation (commas, dots that aren't part of abbrev keys)
  s = s.replace(/[.,;:!?]/g, ' ')

  // collapse whitespace
  s = s.replace(/\s+/g, ' ').trim()

  return s
}
