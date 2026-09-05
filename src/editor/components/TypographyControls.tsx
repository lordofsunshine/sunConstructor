import { RotateCcw } from 'lucide-react'
import { findFont } from '../fonts/catalog'
import type { ElementStyleValue, SiteElement } from '../model/types'
import { isToken, resolveStyleValue } from '../theme/projectTheme'
import { useEditorStore } from '../store/editorStore'
import type { FontPickerTarget } from './FontPicker'

const options = (values: string[]) => values.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))

const Field = ({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) => <label className="property-field"><span>{label}{value && <small>{value}</small>}</span>{children}</label>

export const TypographyControls = ({ element, onUpdate, onReset, onOpenFonts }: { element: SiteElement; onUpdate: (styles: Record<string, ElementStyleValue>, record?: boolean) => void; onReset: (key: string) => void; onOpenFonts: (target: FontPickerTarget & { scope: 'local'; elementId: string }) => void }) => {
  const { project, beginTransaction, commitTransaction, updateProps } = useEditorStore()
  const theme = project!.theme
  const styles = element.styles
  const fallback = element.type === 'heading' ? theme.typography.heading.family : element.type === 'button' ? theme.button.font.family : theme.typography.body.family
  const family = String(resolveStyleValue(styles.fontFamily as never, theme, fallback))
  const metadata = findFont(family)
  const weight = Number(resolveStyleValue(styles.fontWeight as never, theme, element.type === 'heading' ? 700 : 400))
  const inherited = isToken(styles.fontFamily as never)
  return <section className="property-section"><div className="property-section-title"><h3>Typography</h3>{!inherited && <button type="button" className="reset-style" onClick={() => onReset('fontFamily')}><RotateCcw size={13} /> Reset to global style</button>}</div>
    <button className="font-property-button" type="button" onClick={() => onOpenFonts({ label: 'Font', current: family, scope: 'local', elementId: element.id })}><span>Font</span><strong>{family}</strong><small>{inherited ? (element.type === 'heading' ? 'From Heading style' : element.type === 'text' ? 'From Body style' : 'From Button style') : 'Custom'}</small></button>
    <div className="font-hover-card"><div className="property-pair"><Field label="Weight"><input type="range" min={metadata?.variable ? 100 : Math.min(...(metadata?.weights ?? [400]))} max={metadata?.variable ? 900 : Math.max(...(metadata?.weights ?? [700]))} step={metadata?.variable ? 1 : 100} value={weight} onPointerDown={beginTransaction} onChange={(event) => onUpdate({ fontWeight: Number(event.target.value) }, false)} onPointerUp={commitTransaction} /></Field><Field label="Value"><input type="number" value={weight} min="100" max="900" onChange={(event) => onUpdate({ fontWeight: Number(event.target.value) })} /></Field></div>
    <div className="property-pair"><Field label="Style"><select value={String(resolveStyleValue(styles.fontStyle as never, theme, 'normal'))} onChange={(event) => onUpdate({ fontStyle: event.target.value })}><option value="normal">Regular</option>{metadata?.styles.includes('italic') && <option value="italic">Italic</option>}</select></Field><Field label="Size"><input type="number" value={Number(resolveStyleValue(styles.fontSize as never, theme, element.type === 'heading' ? 52 : 18))} onChange={(event) => onUpdate({ fontSize: Number(event.target.value) })} /></Field></div></div>
    <div className="property-pair"><Field label="Line height"><select value={String(resolveStyleValue(styles.lineHeight as never, theme, 1.5))} onChange={(event) => onUpdate({ lineHeight: event.target.value === 'auto' ? 'auto' : Number(event.target.value) })}><option value="auto">Auto</option><option value="1.0">1.0</option><option value="1.1">1.1</option><option value="1.25">1.25</option><option value="1.5">1.5</option><option value="1.75">1.75</option></select></Field><Field label="Letter spacing"><input type="number" value={Number(resolveStyleValue(styles.letterSpacing as never, theme, 0))} onChange={(event) => onUpdate({ letterSpacing: Number(event.target.value) })} /></Field></div>
    <Field label="Alignment"><select value={String(resolveStyleValue(styles.textAlign as never, theme, 'left'))} onChange={(event) => onUpdate({ textAlign: event.target.value })}>{options(['left', 'center', 'right']).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
    <div className="property-pair"><Field label="Decoration"><select value={String(resolveStyleValue(styles.textDecoration as never, theme, 'none'))} onChange={(event) => onUpdate({ textDecoration: event.target.value })}><option value="none">None</option><option value="underline">Underline</option><option value="line-through">Line through</option></select></Field><Field label="Transform"><select value={String(resolveStyleValue(styles.textTransform as never, theme, 'none'))} onChange={(event) => onUpdate({ textTransform: event.target.value })}><option value="none">Default</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option></select></Field></div>
    {element.type === 'heading' && <Field label="Heading level"><select value={String(element.props.level ?? 'h1')} onChange={(event) => updateProps(element.id, { level: event.target.value })}>{['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((level) => <option value={level} key={level}>{level.toUpperCase()}</option>)}</select></Field>}
  </section>
}
