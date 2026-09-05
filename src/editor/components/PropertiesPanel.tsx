import { ChevronDown, ChevronUp, Link2, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { elementLabel } from '../model/elements'
import { isLayout, type ElementStyleValue } from '../model/types'
import { resolveStyleValue } from '../theme/projectTheme'
import { resolveResponsiveStyles, styleSource } from '../responsive/responsiveStyles'
import type { FontPickerTarget } from './FontPicker'
import { SurfaceControls, TokenColor } from './SurfaceControls'
import { TypographyControls } from './TypographyControls'
import { useEditorStore } from '../store/editorStore'

const Field = ({ label, value, type = 'text', override, onChange }: { label: string; value: string | number; type?: 'text' | 'number'; override?: boolean; onChange: (value: string | number) => void }) => {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)
  const display = focused ? draft : String(value)
  return <label className="property-field"><span>{label}{override && <span className="override-dot" />}</span><input type={type} value={display} onFocus={() => { setDraft(String(value)); setFocused(true) }} onChange={(event) => setDraft(event.target.value)} onBlur={() => { setFocused(false); onChange(type === 'number' ? Number(draft) : draft) }} onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur() }} /></label>
}

const Select = ({ label, value, options, override, onChange }: { label: string; value: string | number; options: { value: string; label: string }[]; override?: boolean; onChange: (value: string) => void }) => <label className="property-field"><span>{label}{override && <span className="override-dot" />}</span><select value={String(value)} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>

const Spacing = ({ id, mode }: { id: string; mode: 'padding' | 'margin' }) => {
  const { project, updateStyles, viewport } = useEditorStore()
  const [linked, setLinked] = useState(false)
  const [showAll, setShowAll] = useState(false)
  if (!project) return null
  const element = project.document.elements[id]
  const styles = resolveResponsiveStyles(element.styles, element.responsive, viewport)
  const labels = ['Top', 'Right', 'Bottom', 'Left']
  const presets: [string, number][] = [['None', 0], ['S', 8], ['M', 16], ['L', 32], ['XL', 64]]
  const visiblePresets = showAll ? presets : presets.slice(2, 4)
  const set = (side: string, value: number) => linked ? updateStyles(id, Object.fromEntries(labels.map((name) => [`${mode}${name}`, value]))) : updateStyles(id, { [`${mode}${side}`]: value })
  return <section className="property-section"><div className="property-section-title"><h3>{mode === 'padding' ? 'Padding' : 'Margin'}</h3><button type="button" className={linked ? 'link-values is-linked' : 'link-values'} onClick={() => setLinked(!linked)} aria-label="Link spacing values" title="Link spacing values"><Link2 size={14} /></button></div><div className="spacing-presets">{visiblePresets.map(([label, amount]) => <button type="button" key={label} onClick={() => updateStyles(id, Object.fromEntries(labels.map((side) => [`${mode}${side}`, amount as number])))}>{label}</button>)}<button type="button" className="small-action" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Less' : 'Show all'}</button></div><div className="spacing-grid">{labels.map((side) => <Field key={side} label={side} type="number" value={Number(resolveStyleValue(styles[`${mode}${side}`] as never, project.theme, 0))} override={viewport !== 'desktop' && element.responsive?.[viewport as 'tablet' | 'mobile']?.[`${mode}${side}`] !== undefined} onChange={(value) => set(side, Number(value))} />)}</div></section>
}

