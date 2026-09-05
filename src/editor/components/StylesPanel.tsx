import { Copy, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ColorPicker } from './ColorPicker'
import { ShadowEditor, TokenColor } from './SurfaceControls'
import type { FontPickerTarget } from './FontPicker'
import { countColorUses } from '../theme/themeUsage'
import type { ElementStyleValue } from '../model/types'
import { literal, type StyleValue } from '../theme/types'
import { randomId } from '../model/ids'
import { useEditorStore } from '../store/editorStore'

type StyleTab = 'colors' | 'typography' | 'spacing' | 'corners' | 'buttons'

const tabs: { id: StyleTab; label: string }[] = [{ id: 'colors', label: 'Colors' }, { id: 'typography', label: 'Typography' }, { id: 'spacing', label: 'Spacing' }, { id: 'corners', label: 'Corners' }, { id: 'buttons', label: 'Buttons' }]

const NumberField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => <label className="property-field"><span>{label}</span><input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>

const replaceColor = (value: ElementStyleValue, name: string, next: string): ElementStyleValue => {
  if (Array.isArray(value)) return value.map((shadow) => ({ ...shadow, color: replaceColor(shadow.color, name, next) as StyleValue }))
  if (typeof value !== 'object' || value === null) return value
  if (value.type === 'token' && value.token === name) return literal(next)
  if (value.type === 'gradient') return { ...value, stops: value.stops.map((stop) => ({ ...stop, color: replaceColor(stop.color, name, next) as typeof stop.color })) }
  return value
}

