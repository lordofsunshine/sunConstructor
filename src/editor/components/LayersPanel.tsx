import { ChevronDown, ChevronRight, Copy, Eye, EyeOff, GripVertical, Home, Lock, LockKeyholeOpen, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import { elementLabel } from '../model/elements'
import { isLayout } from '../model/types'
import { useEditorStore } from '../store/editorStore'

interface LayersPanelProps {
  onMenu: (id: string, point: { x: number; y: number }) => void
}

type Filter = 'all' | 'visible' | 'locked'

const LayerRow = ({ id, depth, collapsed, onToggle, filter, onMenu }: { id: string; depth: number; collapsed: Set<string>; onToggle: (id: string) => void; filter: Filter; onMenu: LayersPanelProps['onMenu'] }) => {
  const { project, selectedId, select, updateElement, toggleHidden, toggleLocked } = useEditorStore()
  const [editing, setEditing] = useState(false)
  const element = project?.document.elements[id]
  const drag = useDraggable({ id: `node:${id}`, disabled: Boolean(element?.props.locked) })
  const before = useDroppable({ id: `layer:${id}:before` })
  const after = useDroppable({ id: `layer:${id}:after` })
  const inside = useDroppable({ id: `layer:${id}:inside`, disabled: !element || !isLayout(element.type) })
  useEffect(() => {
    const rename = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) setEditing(true)
    }
    window.addEventListener('sunconstructor:rename', rename)
    return () => window.removeEventListener('sunconstructor:rename', rename)
  }, [id])
  if (!element) return null
  if (filter === 'visible' && element.props.hidden) return null
  if (filter === 'locked' && !element.props.locked) return null
  const isCollapsed = collapsed.has(id)
  const hasChildren = element.children.length > 0
  const style = drag.transform ? { transform: `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)` } : undefined
  const setRowRef = (node: HTMLDivElement | null) => {
    drag.setNodeRef(node)
    inside.setNodeRef(node)
  }
  return <div className="layer-drop">
    <div ref={before.setNodeRef} className={before.isOver ? 'layer-insert is-over' : 'layer-insert'} />
    <div ref={setRowRef} style={style} className={selectedId === id ? 'layer-row is-selected' : inside.isOver ? 'layer-row is-inside' : 'layer-row'} onClick={() => select(id)} onContextMenu={(event) => { event.preventDefault(); onMenu(id, { x: event.clientX, y: event.clientY }) }}>
      <span className="layer-main" {...drag.attributes} {...drag.listeners}><span className="layer-grip" aria-hidden="true"><GripVertical size={13} /></span>
        <span className="layer-indent" style={{ width: depth * 10 }} />
        {hasChildren && <button className="layer-toggle" type="button" aria-label={isCollapsed ? 'Expand' : 'Collapse'} title={isCollapsed ? 'Expand' : 'Collapse'} onClick={(event) => { event.stopPropagation(); onToggle(id) }}>{isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}</button>}
        {!hasChildren && <span style={{ width: 16 }} />}
        {editing ? <input data-layer-name={id} className="layer-name-input" value={element.name ?? ''} onClick={(event) => event.stopPropagation()} onChange={(event) => updateElement(id, { name: event.target.value })} onBlur={() => setEditing(false)} onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur() }} /> : <button className="layer-name" type="button" onDoubleClick={() => setEditing(true)}>{elementLabel(element)}</button>}
      </span>
      <button className="layer-action" type="button" aria-label="Toggle visibility" title="Toggle visibility" onClick={(event) => { event.stopPropagation(); toggleHidden(id) }}>{element.props.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
      <button className="layer-action" type="button" aria-label="Toggle lock" title="Toggle lock" onClick={(event) => { event.stopPropagation(); toggleLocked(id) }}>{element.props.locked ? <Lock size={13} /> : <LockKeyholeOpen size={13} />}</button>
      <button className="layer-action" type="button" aria-label="Layer menu" title="Layer menu" onClick={(event) => { event.stopPropagation(); onMenu(id, { x: event.clientX, y: event.clientY }) }}><MoreHorizontal size={13} /></button>
    </div>
    <div ref={after.setNodeRef} className={after.isOver ? 'layer-insert is-over' : 'layer-insert'} />
    {!isCollapsed && element.children.map((childId) => <LayerRow key={childId} id={childId} depth={depth + 1} collapsed={collapsed} onToggle={onToggle} filter={filter} onMenu={onMenu} />)}
  </div>
}

