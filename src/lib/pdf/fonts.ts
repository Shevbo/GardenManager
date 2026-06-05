import { Font } from '@react-pdf/renderer'
import path from 'path'

const FONT_DIR = path.join(process.cwd(), 'public/fonts')

let registered = false

/** Registers all PDF fonts exactly once per process. */
export function registerPdfFonts() {
  if (registered) return
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: path.join(FONT_DIR, 'Roboto-Regular.ttf'), fontWeight: 'normal' },
      { src: path.join(FONT_DIR, 'Roboto-Bold.ttf'), fontWeight: 'bold' },
    ],
  })
  Font.register({
    family: 'LiberationSerif',
    fonts: [
      { src: path.join(FONT_DIR, 'LiberationSerif-Regular.ttf'), fontWeight: 'normal' },
      { src: path.join(FONT_DIR, 'LiberationSerif-Bold.ttf'), fontWeight: 'bold' },
      { src: path.join(FONT_DIR, 'LiberationSerif-Italic.ttf'), fontWeight: 'normal', fontStyle: 'italic' },
      { src: path.join(FONT_DIR, 'LiberationSerif-BoldItalic.ttf'), fontWeight: 'bold', fontStyle: 'italic' },
    ],
  })
  // Disable hyphenation (Cyrillic): break by whole words.
  Font.registerHyphenationCallback(word => [word])
  registered = true
}