export const PropertiesPanel = ({ onOpenFonts }: { onOpenFonts: (target: FontPickerTarget & { scope: 'local'; elementId: string }) => void }) => {
  const { project, selectedId, select, updateElement, updateProps, updateStyles, resetStyle, setVisibility, viewport } = useEditorStore()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const element = selectedId ? project?.document.elements[selectedId] : null
  if (!element || !project || !selectedId) return <aside className="editor-panel properties-panel"><div className="panel-heading"><p>Inspector</p><h2>Properties</h2></div><div className="unified-empty"><SlidersHorizontal size={28} /><p>Select an element to edit its properties</p></div></aside>
  const styles = resolveResponsiveStyles(element.styles, element.responsive, viewport)
  const update = (values: Record<string, ElementStyleValue>, record = true) => updateStyles(selectedId, values, record)
  const colorKey = element.type === 'button' ? 'textColor' : 'color'
  const source = (key: string) => styleSource(element.responsive, key, viewport)
  const hasOverride = (key: string) => viewport !== 'desktop' && element.responsive?.[viewport as 'tablet' | 'mobile']?.[key] !== undefined
  return <aside className="editor-panel properties-panel"><div className="panel-heading"><p>Inspector <span className="responsive-mode-label">{viewport}{hasOverride('fontSize') && <span className="override-dot" />}</span></p><h2>{elementLabel(element)}</h2><button type="button" className="properties-close" aria-label="Close inspector" title="Close inspector" onClick={() => select(null)}><X size={15} /></button></div><div className="property-scroll">
    {['heading', 'text', 'button'].includes(element.type) && <section className="property-section"><h3>Content</h3><Field label={element.type === 'button' ? 'Text' : 'Copy'} value={element.content ?? ''} onChange={(content) => updateElement(selectedId, { content: String(content) })} /></section>}
    {['heading', 'text', 'button'].includes(element.type) && <TypographyControls element={{ ...element, styles }} onUpdate={update} onReset={(key) => resetStyle(selectedId, key)} onOpenFonts={onOpenFonts} />}
    {['heading', 'text', 'button'].includes(element.type) && <section className="property-section"><TokenColor label="Text color" value={styles[colorKey]} onChange={(color) => update({ [colorKey]: color })} /></section>}
    {element.type === 'button' && <section className="property-section"><h3>Button</h3><Field label="Link" value={String(element.props.link ?? '#')} onChange={(value) => updateProps(selectedId, { link: String(value) })} /><TokenColor label="Background" value={styles.background} onChange={(background) => update({ background, backgroundMode: 'solid' })} /><div className="property-pair"><Field label="Padding x" type="number" value={Number(resolveStyleValue(styles.paddingX as never, project.theme, project.theme.button.paddingX))} override={hasOverride('paddingX')} onChange={(value) => update({ paddingX: Number(value) })} /><Field label="Padding y" type="number" value={Number(resolveStyleValue(styles.paddingY as never, project.theme, project.theme.button.paddingY))} override={hasOverride('paddingY')} onChange={(value) => update({ paddingY: Number(value) })} /></div></section>}
    {element.type === 'image' && <section className="property-section"><h3>Image</h3><Field label="Source" value={String(element.props.src ?? '')} onChange={(value) => updateProps(selectedId, { src: String(value) })} /><Field label="Alt text" value={String(element.props.alt ?? '')} onChange={(value) => updateProps(selectedId, { alt: String(value) })} /><label className="toggle-field"><span>Decorative image</span><input type="checkbox" checked={Boolean(element.props.decorative)} onChange={(event) => updateProps(selectedId, { decorative: event.target.checked })} /></label><div className="property-pair"><Field label="Width" value={String(resolveStyleValue(styles.width as never, project.theme, '100%'))} override={hasOverride('width')} onChange={(value) => update({ width: String(value) })} /><Field label="Height" type="number" value={Number(resolveStyleValue(styles.height as never, project.theme, 320))} override={hasOverride('height')} onChange={(value) => update({ height: Number(value) })} /></div><Select label="Fit" value={String(element.props.fit ?? 'cover')} options={['cover', 'contain', 'fill'].map((value) => ({ value, label: value }))} onChange={(fit) => updateProps(selectedId, { fit })} /></section>}
    {element.type === 'divider' && <section className="property-section"><h3>Divider</h3><Field label="Thickness" type="number" value={Number(resolveStyleValue(styles.thickness as never, project.theme, 1))} override={hasOverride('thickness')} onChange={(value) => update({ thickness: Number(value) })} /><TokenColor label="Color" value={styles.color} onChange={(color) => update({ color })} /></section>}
    {element.type === 'spacer' && <section className="property-section"><h3>Spacer</h3><Field label="Height" type="number" value={Number(resolveStyleValue(styles.height as never, project.theme, 48))} override={hasOverride('height')} onChange={(value) => update({ height: Number(value) })} /></section>}
    {isLayout(element.type) && <section className="property-section"><h3>Layout</h3><Select label="Direction" value={String(resolveStyleValue(styles.direction as never, project.theme, 'column'))} override={hasOverride('direction')} options={[{ value: 'row', label: 'Row' }, { value: 'column', label: 'Stack' }]} onChange={(direction) => update({ direction })} /><div className="property-pair"><Select label="Align" value={String(resolveStyleValue(styles.align as never, project.theme, 'stretch'))} override={hasOverride('align')} options={['start', 'center', 'end', 'stretch'].map((value) => ({ value, label: value }))} onChange={(align) => update({ align })} /><Select label="Justify" value={String(resolveStyleValue(styles.justify as never, project.theme, 'start'))} override={hasOverride('justify')} options={['start', 'center', 'end', 'between'].map((value) => ({ value, label: value }))} onChange={(justify) => update({ justify })} /></div><Field label="Gap" type="number" value={Number(resolveStyleValue(styles.gap as never, project.theme, 16))} override={hasOverride('gap')} onChange={(value) => update({ gap: Number(value) })} /><label className="toggle-field"><span>Wrap</span><input type="checkbox" checked={Boolean(styles.wrap)} onChange={(event) => update({ wrap: event.target.checked })} /></label></section>}
    <section className="property-section"><h3>Visibility</h3><label className="toggle-field"><span>Show on {viewport}</span><input type="checkbox" checked={(() => { if (viewport === 'desktop') return element.visibility?.desktop ?? true; if (viewport === 'tablet') return element.visibility?.tablet ?? element.visibility?.desktop ?? true; return element.visibility?.mobile ?? element.visibility?.tablet ?? element.visibility?.desktop ?? true })()} onChange={(event) => setVisibility(selectedId, event.target.checked)} /></label></section>
    {viewport !== 'desktop' && <section className="property-section responsive-note"><p>Changes here apply to {viewport}. Values without a local change follow the larger layout.</p><button type="button" className="small-action" onClick={() => resetStyle(selectedId, 'fontSize')}>Reset font size to {source('fontSize')}</button></section>}
    {isLayout(element.type) && <Spacing id={selectedId} mode="padding" />}
    <Spacing id={selectedId} mode="margin" />
    <section className="advanced-section"><button type="button" className="advanced-toggle" onClick={() => setAdvancedOpen((value) => !value)}><span>Advanced</span>{advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>{advancedOpen && <div className="advanced-content">{['section', 'container', 'button', 'image'].includes(element.type) && <SurfaceControls element={element} onUpdate={update} />}</div>}</section>
  </div></aside>
}