export const StylesPanel = ({ onOpenFonts }: { onOpenFonts: (target: FontPickerTarget & { scope: 'heading' | 'body' | 'button' }) => void }) => {
  const { project, updateTheme, updateProject } = useEditorStore()
  const [tab, setTab] = useState<StyleTab>('colors')
  const [editingColor, setEditingColor] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showAllSpacing, setShowAllSpacing] = useState(false)
  const [showAllCorners, setShowAllCorners] = useState(false)
  if (!project) return null
  const theme = project.theme
  const color = theme.colors.find((item) => item.id === editingColor)
  const addColor = () => {
    const id = `color-${randomId().slice(0, 8)}`
    updateTheme((next) => next.colors.push({ id, name: 'New color', value: '#936641' }))
    setEditingColor(id)
  }
  const deleteColor = (id: string, replace = false) => {
    updateProject((next) => {
      const current = next.theme.colors.find((item) => item.id === id)
      if (!current) return
      const replacement = replace ? next.theme.colors.find((item) => item.id === 'primary')?.value ?? '#f5c542' : current.value
      for (const page of next.pages) {
        for (const element of Object.values(page.document.elements)) for (const [key, value] of Object.entries(element.styles)) element.styles[key] = replaceColor(value, `colors.${id}`, replacement)
      }
      for (const element of Object.values(next.document.elements)) for (const [key, value] of Object.entries(element.styles)) element.styles[key] = replaceColor(value, `colors.${id}`, replacement)
      next.theme.button.background = replaceColor(next.theme.button.background, `colors.${id}`, replacement) as typeof next.theme.button.background
      next.theme.button.textColor = replaceColor(next.theme.button.textColor, `colors.${id}`, replacement) as typeof next.theme.button.textColor
      next.theme.button.borderColor = replaceColor(next.theme.button.borderColor, `colors.${id}`, replacement) as typeof next.theme.button.borderColor
      next.theme.colors = next.theme.colors.filter((item) => item.id !== id)
    })
    setDeleting(null)
    setEditingColor(null)
  }
  return <aside className="editor-panel styles-panel"><div className="panel-heading"><p>Project system</p><h2>Styles</h2></div><nav className="styles-tabs">{tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav><div className="style-panel-scroll">
    {tab === 'colors' && <section className="style-section"><div className="style-section-heading"><h3>Project colors</h3><button type="button" className="small-action" onClick={addColor}><Plus size={14} /> Add color</button></div><div className="token-list">{theme.colors.map((item) => <button type="button" key={item.id} className="token-row" onClick={() => setEditingColor(item.id)}><i style={{ background: item.value }} /><strong>{item.name}</strong></button>)}</div>{color && <div className="token-modal" role="presentation" onClick={() => setEditingColor(null)}><div className="token-modal-card" role="dialog" aria-label="Edit color" onClick={(event) => event.stopPropagation()}><header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>{color.name}</strong><button type="button" onClick={() => setEditingColor(null)}>×</button></header><label className="property-field"><span>Name</span><input value={color.name} onChange={(event) => updateTheme((next) => { const item = next.colors.find((entry) => entry.id === color.id); if (item) item.name = event.target.value })} /></label><ColorPicker label="Color" value={color.value} projectColors={theme.colors} onChange={(value) => updateTheme((next) => { const item = next.colors.find((entry) => entry.id === color.id); if (item) item.value = value })} />{deleting === color.id ? <div className="token-warning"><p>This color is being used on your page.</p><button type="button" onClick={() => deleteColor(color.id, true)}>Replace with Primary</button><button type="button" onClick={() => deleteColor(color.id)}>Keep current values</button><button type="button" onClick={() => setDeleting(null)}>Cancel</button></div> : <div className="color-editor-actions"><button type="button" onClick={() => { const duplicate = { ...color, id: `color-${randomId().slice(0, 8)}`, name: `${color.name} copy` }; updateTheme((next) => next.colors.push(duplicate)); setEditingColor(duplicate.id) }}><Copy size={14} /> Duplicate</button><button type="button" className="danger-action" onClick={() => countColorUses(project, color.id) ? setDeleting(color.id) : deleteColor(color.id)}><Trash2 size={14} /> Delete</button></div>}</div></div>}</section>}
    {tab === 'typography' && <section className="style-section"><h3>Typography</h3><button type="button" className="style-font-choice" onClick={() => onOpenFonts({ label: 'Heading font', current: theme.typography.heading.family, scope: 'heading' })}><span>Heading</span><strong style={{ fontFamily: `"${theme.typography.heading.family}", sans-serif` }}>{theme.typography.heading.family}</strong></button><button type="button" className="style-font-choice" onClick={() => onOpenFonts({ label: 'Body font', current: theme.typography.body.family, scope: 'body' })}><span>Body</span><strong style={{ fontFamily: `"${theme.typography.body.family}", sans-serif` }}>{theme.typography.body.family}</strong></button></section>}
    {tab === 'spacing' && <section className="style-section"><h3>Spacing scale</h3>{(showAllSpacing ? theme.spacing : theme.spacing.slice(0, 2)).map((item) => <NumberField key={item.id} label={item.name} value={item.value} onChange={(value) => updateTheme((next) => { const token = next.spacing.find((entry) => entry.id === item.id); if (token) token.value = value })} />)}{theme.spacing.length > 2 && <button type="button" className="small-action" onClick={() => setShowAllSpacing((value) => !value)}>{showAllSpacing ? 'Show less' : `Show all (${theme.spacing.length - 2} more)`}</button>}</section>}
    {tab === 'corners' && <section className="style-section"><h3>Corners</h3><div className="radius-examples">{(showAllCorners ? theme.radius : theme.radius.slice(0, 2)).map((item) => <label key={item.id}><i style={{ borderRadius: item.value }} /><span>{item.name}</span><input type="number" value={item.value} onChange={(event) => updateTheme((next) => { const token = next.radius.find((entry) => entry.id === item.id); if (token) token.value = Number(event.target.value) })} /></label>)}</div>{theme.radius.length > 2 && <button type="button" className="small-action" onClick={() => setShowAllCorners((value) => !value)}>{showAllCorners ? 'Show less' : `Show all (${theme.radius.length - 2} more)`}</button>}</section>}
    {tab === 'buttons' && <section className="style-section"><h3>Primary button</h3><button type="button" className="style-font-choice" onClick={() => onOpenFonts({ label: 'Button font', current: theme.button.font.family, scope: 'button' })}><span>Font</span><strong>{theme.button.font.family}</strong></button><NumberField label="Weight" value={theme.button.font.weight} onChange={(value) => updateTheme((next) => { next.button.font.weight = value })} /><div className="property-pair"><NumberField label="Padding x" value={theme.button.paddingX} onChange={(value) => updateTheme((next) => { next.button.paddingX = value })} /><NumberField label="Padding y" value={theme.button.paddingY} onChange={(value) => updateTheme((next) => { next.button.paddingY = value })} /></div><TokenColor label="Background" value={theme.button.background} onChange={(background) => updateTheme((next) => { next.button.background = background })} /><TokenColor label="Text color" value={theme.button.textColor} onChange={(textColor) => updateTheme((next) => { next.button.textColor = textColor })} /><div className="property-pair"><label className="property-field"><span>Border style</span><select value={theme.button.borderStyle} onChange={(event) => updateTheme((next) => { next.button.borderStyle = event.target.value as typeof next.button.borderStyle })}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label><NumberField label="Border width" value={theme.button.borderWidth} onChange={(value) => updateTheme((next) => { next.button.borderWidth = value })} /></div><TokenColor label="Border color" value={theme.button.borderColor} onChange={(borderColor) => updateTheme((next) => { next.button.borderColor = borderColor })} /><label className="property-field"><span>Radius token</span><select value={typeof theme.button.radius === 'object' && theme.button.radius.type === 'token' ? theme.button.radius.token.replace('radius.', '') : 'custom'} onChange={(event) => updateTheme((next) => { next.button.radius = event.target.value === 'custom' ? literal(999) : { type: 'token', token: `radius.${event.target.value}` } })}><option value="custom">Custom pill</option>{theme.radius.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><ShadowEditor value={theme.button.shadows} onChange={(shadows) => updateTheme((next) => { next.button.shadows = shadows })} /><button className="button-style-preview" type="button" style={{ background: String(theme.colors.find((item) => item.id === 'primary')?.value), borderRadius: theme.radius.find((item) => item.id === 'pill')?.value }}>Button preview</button></section>}
  </div></aside>
}
