export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting'

export interface FontMetadata {
  family: string
  category: FontCategory
  subsets: string[]
  weights: number[]
  styles: ('normal' | 'italic')[]
  axes: string[]
  variable: boolean
  lastModified: string
}

export interface TokenReference {
  type: 'token'
  token: string
}

export interface LiteralValue {
  type: 'value'
  value: string | number
}

export interface GradientStop {
  id: string
  color: StyleValue
  position: number
}

export interface Gradient {
  type: 'gradient'
  kind: 'linear' | 'radial'
  angle: number
  stops: GradientStop[]
}

export interface Shadow {
  id: string
  x: number
  y: number
  blur: number
  spread: number
  color: StyleValue
  opacity: number
  inset: boolean
}

export type StyleValue = string | number | boolean | TokenReference | LiteralValue | Gradient

export interface ColorToken {
  id: string
  name: string
  value: string
}

export interface SpacingToken {
  id: string
  name: string
  value: number
}

export interface RadiusToken {
  id: string
  name: string
  value: number
}

export interface TypographyStyle {
  family: string
  weight: number
  style: 'normal' | 'italic'
}

export interface ButtonStyle {
  font: TypographyStyle
  textColor: StyleValue
  background: StyleValue
  paddingX: number
  paddingY: number
  radius: StyleValue
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted'
  borderWidth: number
  borderColor: StyleValue
  shadows: Shadow[]
}

export interface ProjectTheme {
  colors: ColorToken[]
  typography: {
    heading: TypographyStyle
    body: TypographyStyle
  }
  spacing: SpacingToken[]
  radius: RadiusToken[]
  button: ButtonStyle
}

export const token = (name: string): TokenReference => ({ type: 'token', token: name })

export const literal = (value: string | number): LiteralValue => ({ type: 'value', value })
