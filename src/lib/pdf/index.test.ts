import { describe, it, expect } from 'vitest'
import { renderDocumentPdf } from './index'

describe('renderDocumentPdf', () => {
  it('renders official-letter to a non-empty PDF buffer with Cyrillic', async () => {
    const buf = await renderDocumentPdf({
      layoutKey: 'official-letter', values: {}, title: 'Заявление',
      bodyText: 'Просим отремонтировать площадку.', recipient: 'Главе управы',
    })
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  }, 20000)
})
