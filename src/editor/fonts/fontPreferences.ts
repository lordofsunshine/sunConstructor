interface FontPreferences {
  favorites: string[]
  recent: string[]
  colors: string[]
}

const key = 'sunconstructor.font-preferences.v1'

const empty = (): FontPreferences => ({ favorites: [], recent: [], colors: [] })

export const loadFontPreferences = (): FontPreferences => {
  const value = localStorage.getItem(key)
  if (!value) return empty()
  try {
    const saved = JSON.parse(value) as Partial<FontPreferences>
    return { favorites: saved.favorites ?? [], recent: saved.recent ?? [], colors: saved.colors ?? [] }
  } catch {
    return empty()
  }
}

const save = (preferences: FontPreferences) => localStorage.setItem(key, JSON.stringify(preferences))

export const toggleFavoriteFont = (family: string) => {
  const preferences = loadFontPreferences()
  preferences.favorites = preferences.favorites.includes(family) ? preferences.favorites.filter((item) => item !== family) : [family, ...preferences.favorites].slice(0, 24)
  save(preferences)
  return preferences
}

export const rememberFont = (family: string) => {
  const preferences = loadFontPreferences()
  preferences.recent = [family, ...preferences.recent.filter((item) => item !== family)].slice(0, 6)
  save(preferences)
  return preferences
}

export const rememberColor = (value: string) => {
  const preferences = loadFontPreferences()
  preferences.colors = [value, ...preferences.colors.filter((item) => item !== value)].slice(0, 8)
  save(preferences)
  return preferences
}
