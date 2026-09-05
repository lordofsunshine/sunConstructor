import { Columns3, Container, Heading1, Image, LayoutPanelLeft, Minus, MousePointer2, Rows3, Search, Space, Text, Type, WrapText } from 'lucide-react'
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
  { type: 'navigation', title: 'Navigation', copy: 'Brand, links and action' }, { type: 'hero', title: 'Hero', copy: 'A first impression with direction' }, { type: 'logoStrip', title: 'Logo strip', copy: 'Names that set the scene' }, { type: 'features', title: 'Features', copy: 'Three compact reasons to care' }, { type: 'services', title: 'Services', copy: 'A clear way to work together' }, { type: 'gallery', title: 'Gallery', copy: 'A simple picture-led grid' }, { type: 'testimonials', title: 'Testimonial', copy: 'A considered point of view' }, { type: 'pricing', title: 'Pricing', copy: 'Support options without noise' }, { type: 'faq', title: 'FAQ', copy: 'Answers worth finding' }, { type: 'cta', title: 'Call to action', copy: 'One deliberate next step' }, { type: 'contact', title: 'Contact', copy: 'A way to begin the conversation' }, { type: 'footer', title: 'Footer', copy: 'A quiet ending for the page' },
]

const DraggableElement = ({ type, label, icon: Icon }: { type: ElementType; label: string; icon: typeof Type }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `library:${type}` })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const addElement = useEditorStore((state) => state.addElement)
  const parentId = useInsertParent()
  return <button ref={setNodeRef} style={style} className="library-element" type="button" onClick={() => addElement(type, type === 'section' ? null : parentId)} {...attributes} {...listeners} data-dragging={isDragging}><span className="library-drag"><Icon size={17} /></span>{label}</button>
}

export const AddPanel = () => {
  const addTemplate = useEditorStore((state) => state.addTemplate)
  const insertReusableSection = useEditorStore((state) => state.insertReusableSection)
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<ReusableSection[]>(listReusableSections)
  const sections = useMemo(() => templates.filter((template) => `${template.title} ${template.copy}`.toLowerCase().includes(query.trim().toLowerCase())), [query])
  useEffect(() => { const refresh = () => setSaved(listReusableSections()); window.addEventListener('sunconstructor:sections', refresh); return () => window.removeEventListener('sunconstructor:sections', refresh) }, [])
  return <aside className="editor-panel add-panel"><div className="panel-heading"><p>Insert</p><h2>Build with blocks</h2></div><div className="library-grid">{elements.map((element) => <DraggableElement key={element.type} {...element} />)}</div>{saved.length > 0 && <><div className="panel-heading panel-heading-template"><p>Your library</p><h2>My sections</h2></div><div className="template-list">{saved.map((section) => <button type="button" className="template-card" key={section.id} onClick={() => insertReusableSection(section)}><strong>{section.name}</strong><span>Reusable section</span></button>)}</div></>}<div className="panel-heading panel-heading-template"><p>Starting points</p><h2>Ready sections</h2></div><label className="section-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sections..." /></label><div className="template-list">{sections.map((template) => <button type="button" className="template-card" key={template.type} onClick={() => addTemplate(template.type)}><strong>{template.title}</strong><span>{template.copy}</span></button>)}</div>{sections.length === 0 && <p className="panel-empty">No sections match that search.</p>}</aside>
}
