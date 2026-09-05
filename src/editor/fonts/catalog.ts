import catalog from './fonts.json'
import type { FontMetadata } from '../theme/types'

export const fonts = catalog as FontMetadata[]

export const findFont = (family: string) => fonts.find((font) => font.family === family)

export const fontFallback = (family: string) => {
  const category = findFont(family)?.category
  if (category === 'serif') return 'serif'
  if (category === 'monospace') return 'monospace'
  if (category === 'handwriting') return 'cursive'
  return 'sans-serif'
}
