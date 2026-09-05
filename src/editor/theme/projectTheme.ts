import type { ProjectTheme, StyleValue } from './types'
import { token } from './types'

export const defaultTheme = (): ProjectTheme => ({
  colors: [
    { id: 'primary', name: 'Primary', value: '#f5c542' },
    { id: 'background', name: 'Background', value: '#fffdf7' },
    { id: 'text', name: 'Text', value: '#171717' },
    { id: 'muted', name: 'Muted', value: '#77736b' },
  ],
  typography: {
    heading: { family: 'Manrope', weight: 700, style: 'normal' },
    body: { family: 'Inter', weight: 400, style: 'normal' },
  },
  spacing: [
    { id: 'xs', name: 'XS', value: 4 },
    { id: 'sm', name: 'S', value: 8 },
    { id: 'md', name: 'M', value: 16 },
    { id: 'lg', name: 'L', value: 32 },
    { id: 'xl', name: 'XL', value: 64 },
    { id: '2xl', name: '2XL', value: 96 },
  ],
  radius: [
    { id: 'small', name: 'Small', value: 6 },
    { id: 'medium', name: 'Medium', value: 12 },
    { id: 'large', name: 'Large', value: 24 },
    { id: 'pill', name: 'Pill', value: 999 },
  ],
  button: {
    font: { family: 'Inter', weight: 700, style: 'normal' },
    textColor: token('colors.text'),
    background: token('colors.primary'),
    paddingX: 20,
    paddingY: 12,
    radius: token('radius.pill'),
    borderStyle: 'none',
    borderWidth: 0,
    borderColor: token('colors.text'),
    shadows: [],
  },
})

const themeValue = (theme: ProjectTheme, key: string): string | number | undefined => {
  const [group, id] = key.split('.')
  if (group === 'colors') return theme.colors.find((item) => item.id === id)?.value
  if (group === 'spacing') return theme.spacing.find((item) => item.id === id)?.value
  if (group === 'radius') return theme.radius.find((item) => item.id === id)?.value
  if (key === 'typography.headingFont') return theme.typography.heading.family
  if (key === 'typography.bodyFont') return theme.typography.body.family
  if (key === 'button.fontFamily') return theme.button.font.family
  if (key === 'button.fontWeight') return theme.button.font.weight
  if (key === 'button.fontStyle') return theme.button.font.style
  if (key === 'button.background') { const value = resolveStyleValue(theme.button.background, theme); return typeof value === 'string' || typeof value === 'number' ? value : undefined }
  if (key === 'button.textColor') { const value = resolveStyleValue(theme.button.textColor, theme); return typeof value === 'string' || typeof value === 'number' ? value : undefined }
  if (key === 'button.radius') { const value = resolveStyleValue(theme.button.radius, theme); return typeof value === 'string' || typeof value === 'number' ? value : undefined }
  return undefined
}

export const isToken = (value: StyleValue | undefined): value is { type: 'token'; token: string } => typeof value === 'object' && value !== null && 'type' in value && value.type === 'token'

export const isGradient = (value: StyleValue | undefined): value is { type: 'gradient'; kind: 'linear' | 'radial'; angle: number; stops: { id: string; color: StyleValue; position: number }[] } => typeof value === 'object' && value !== null && 'type' in value && value.type === 'gradient'

export const resolveStyleValue = (value: StyleValue | undefined, theme: ProjectTheme, fallback: string | number = ''): string | number | boolean => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (!value) return fallback
  if (value.type === 'value') return value.value
  if (value.type === 'token') return themeValue(theme, value.token) ?? fallback
  const stops = value.stops.map((stop) => `${resolveStyleValue(stop.color, theme, '#ffffff')} ${stop.position}%`).join(', ')
  return value.kind === 'linear' ? `linear-gradient(${value.angle}deg, ${stops})` : `radial-gradient(circle at center, ${stops})`
}

export const colorToken = (id: string): StyleValue => token(`colors.${id}`)

export const usesToken = (value: StyleValue | undefined, name: string): boolean => {
  if (!value || typeof value !== 'object') return false
  if (value.type === 'token') return value.token === name
  if (value.type === 'gradient') return value.stops.some((stop) => usesToken(stop.color, name))
  return false
}
