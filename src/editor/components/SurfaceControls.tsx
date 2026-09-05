import { Link2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ColorPicker } from './ColorPicker'
import type { ElementStyleValue, SiteElement } from '../model/types'
import { isGradient, isToken, resolveStyleValue } from '../theme/projectTheme'
import { literal, type Gradient, type ProjectTheme, type Shadow, type StyleValue, token } from '../theme/types'
import { randomId } from '../model/ids'
import { useEditorStore } from '../store/editorStore'

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="property-field"><span>{label}</span>{children}</label>

const colorValue = (value: ElementStyleValue | undefined, fallback: string, theme: ProjectTheme) => String(resolveStyleValue((Array.isArray(value) ? undefined : value) as StyleValue | undefined, theme, fallback))

export const TokenColor = ({ label, value, onChange, opacity, onOpacity }: { label: string; value: ElementStyleValue | undefined; onChange: (value: StyleValue) => void; opacity?: number; onOpacity?: (value: number) => void }) => {
  const project = useEditorStore((state) => state.project)
  if (!project) return null
  const candidate = Array.isArray(value) ? undefined : value as StyleValue | undefined
  const current = isToken(candidate) ? candidate.token.replace('colors.', '') : 'custom'
  return <div className="token-color"><Field label={label}><select value={current} onChange={(event) => onChange(event.target.value === 'custom' ? literal(colorValue(value, '#171717', project.theme)) : token(`colors.${event.target.value}`))}><option value="custom">Custom</option>{project.theme.colors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>{current === 'custom' && <ColorPicker label="Color" value={colorValue(value, '#171717', project.theme)} opacity={opacity} onOpacity={onOpacity} projectColors={project.theme.colors} onChange={(next) => onChange(literal(next))} />}</div>
}

const createGradient = (): Gradient => ({ type: 'gradient', kind: 'linear', angle: 135, stops: [{ id: randomId(), color: literal('#fff2b0'), position: 0 }, { id: randomId(), color: literal('#ffb84a'), position: 100 }] })

export const GradientEditor = ({ value, onChange }: { value: ElementStyleValue | undefined; onChange: (value: Gradient) => void }) => {
  const project = useEditorStore((state) => state.project)
  if (!project) return null
  const candidate = Array.isArray(value) ? undefined : value as StyleValue | undefined
  const gradient: Gradient = isGradient(candidate) ? candidate : createGradient()
  const update = (next: Gradient) => onChange(next)
  const updateStop = (id: string, patch: Partial<Gradient['stops'][number]>) => update({ ...gradient, stops: gradient.stops.map((stop) => stop.id === id ? { ...stop, ...patch } : stop) })
  return <section className="property-section gradient-editor"><div className="property-section-title"><h3>Gradient</h3><button type="button" className="small-action" onClick={() => update(createGradient())}>Reset</button></div><div className="gradient-preview" style={{ background: String(resolveStyleValue(gradient, project.theme, '#fff2b0')) }} /><div className="property-pair"><Field label="Type"><select value={gradient.kind} onChange={(event) => update({ ...gradient, kind: event.target.value as Gradient['kind'] })}><option value="linear">Linear</option><option value="radial">Radial</option></select></Field>{gradient.kind === 'linear' && <Field label="Angle"><input type="range" min="0" max="360" value={gradient.angle} onPointerDown={() => useEditorStore.getState().beginTransaction()} onChange={(event) => update({ ...gradient, angle: Number(event.target.value) })} onPointerUp={() => useEditorStore.getState().commitTransaction()} /></Field>}</div><div className="gradient-stops">{gradient.stops.map((stop) => <div key={stop.id} className="gradient-stop"><ColorPicker label={`${stop.position}%`} value={colorValue(stop.color, '#ffffff', project.theme)} projectColors={project.theme.colors} onChange={(color) => updateStop(stop.id, { color: literal(color) })} /><input aria-label="Stop position" type="range" min="0" max="100" value={stop.position} onChange={(event) => updateStop(stop.id, { position: Number(event.target.value) })} /><button type="button" aria-label="Remove color stop" title="Remove color stop" disabled={gradient.stops.length <= 2} onClick={() => update({ ...gradient, stops: gradient.stops.filter((item) => item.id !== stop.id) })}><Trash2 size={14} /></button></div>)}</div><button className="small-action" type="button" onClick={() => update({ ...gradient, stops: [...gradient.stops, { id: randomId(), color: literal('#ffffff'), position: 50 }].sort((a, b) => a.position - b.position) })}><Plus size={14} /> Add stop</button></section>
}

const shadowPresets: Record<string, Omit<Shadow, 'id'>> = {
  Soft: { x: 0, y: 12, blur: 32, spread: 0, color: literal('#171717'), opacity: 12, inset: false },
  Floating: { x: 0, y: 18, blur: 42, spread: -8, color: literal('#171717'), opacity: 18, inset: false },
  Sharp: { x: 7, y: 7, blur: 0, spread: 0, color: literal('#171717'), opacity: 28, inset: false },
  Subtle: { x: 0, y: 2, blur: 8, spread: 0, color: literal('#171717'), opacity: 10, inset: false },
}

export const ShadowEditor = ({ value, onChange }: { value: ElementStyleValue | undefined; onChange: (value: Shadow[]) => void }) => {
  const project = useEditorStore((state) => state.project)
  if (!project) return null
  const items = Array.isArray(value) ? value as Shadow[] : []
  const update = (id: string, patch: Partial<Shadow>) => onChange(items.map((item) => item.id === id ? { ...item, ...patch } : item))
  return <section className="property-section"><div className="property-section-title"><h3>Shadows</h3><button type="button" className="small-action" onClick={() => onChange([...items, { id: randomId(), ...shadowPresets.Soft }])}><Plus size={14} /> Add</button></div><div className="shadow-presets">{Object.keys(shadowPresets).map((name) => <button key={name} type="button" onClick={() => onChange([{ id: randomId(), ...shadowPresets[name] }])}>{name}</button>)}</div>{items.map((item) => <div className="shadow-card" key={item.id}><div className="property-pair">{(['x', 'y', 'blur', 'spread'] as const).map((key) => <Field label={key.toUpperCase()} key={key}><input type="number" value={item[key]} onChange={(event) => update(item.id, { [key]: Number(event.target.value) })} /></Field>)}</div><TokenColor label="Color" value={item.color} opacity={item.opacity} onOpacity={(opacity) => update(item.id, { opacity })} onChange={(color) => update(item.id, { color })} /><label className="toggle-field"><span>Inset</span><input type="checkbox" checked={item.inset} onChange={(event) => update(item.id, { inset: event.target.checked })} /></label><button className="inline-danger" type="button" onClick={() => onChange(items.filter((shadow) => shadow.id !== item.id))}><Trash2 size={13} /> Remove</button></div>)}</section>
}

export const SurfaceControls = ({ element, onUpdate }: { element: SiteElement; onUpdate: (styles: Record<string, ElementStyleValue>, record?: boolean) => void }) => {
  const project = useEditorStore((state) => state.project)
  const [linked, setLinked] = useState(true)
  if (!project) return null
  const styles = element.styles
  const setRadius = (corner: string, value: number) => linked ? onUpdate({ radius: value, radiusTopLeft: value, radiusTopRight: value, radiusBottomRight: value, radiusBottomLeft: value }) : onUpdate({ [`radius${corner}`]: value })
  const backgroundMode = String(resolveStyleValue(styles.backgroundMode as StyleValue | undefined, project.theme, 'solid'))
  const isSurface = ['section', 'container', 'button'].includes(element.type)
  return <>{isSurface && <section className="property-section"><h3>Background</h3><Field label="Type"><select value={backgroundMode} onChange={(event) => onUpdate({ backgroundMode: event.target.value })}><option value="solid">Solid color</option><option value="gradient">Gradient</option><option value="image">Image</option></select></Field>{backgroundMode === 'solid' && <TokenColor label="Color" value={styles.background} onChange={(background) => onUpdate({ background })} />}{backgroundMode === 'gradient' && <GradientEditor value={styles.background} onChange={(background) => onUpdate({ background })} />}{backgroundMode === 'image' && <Field label="Image source"><input value={typeof styles.backgroundImage === 'string' ? styles.backgroundImage : ''} onChange={(event) => onUpdate({ backgroundImage: event.target.value })} placeholder="https://" /></Field>}</section>}
    <section className="property-section"><h3>Border</h3><div className="property-pair"><Field label="Style"><select value={String(resolveStyleValue(styles.borderStyle as StyleValue | undefined, project.theme, 'none'))} onChange={(event) => onUpdate({ borderStyle: event.target.value })}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></Field><Field label="Width"><input type="number" min="0" value={Number(resolveStyleValue(styles.borderWidth as StyleValue | undefined, project.theme, 0))} onChange={(event) => onUpdate({ borderWidth: Number(event.target.value) })} /></Field></div><TokenColor label="Color" value={styles.borderColor} onChange={(borderColor) => onUpdate({ borderColor })} /></section>
    <section className="property-section"><div className="property-section-title"><h3>Border radius</h3><button type="button" className={linked ? 'link-values is-linked' : 'link-values'} onClick={() => setLinked(!linked)} aria-label="Link corner values" title="Link corner values"><Link2 size={14} /></button></div><Field label="All corners"><input type="number" value={Number(resolveStyleValue(styles.radius as StyleValue | undefined, project.theme, 0))} onChange={(event) => setRadius('', Number(event.target.value))} /></Field>{!linked && <div className="property-pair">{[['TopLeft', 'Top left'], ['TopRight', 'Top right'], ['BottomRight', 'Bottom right'], ['BottomLeft', 'Bottom left']].map(([key, label]) => <Field label={label} key={key}><input type="number" value={Number(resolveStyleValue(styles[`radius${key}`] as StyleValue | undefined, project.theme, 0))} onChange={(event) => setRadius(key, Number(event.target.value))} /></Field>)}</div>}</section>
    <ShadowEditor value={styles.shadows} onChange={(shadows) => onUpdate({ shadows })} />
    <section className="property-section"><h3>Effects</h3><Field label="Opacity"><input type="range" min="0" max="100" value={Number(resolveStyleValue(styles.opacity as StyleValue | undefined, project.theme, 100))} onPointerDown={() => useEditorStore.getState().beginTransaction()} onChange={(event) => onUpdate({ opacity: Number(event.target.value) }, false)} onPointerUp={() => useEditorStore.getState().commitTransaction()} /></Field><Field label="Blur"><input type="range" min="0" max="40" value={Number(resolveStyleValue(styles.blur as StyleValue | undefined, project.theme, 0))} onPointerDown={() => useEditorStore.getState().beginTransaction()} onChange={(event) => onUpdate({ blur: Number(event.target.value) }, false)} onPointerUp={() => useEditorStore.getState().commitTransaction()} /></Field></section>
  </>
}
