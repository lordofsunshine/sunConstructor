import { findFont } from './catalog'

type FontState = 'idle' | 'loading' | 'ready' | 'offline'

const state = new Map<string, FontState>()
const links = new Map<string, HTMLLinkElement>()

const name = (family: string) => family.replace(/ /g, '+')

export const buildGoogleFontsUrl = (family: string, weights: number[] = [400, 700], italic = false) => {
  const values = [...new Set(weights)].sort((a, b) => a - b).join(';')
  const axis = italic ? `ital,wght@0,${values.split(';').join(';0,')};1,${values.split(';').join(';1,')}` : `wght@${values}`
  return `https://fonts.googleapis.com/css2?family=${name(family)}:${axis}&display=swap`
}

export const fontStatus = (family: string): FontState => state.get(family) ?? 'idle'

export const isLoaded = (family: string) => {
  if (fontStatus(family) === 'ready') return true
  try { return document.fonts.check(`16px "${family.replace(/"/g, '\\"')}"`) } catch { return false }
}

const pending = new Map<string, Promise<FontState>>()

export const loadFont = (family: string, weights?: number[], italic = false) => {
  if (isLoaded(family)) {
    state.set(family, 'ready')
    return Promise.resolve('ready' as const)
  }
  const existing = pending.get(family)
  if (existing) return existing
  const metadata = findFont(family)
  state.set(family, 'loading')
  const promise = new Promise<FontState>((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = buildGoogleFontsUrl(family, weights ?? metadata?.weights.slice(0, 4) ?? [400, 700], italic)
    link.onload = () => { state.set(family, 'ready'); pending.delete(family); resolve('ready') }
    link.onerror = () => { state.set(family, 'offline'); pending.delete(family); resolve('offline') }
    links.set(family, link)
    document.head.append(link)
  })
  pending.set(family, promise)
  return promise
}

export const preloadFont = (family: string) => loadFont(family)

export const unloadUnusedFonts = (used: string[]) => {
  for (const [family, link] of links) {
    if (used.includes(family)) continue
    link.remove()
    links.delete(family)
    state.delete(family)
  }
}