export const LayersPanel = ({ onMenu }: LayersPanelProps) => {
  const { project, assets, selectedId, deleteElement, addPage, selectPage, duplicatePage, deletePage, updatePage, updateProject } = useEditorStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [pageName, setPageName] = useState('About')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const active = project?.pages.find((page) => page.id === project?.activePageId)
  const toggle = (id: string) => setCollapsed((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  useEffect(() => {
    if (!project) return
    const timer = window.setTimeout(() => {
      const toCollapse = project.document.rootIds.filter((id) => {
        const el = project.document.elements[id]
        return el && el.children.length > 4
      })
      if (toCollapse.length) setCollapsed(new Set(toCollapse))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [project])
  const visibleRootIds = useMemo(() => {
    if (!project) return []
    if (filter === 'all') return project.document.rootIds
    return project.document.rootIds.filter((id) => {
      const el = project.document.elements[id]
      if (!el) return false
      if (filter === 'visible') return !el.props.hidden
      if (filter === 'locked') return Boolean(el.props.locked)
      return true
    })
  }, [project, filter])
  if (!project) return null
  return <aside className="editor-panel layers-panel"><div className="panel-heading"><p>Structure</p><h2>Pages & Layers</h2></div>
    <div className="pages-compact">
      <div className="pages-list">{project.pages.map((page) => <article className={page.id === project.activePageId ? 'page-row is-active' : 'page-row'} key={page.id}><button type="button" onClick={() => selectPage(page.id)}><span>{page.slug === '/' ? <Home size={12} /> : null}</span><strong>{page.name}</strong><small>{page.slug}</small></button><div><button type="button" aria-label={`Duplicate ${page.name}`} title={`Duplicate ${page.name}`} onClick={() => duplicatePage(page.id)}><Copy size={11} /></button><button type="button" aria-label={`Delete ${page.name}`} title={`Delete ${page.name}`} disabled={project.pages.length === 1} onClick={() => deletePage(page.id)}><Trash2 size={11} /></button></div></article>)}</div>
      <form className="page-create compact" onSubmit={(event) => { event.preventDefault(); if (pageName.trim()) { addPage(pageName); setPageName('About') } }}><input value={pageName} onChange={(event) => setPageName(event.target.value)} placeholder="New page" /><button type="submit" className="small-action"><Plus size={12} /> Add</button></form>
      {active && <div className="page-settings compact"><label>Slug<input value={active.slug} onChange={(event) => updatePage(active.id, { slug: event.target.value })} /></label><label>Title<input value={active.title} onChange={(event) => updatePage(active.id, { title: event.target.value })} /></label></div>}
      <div className="page-settings compact site-settings"><label>Language<select value={project.settings.language} onChange={(event) => updateProject((next) => { next.settings.language = event.target.value })}><option value="en">English</option><option value="ru">Russian</option><option value="de">German</option><option value="fr">French</option></select></label><label>Website address<input placeholder="https://example.com" value={project.settings.siteUrl} onChange={(event) => updateProject((next) => { next.settings.siteUrl = event.target.value })} /></label><label>Favicon<select value={project.settings.faviconAssetId ?? ''} onChange={(event) => updateProject((next) => { next.settings.faviconAssetId = event.target.value || undefined })}><option value="">None</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label></div>
    </div>
    <div className="layer-filter"><button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button><button type="button" className={filter === 'visible' ? 'is-active' : ''} onClick={() => setFilter('visible')}>Visible</button><button type="button" className={filter === 'locked' ? 'is-active' : ''} onClick={() => setFilter('locked')}>Locked</button></div>
    <div className="layers-list">{visibleRootIds.length ? visibleRootIds.map((id) => <LayerRow key={id} id={id} depth={0} collapsed={collapsed} onToggle={toggle} filter={filter} onMenu={onMenu} />) : <p className="empty-panel-copy">No layers for this filter.</p>}</div>
    <button className="layer-delete" type="button" disabled={!selectedId} onClick={() => deleteElement()}><Trash2 size={13} /> Delete selected</button>
  </aside>
}
