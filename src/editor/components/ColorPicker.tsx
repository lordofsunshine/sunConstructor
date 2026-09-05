import { Pipette } from 'lucide-react'
import { useState } from 'react'
import { loadFontPreferences, rememberColor } from '../fonts/fontPreferences'

interface EyeDropperResult {
  sRGBHex: string
}

interface EyeDropperApi {
  open: () => Promise<EyeDropperResult>
}

const normalize = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#171717'

const rgb = (hex: string) => {
  const color = normalize(hex).slice(1)
  return `${Number.parseInt(color.slice(0, 2), 16)}, ${Number.parseInt(color.slice(2, 4), 16)}, ${Number.parseInt(color.slice(4, 6), 16)}`
}

const hsl = (hex: string) => {
  const color = normalize(hex).slice(1)
  const red = Number.parseInt(color.slice(0, 2), 16) / 255
  const green = Number.parseInt(color.slice(2, 4), 16) / 255
  const blue = Number.parseInt(color.slice(4, 6), 16) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  if (max === min) return `0, 0%, ${Math.round(lightness * 100)}%`
  const delta = max - min
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const hue = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4
  return `${Math.round((hue * 60 + 360) % 360)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%`
}

const hslToHex = (value: string) => {
  const parts = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number)
  if (!parts || parts.length < 3) return null
  const [rawHue, rawSaturation, rawLightness] = parts
  const hue = ((rawHue % 360) + 360) % 360
  const saturation = Math.min(100, Math.max(0, rawSaturation)) / 100
  const lightness = Math.min(100, Math.max(0, rawLightness)) / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const part = hue / 60
  const second = chroma * (1 - Math.abs(part % 2 - 1))
  const [red, green, blue] = part < 1 ? [chroma, second, 0] : part < 2 ? [second, chroma, 0] : part < 3 ? [0, chroma, second] : part < 4 ? [0, second, chroma] : part < 5 ? [second, 0, chroma] : [chroma, 0, second]
  const match = lightness - chroma / 2
  return `#${[red, green, blue].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`
}

export const ColorPicker = ({ label, value, opacity, projectColors, onChange, onOpacity }: { label: string; value: string; opacity?: number; projectColors: { id: string; name: string; value: string }[]; onChange: (value: string) => void; onOpacity?: (value: number) => void }) => {
  const normalized = normalize(value)
  const [draft, setDraft] = useState(normalized)
  const [hslDraft, setHslDraft] = useState(hsl(normalized))
  const recent = loadFontPreferences().colors
  const apply = (next: string) => { const color = normalize(next); setDraft(color); setHslDraft(hsl(color)); rememberColor(color); onChange(color) }
  if (normalized !== draft && document.activeElement?.getAttribute('data-color-hex') !== 'true') {
    queueMicrotask(() => { setDraft(normalized); setHslDraft(hsl(normalized)) })
  }
  const eyeDropper = 'EyeDropper' in window ? window as Window & { EyeDropper: new () => EyeDropperApi } : null
  return <div className="color-picker">
    <div className="color-picker-top"><label><span>{label}</span><input type="color" value={draft} onChange={(event) => apply(event.target.value)} /></label><label className="color-hex"><span>HEX</span><input data-color-hex="true" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => apply(draft)} /></label>{eyeDropper && <button type="button" className="icon-button" aria-label="Pick color from screen" title="Pick color from screen" onClick={() => eyeDropper.EyeDropper ? new eyeDropper.EyeDropper().open().then((result) => apply(result.sRGBHex)).catch(() => {}) : undefined}><Pipette size={16} /></button>}</div>
    <div className="color-model"><span>RGB {rgb(draft)}</span><label>HSL<input value={hslDraft} onChange={(event) => setHslDraft(event.target.value)} onBlur={() => { const next = hslToHex(hslDraft); if (next) apply(next); else setHslDraft(hsl(draft)) }} /></label></div>
    {typeof opacity === 'number' && <label className="range-field"><span>Opacity <b>{opacity}%</b></span><input type="range" min="0" max="100" value={opacity} onChange={(event) => onOpacity?.(Number(event.target.value))} /></label>}
    <div className="color-swatches"><span>Project colors</span><div>{projectColors.map((color) => <button type="button" key={color.id} title={color.name} aria-label={`Use ${color.name}`} style={{ background: color.value }} onClick={() => apply(color.value)} />)}</div></div>
    {recent.length > 0 && <div className="color-swatches"><span>Recently used</span><div>{recent.map((color) => <button type="button" key={color} aria-label={`Use ${color}`} title={`Use ${color}`} style={{ background: color }} onClick={() => apply(color)} />)}</div></div>}
  </div>
}
