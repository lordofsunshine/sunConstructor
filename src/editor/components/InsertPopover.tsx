import { Columns3, Container, Heading1, Image, LayoutPanelLeft, Minus, MousePointer2, Plus, Rows3, Search, Space, Text, Type, WrapText, X } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import type { ElementType, ReusableSection, TemplateType } from '../model/types'
import { useEditorStore } from '../store/editorStore'
import { useInsertParent } from '../hooks/useInsertParent'
import { listReusableSections } from '../storage/sectionLibrary'

const elements: { type: ElementType; label: string; icon: typeof Type }[] = [
  { type: 'section', label: 'Section', icon: LayoutPanelLeft }, { type: 'container', label: 'Container', icon: Container }, { type: 'heading', label: 'Heading', icon: Heading1 }, { type: 'text', label: 'Text', icon: Text }, { type: 'button', label: 'Button', icon: MousePointer2 }, { type: 'image', label: 'Image', icon: Image }, { type: 'divider', label: 'Divider', icon: Minus }, { type: 'spacer', label: 'Spacer', icon: Space }, { type: 'row', label: 'Row', icon: Rows3 }, { type: 'stack', label: 'Stack', icon: WrapText }, { type: 'columns', label: 'Columns', icon: Columns3 },
]

const templates: { type: TemplateType; title: string; copy: string }[] = [
  { type: 'navigation', title: 'Navigation', copy: 'Brand, links and action' }, { type: 'hero', title: 'Hero', copy: 'A first impression' }, { type: 'logoStrip', title: 'Logo strip', copy: 'Names that set the scene' }, { type: 'features', title: 'Features', copy: 'Three reasons to care' }, { type: 'services', title: 'Services', copy: 'How you work' }, { type: 'gallery', title: 'Gallery', copy: 'Picture-led grid' }, { type: 'testimonials', title: 'Testimonial', copy: 'A point of view' }, { type: 'pricing', title: 'Pricing', copy: 'Support options' }, { type: 'faq', title: 'FAQ', copy: 'Answers' }, { type: 'cta', title: 'Call to action', copy: 'Next step' }, { type: 'contact', title: 'Contact', copy: 'Start a conversation' }, { type: 'footer', title: 'Footer', copy: 'Quiet ending' },
]

const DraggableElement = ({ type, label, icon: Icon, onAdd }: { type: ElementType; label: string; icon: typeof Type; onAdd: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `library:${type}` })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const addElement = useEditorStore((state) => state.addElement)
  const parentId = useInsertParent()
  return <button ref={setNodeRef} style={style} className="popover-element" type="button" onClick={() => { addElement(type, type === 'section' ? null : parentId); onAdd() }} {...attributes} {...listeners} data-dragging={isDragging}><span><Icon size={15} /></span>{label}</button>
}

export const InsertPopover = ({ onClose }: { onClose: () => void }) => {
  const addTemplate = useEditorStore((state) => state.addTemplate)
  const insertReusableSection = useEditorStore((state) => state.insertReusableSection)
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<ReusableSection[]>(listReusableSections)
  const sections = useMemo(() => templates.filter((template) => `${template.title} ${template.copy}`.toLowerCase().includes(query.trim().toLowerCase())), [query])
  useEffect(() => { const refresh = () => setSaved(listReusableSections()); window.addEventListener('sunconstructor:sections', refresh); return () => window.removeEventListener('sunconstructor:sections', refresh) }, [])
  return <div className="insert-popover-backdrop" role="presentation" onClick={onClose}><div className="insert-popover" role="dialog" aria-label="Insert blocks" onClick={(event) => event.stopPropagation()}>
    <header><strong>Insert</strong><button type="button" aria-label="Close" title="Close" onClick={onClose}><X size={14} /></button></header>
    <div className="popover-grid">{elements.map((element) => <DraggableElement key={element.type} {...element} onAdd={onClose} />)}</div>
    {saved.length > 0 && <><div className="popover-section-title">My sections</div><div className="popover-templates">{saved.map((section) => <button type="button" key={section.id} onClick={() => { insertReusableSection(section); onClose() }}>{section.name}</button>)}</div></>}
    <label className="popover-search"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sections..." /></label>
    <div className="popover-templates">{sections.map((template) => <button type="button" key={template.type} onClick={() => { addTemplate(template.type); onClose() }}><strong>{template.title}</strong><span>{template.copy}</span></button>)}</div>
    <button type="button" className="popover-hint" onClick={onClose}><Plus size={12} /> Press / to insert quickly</button>
  </div></div>
}

export const CanvasInsertButton = ({ onOpen }: { onOpen: () => void }) => <button type="button" className="canvas-insert" aria-label="Insert block" title="Insert block" onClick={onOpen}><Plus size={16} /></button>
