import type { ElementStyleValue, ResponsiveMode, ResponsiveOverrides } from '../model/types'

const modes: ResponsiveMode[] = ['desktop', 'tablet', 'mobile']

export const viewportWidths: Record<ResponsiveMode, number> = { desktop: 1440, tablet: 768, mobile: 390 }

export const resolveResponsiveStyles = (base: Record<string, ElementStyleValue>, overrides: ResponsiveOverrides | undefined, mode: ResponsiveMode) => {
  const styles = { ...base }
  if (mode === 'desktop') return styles
  Object.assign(styles, overrides?.tablet)
  if (mode === 'mobile') Object.assign(styles, overrides?.mobile)
  return styles
}

export const styleSource = (overrides: ResponsiveOverrides | undefined, key: string, mode: ResponsiveMode): ResponsiveMode => {
  const index = modes.indexOf(mode)
  for (let position = index; position > 0; position -= 1) if (overrides?.[modes[position] as Exclude<ResponsiveMode, 'desktop'>]?.[key] !== undefined) return modes[position]
  return 'desktop'
}

export const resolveVisibility = (visibility: Partial<Record<ResponsiveMode, boolean>> | undefined, mode: ResponsiveMode) => {
  if (mode === 'mobile') return visibility?.mobile ?? visibility?.tablet ?? visibility?.desktop ?? true
  if (mode === 'tablet') return visibility?.tablet ?? visibility?.desktop ?? true
  return visibility?.desktop ?? true
}
