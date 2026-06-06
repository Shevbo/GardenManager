/**
 * Widow control for the official-letter body.
 * Rule (per product owner): avoid a final page with fewer than MIN_LAST_LINES lines.
 * If it would happen, first try to COMPRESS (smaller font 12–14 + tighter paragraph gap 4–6)
 * to fit on N−1 pages; otherwise EXPAND (larger font up to 15 + gap up to 8) so the last page
 * carries more than MIN_LAST_LINES lines. Estimation-based (line geometry), bounded.
 */
const A4_W = 595.28
const A4_H = 841.89
const MARGIN = 56.7 // 2 cm
const FOOTER_RESERVE = 42
const CONTENT_W = A4_W - 2 * MARGIN
const PAGE_USABLE = A4_H - 2 * MARGIN - FOOTER_RESERVE
const MIN_LAST_LINES = 8

export interface TypoChoice { fontSize: number; paraGap: number }

export function estimateLayout(paragraphs: string[], registryRows: number, fontSize: number, paraGap: number): { pages: number; lastLines: number } {
  const lineBox = fontSize * 1.4
  const charsPerLine = Math.max(20, CONTENT_W / (0.5 * fontSize))
  // overhead: addressee/sender header + title + signature row (roughly constant)
  const overhead = 200
  // registry appendix (if any signatures): heading + header row + rows + ПЭП plaque + footnote
  const registryH = registryRows > 0 ? 70 + (registryRows + 1) * 16 + 110 : 0
  let bodyH = 0
  for (const p of paragraphs) {
    const lines = Math.max(1, Math.ceil(p.length / charsPerLine))
    bodyH += lines * lineBox + paraGap
  }
  const total = overhead + bodyH + registryH
  const pages = Math.max(1, Math.ceil(total / PAGE_USABLE))
  const lastH = total - (pages - 1) * PAGE_USABLE
  const lastLines = lastH / lineBox
  return { pages, lastLines }
}

/** Picks fontSize (12–15) and paraGap (4–8) to avoid a thin widow last page. */
export function fitTypography(paragraphs: string[], registryRows: number): TypoChoice {
  const def: TypoChoice = { fontSize: 14, paraGap: 6 }
  const base = estimateLayout(paragraphs, registryRows, def.fontSize, def.paraGap)
  if (base.pages <= 1 || base.lastLines >= MIN_LAST_LINES) return def

  // COMPRESS: try to drop to base.pages - 1 (prefer the largest font that achieves it)
  const compress: TypoChoice[] = [{ fontSize: 13, paraGap: 5 }, { fontSize: 12, paraGap: 4 }]
  for (const c of compress) {
    const e = estimateLayout(paragraphs, registryRows, c.fontSize, c.paraGap)
    if (e.pages <= base.pages - 1) return c
  }
  // EXPAND: push the last page over the threshold (prefer not adding pages)
  const expand: TypoChoice[] = [{ fontSize: 15, paraGap: 7 }, { fontSize: 15, paraGap: 8 }]
  for (const c of expand) {
    const e = estimateLayout(paragraphs, registryRows, c.fontSize, c.paraGap)
    if (e.pages <= base.pages && e.lastLines >= MIN_LAST_LINES) return c
  }
  return def
}
