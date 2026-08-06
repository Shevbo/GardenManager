const REPLACEMENTS: [RegExp, string][] = [
  // здание/зд → д (DaData отдаёт «зд 10», житель пишет «д. 10» — это один дом)
  [/здание/g, 'зд'],
  [/(^|[\s,])зд\.?(?=[\s,]|$)/g, '$1д'],
  // одиночная «к» = корпус (в подсказках DaData «зд 10 к 1»)
  [/(^|[\s,])к\.?(?=[\s,]|$)/g, '$1корп'],
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

  // «г Севастополь» / «город Москва» — маркер населённого пункта не несёт
  // смысла для сопоставления, а житель его обычно не пишет
  s = s.replace(/(^|[\s,])(?:город|гор|г)\.?(?=[\s,])/g, '$1')

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

export type AddressParts = { base: string; block: string | null }

/** Отделяет уточнение «корп N» / «стр N» от адреса дома. */
export function splitAddress(normalized: string): AddressParts {
  const m = normalized.match(/\s(корп|стр)\s+(\S+)$/)
  if (!m || m.index === undefined) return { base: normalized, block: null }
  return { base: normalized.slice(0, m.index).trim(), block: `${m[1]} ${m[2]}` }
}

export type BuildingLike = { addressNormalized: string | null }

/**
 * Выбирает дом под введённый адрес.
 *
 * Точное совпадение — приоритет. Если житель написал дом без корпуса
 * («ул Летчиков, д 10»), а в базе он заведён с корпусом («зд 10 к 1»), то при
 * ЕДИНСТВЕННОМ подходящем доме считаем это тем самым домом; если корпусов
 * несколько — не угадываем и отдаём кандидатов (пусть выбирает человек).
 */
export function pickBuilding<T extends BuildingLike>(
  queryNormalized: string,
  buildings: T[],
): { match: T | null; candidates: T[] } {
  if (!queryNormalized) return { match: null, candidates: [] }

  const exact = buildings.find(b => b.addressNormalized === queryNormalized)
  if (exact) return { match: exact, candidates: [exact] }

  const q = splitAddress(queryNormalized)
  const sameHouse = buildings.filter(b => b.addressNormalized && splitAddress(b.addressNormalized).base === q.base)
  if (sameHouse.length === 0) return { match: null, candidates: [] }

  if (q.block) {
    const byBlock = sameHouse.find(b => splitAddress(b.addressNormalized!).block === q.block)
    return { match: byBlock ?? null, candidates: sameHouse }
  }
  return sameHouse.length === 1
    ? { match: sameHouse[0], candidates: sameHouse }
    : { match: null, candidates: sameHouse }
}
