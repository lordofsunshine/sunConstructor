import { Check, Search, Star, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { fonts } from '../fonts/catalog'
import { fontStatus, loadFont } from '../fonts/fontLoader'
import { loadFontPreferences, rememberFont, toggleFavoriteFont } from '../fonts/fontPreferences'
import type { FontCategory, FontMetadata } from '../theme/types'

export interface FontPickerTarget {
  label: string
  current: string
}

interface FontPickerProps {
  target: FontPickerTarget
  onSelect: (font: FontMetadata) => void
  onPreview: (family: string | null) => void
  onClose: () => void
}

type ScriptFilter = 'all' | 'latin' | 'cyrillic'
type StyleFilter = 'all' | 'variable' | 'static' | 'favorites'

const pairings: Record<string, string[]> = {
  Manrope: ['Inter', 'Source Sans 3', 'PT Sans'],
  Lora: ['Inter', 'Manrope', 'Source Sans 3'],
  'IBM Plex Mono': ['IBM Plex Sans', 'Inter', 'Manrope'],
  Inter: ['Manrope', 'Literata', 'IBM Plex Mono'],
  Onest: ['Source Serif 4', 'Inter', 'PT Sans'],
  Unbounded: ['Inter', 'Manrope', 'Golos Text'],
}

const readableCategory: Record<FontCategory | 'all', string> = {
  all: 'All',
  'sans-serif': 'Sans Serif',
  serif: 'Serif',
  display: 'Display',
  monospace: 'Monospace',
  handwriting: 'Handwriting',
}

const FontRow = ({ font, preview, favorite, active, onActivate, onFavorite, onVisible }: { font: FontMetadata; preview: string; favorite: boolean; active: boolean; onActivate: () => void; onFavorite: () => void; onVisible: (font: FontMetadata) => void }) => {
  const reference = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState(fontStatus(font.family))
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      onVisible(font)
      loadFont(font.family, font.weights.slice(0, 4)).then(setStatus)
      observer.disconnect()
    }, { rootMargin: '160px' })
    if (reference.current) observer.observe(reference.current)
    return () => observer.disconnect()
  }, [font, onVisible])
  return <div ref={reference} role="option" aria-selected={active} tabIndex={0} className={active ? 'font-row is-active' : 'font-row'} onMouseEnter={() => onVisible(font)} onClick={onActivate} onKeyDown={(event) => { if (event.key === 'Enter') onActivate() }}>
    <span className="font-row-title"><strong>{font.family}</strong><small>{readableCategory[font.category]}{status === 'loading' ? ' · Loading font...' : status === 'offline' ? ' · Font unavailable offline' : ''}</small></span>
    <span className="font-row-preview" style={{ fontFamily: `"${font.family}", ${font.category === 'serif' ? 'serif' : font.category === 'monospace' ? 'monospace' : 'sans-serif'}` }}>{preview}</span>
    <span className="font-row-actions"><button type="button" aria-label={`Favorite ${font.family}`} title={`Favorite ${font.family}`} className={favorite ? 'font-favorite is-active' : 'font-favorite'} onClick={(event) => { event.stopPropagation(); onFavorite() }}><Star size={15} fill={favorite ? 'currentColor' : 'none'} /></button>{active && <Check size={16} />}</span>
  </div>
}

export const FontPicker = ({ target, onSelect, onPreview, onClose }: FontPickerProps) => {
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState('Make something people remember.')
  const [script, setScript] = useState<ScriptFilter>('all')
  const [category, setCategory] = useState<FontCategory | 'all'>('all')
  const [style, setStyle] = useState<StyleFilter>('all')
  const [active, setActive] = useState(target.current)
  const [preferences, setPreferences] = useState(loadFontPreferences)
  const search = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => onPreview(null), [onPreview])

  const filtered = useMemo(() => fonts.filter((font) => {
    const hasScript = script === 'all' || font.subsets.includes(script) || font.subsets.includes(`${script}-ext`)
    const hasCategory = category === 'all' || font.category === category
    const hasStyle = style === 'all' || style === 'favorites' ? style !== 'favorites' || preferences.favorites.includes(font.family) : style === 'variable' ? font.variable : !font.variable
    return hasScript && hasCategory && hasStyle && font.family.toLowerCase().includes(query.trim().toLowerCase())
  }), [category, preferences.favorites, query, script, style])

  const keyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!filtered.length) return
    const current = Math.max(0, filtered.findIndex((font) => font.family === active))
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(filtered[Math.min(current + 1, filtered.length - 1)].family) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(filtered[Math.max(current - 1, 0)].family) }
    if (event.key === 'Enter') { event.preventDefault(); const font = filtered.find((item) => item.family === active); if (font) { onSelect(font); setPreferences(rememberFont(font.family)) } }
    if (event.key === 'Escape') onClose()
  }

  const select = (font: FontMetadata) => { onSelect(font); setActive(font.family); setPreferences(rememberFont(font.family)) }
  const recommended = pairings[target.current] ?? []
  return <aside className="font-picker" aria-label="Fonts" onKeyDown={keyboard}>
    <header className="font-picker-header"><div><p>Font library</p><h2>{target.label}</h2></div><button type="button" className="icon-button" aria-label="Close fonts" title="Close fonts" onClick={onClose}><X size={17} /></button></header>
    <label className="font-search"><Search size={16} /><input ref={search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fonts..." /></label>
    <label className="font-preview-input"><span>Preview text</span><input value={preview} onChange={(event) => setPreview(event.target.value)} /></label>
    <div className="font-filter-grid"><label><span>Writing system</span><select value={script} onChange={(event) => setScript(event.target.value as ScriptFilter)}><option value="all">All</option><option value="latin">Latin</option><option value="cyrillic">Cyrillic</option></select></label><label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value as FontCategory | 'all')}>{Object.entries(readableCategory).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label><span>Style</span><select value={style} onChange={(event) => setStyle(event.target.value as StyleFilter)}><option value="all">All</option><option value="variable">Variable</option><option value="static">Static</option><option value="favorites">Favorites</option></select></label></div>
    {preferences.recent.length > 0 && !query && style !== 'favorites' && <div className="font-recent"><span>Recently used</span>{preferences.recent.map((family) => <button type="button" key={family} onClick={() => { const font = fonts.find((item) => item.family === family); if (font) select(font) }}>{family}</button>)}</div>}
    <div className="font-list" onMouseLeave={() => onPreview(null)}>{filtered.map((font) => <FontRow key={font.family} font={font} preview={preview} favorite={preferences.favorites.includes(font.family)} active={active === font.family} onVisible={(item) => { loadFont(item.family); onPreview(item.family) }} onActivate={() => select(font)} onFavorite={() => setPreferences(toggleFavoriteFont(font.family))} />)}{filtered.length === 0 && <p className="font-empty">No fonts match these filters.</p>}</div>
    {recommended.length > 0 && <div className="font-pairings"><span>Looks great with</span><div>{recommended.slice(0, 3).map((family) => <button key={family} type="button" onClick={() => { const font = fonts.find((item) => item.family === family); if (font) select(font) }}>{family}</button>)}</div></div>}
  </aside>
}
