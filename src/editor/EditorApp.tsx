import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { ArrowLeft, Box, Monitor, Smartphone, Tablet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AddPanel } from './components/AddPanel'
import { AssetsStrip } from './components/AssetsStrip'
import { Canvas } from './components/Canvas'
import { InsertPopover } from './components/InsertPopover'
import { ContextMenu, type MenuState } from './components/ContextMenu'
import { EditorToolbar } from './components/EditorToolbar'
import { ExportDialog } from './components/ExportDialog'
import { FontPicker, type FontPickerTarget } from './components/FontPicker'
import { LayersPanel } from './components/LayersPanel'
import { ProjectDashboard } from './components/ProjectDashboard'
import { PropertiesPanel } from './components/PropertiesPanel'
import { StylesPanel } from './components/StylesPanel'
import { SiteCheckPanel } from './components/SiteCheckPanel'
import { CommandPalette } from './components/CommandPalette'
import { EditorErrorBoundary } from './components/EditorErrorBoundary'
import { ToolRail } from './components/ToolRail'
import { useEditorShortcuts } from './hooks/useEditorShortcuts'
import { useBooted } from './hooks/useBooted'
import { findParent, isInside } from './model/tree'
import { isLayout, type ElementType } from './model/types'
import { preloadFont } from './fonts/fontLoader'
import { usedFonts } from './theme/themeUsage'
import { literal } from './theme/types'
import { useEditorStore } from './store/editorStore'
import './editor.css'
import './workspace.css'

const dropTarget = (id: string) => {
  const parts = id.split(':')
  if (parts[0] === 'layer' && parts.length >= 2) {
    return { kind: 'layer' as const, targetId: parts[1], position: parts[2] === 'before' || parts[2] === 'inside' ? parts[2] : 'after' as const }
  }
  if (parts[0] !== 'drop') return null
  return { kind: 'drop' as const, parentId: parts[1] === 'root' ? null : parts[1], index: Number(parts[2]) }
}

const resolveParent = (document: { elements: Record<string, { type: string; children: string[] }>; rootIds: string[] }, parentId: string | null, index?: number) => {
  if (!parentId) return { parentId: null as string | null, index }
  const parent = document.elements[parentId]
  if (!parent) return { parentId: null as string | null, index }
  if (isLayout(parent.type as ElementType)) return { parentId, index }
  const grandparent = findParent(document as never, parentId)
  const siblings = grandparent ? document.elements[grandparent].children : document.rootIds
  return { parentId: grandparent, index: siblings.indexOf(parentId) + 1 }
}

const EditorShell = () => {
  const { project, initialized, hydrate, activePanel, setPanel, zoom, setZoom, viewport, viewportWidth, setViewport, setViewportWidth, past, future, undo, redo, startNew, addElement, addAssetImage, moveElement, updateTheme, updateStyles, exportProject, exportWebsite, siteIssues, checkSite, selectedId } = useEditorStore()
  const [activeDrag, setActiveDrag] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [fontTarget, setFontTarget] = useState<(FontPickerTarget & { scope: 'local'; elementId: string }) | (FontPickerTarget & { scope: 'heading' | 'body' | 'button' }) | null>(null)
  const [previewFont, setPreviewFont] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  const [exportError, setExportError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const adjustedProject = useRef<string | null>(null)
  const booted = useBooted()
  useEditorShortcuts()

  useEffect(() => { void hydrate() }, [hydrate])
  useEffect(() => {
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])
  useEffect(() => {
    const scroll = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const target = event.target instanceof HTMLElement ? event.target.closest('.styles-tabs, .assets-strip, .assets-strip-list') : null
      if (!(target instanceof HTMLElement)) return
      const max = target.scrollWidth - target.clientWidth
      if (max <= 0) return
      if ((event.deltaY > 0 && target.scrollLeft >= max) || (event.deltaY < 0 && target.scrollLeft <= 0)) return
      event.preventDefault()
      target.scrollLeft += event.deltaY
    }
    window.addEventListener('wheel', scroll, { passive: false })
    return () => window.removeEventListener('wheel', scroll)
  }, [])
  useEffect(() => {
    if (!commandOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setCommandOpen(false)
    }
    window.addEventListener('keydown', close, true)
    return () => window.removeEventListener('keydown', close, true)
  }, [commandOpen])
  useEffect(() => {
    const openCommand = () => setCommandOpen(true)
    const openPreview = () => setPreviewOpen(true)
    window.addEventListener('sunconstructor:command', openCommand)
    window.addEventListener('sunconstructor:preview', openPreview)
    return () => {
      window.removeEventListener('sunconstructor:command', openCommand)
      window.removeEventListener('sunconstructor:preview', openPreview)
    }
  }, [])
  useEffect(() => { if (project) usedFonts(project).forEach((family) => { void preloadFont(family) }) }, [project])
  useEffect(() => {
    if (!previewOpen) return
    if (typeof window !== 'undefined' && window.innerWidth < 760 && viewport === 'desktop') setViewport('mobile')
  }, [previewOpen, viewport, setViewport])
  useEffect(() => {
    const handlePop = () => {
      const match = window.location.pathname.match(/^\/builder\/([^/]+)/)
      const urlId = match ? decodeURIComponent(match[1]) : null
      const state = useEditorStore.getState()
      if (urlId && state.project?.id !== urlId) void state.openProject(urlId)
      if (!urlId && state.project) state.startNew()
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])
  useEffect(() => {
    if (!project || adjustedProject.current === project.id) return
    adjustedProject.current = project.id
    if (window.innerWidth <= 760) setViewport('mobile')
  }, [project, setViewport])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  if (!initialized) return <main className="editor-loading">Opening your workspace…</main>
  if (!project) return <ProjectDashboard />

  const onDragStart = (event: DragStartEvent) => setActiveDrag(String(event.active.id).replace('library:', '').replace('node:', ''))
  const onDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null)
    if (!event.over || !project) return
    const source = String(event.active.id)
    const target = String(event.over.id)
    const overRect = (event.over as { rect?: { top: number; height: number } }).rect
    const pointerOffsetY = (() => {
      const activator = event.activatorEvent as PointerEvent | null
      if (!activator || !overRect || !overRect.height) return null
      return activator.clientY + event.delta.y - overRect.top
    })()
    const drop = dropTarget(target)
    const layerPosition = (targetId: string) => {
      if (drop?.kind === 'layer' && drop.targetId === targetId && drop.position !== 'after') return drop.position
      const element = project.document.elements[targetId]
      if (!element || pointerOffsetY === null || !overRect) return 'after' as const
      const ratio = pointerOffsetY / overRect.height
      // middle third means inside the layout, edges mean before or after it
      if (isLayout(element.type) && ratio > 0.34 && ratio < 0.66) return 'inside' as const
      return ratio < 0.5 ? ('before' as const) : ('after' as const)
    }
    if (source.startsWith('library:') || source.startsWith('asset:')) {
      const insert = source.startsWith('library:')
        ? (parentId: string | null, index?: number) => addElement(source.replace('library:', '') as ElementType, parentId, index)
        : (parentId: string | null, index?: number) => addAssetImage(source.replace('asset:', ''), parentId, index)
      if (drop?.kind === 'drop') {
        const resolved = resolveParent(project.document, drop.parentId, drop.index)
        insert(resolved.parentId, resolved.index)
        return
      }
      if (drop?.kind === 'layer' || target.startsWith('layer:')) {
        const targetId = drop?.kind === 'layer' ? drop.targetId : target.replace('layer:', '')
        const position = layerPosition(targetId)
        const element = project.document.elements[targetId]
        if (!element) return
        if (position === 'inside' && isLayout(element.type)) {
          insert(targetId, 0)
          return
        }
        const parentId = findParent(project.document, targetId)
        const siblings = parentId ? project.document.elements[parentId].children : project.document.rootIds
        insert(parentId, siblings.indexOf(targetId) + (position === 'before' ? 0 : 1))
        return
      }
      return
    }
    if (!source.startsWith('node:')) return
    const id = source.replace('node:', '')
    if (id === target.replace('layer:', '')) return
    if (drop?.kind === 'drop') {
      const resolved = resolveParent(project.document, drop.parentId, drop.index)
      if (resolved.parentId && isInside(project.document, resolved.parentId, id)) return
      moveElement(id, resolved.parentId, resolved.index)
      return
    }
    if (!target.startsWith('layer:') && drop?.kind !== 'layer') return
    const targetId = drop?.kind === 'layer' ? drop.targetId : target.replace('layer:', '')
    if (id === targetId || isInside(project.document, targetId, id)) return
    const element = project.document.elements[targetId]
    if (!element) return
    const position = layerPosition(targetId)
    if (position === 'inside' && isLayout(element.type)) {
      if (!element.props.locked) moveElement(id, targetId, 0)
      return
    }
    const parentId = findParent(project.document, targetId)
    const siblings = parentId ? project.document.elements[parentId].children : project.document.rootIds
    moveElement(id, parentId, siblings.indexOf(targetId) + (position === 'before' ? 0 : 1))
  }
  const selectFont = (family: string) => {
    if (!fontTarget) return
    if (fontTarget.scope === 'local') updateStyles(fontTarget.elementId, { fontFamily: literal(family) })
    if (fontTarget.scope === 'heading') updateTheme((theme) => { theme.typography.heading.family = family })
    if (fontTarget.scope === 'body') updateTheme((theme) => { theme.typography.body.family = family })
    if (fontTarget.scope === 'button') updateTheme((theme) => { theme.button.font.family = family })
    setPreviewFont(null)
    setFontTarget(null)
  }
  const showAssetsStrip = activePanel === 'assets'
  const panel = activePanel === 'add' ? <AddPanel /> : activePanel === 'pages' ? <LayersPanel onMenu={(id, point) => setMenu({ id, ...point })} /> : activePanel === 'assets' ? null : activePanel === 'layers' ? <LayersPanel onMenu={(id, point) => setMenu({ id, ...point })} /> : activePanel === 'check' ? <SiteCheckPanel /> : <StylesPanel onOpenFonts={setFontTarget} />

  const runExport = async () => {
    try {
      setExportError('')
      setExporting(true)
      await exportWebsite()
      setExportComplete(true)
    } catch {
      setExportError('We could not finish this export. Try again.')
    } finally {
      setExporting(false)
    }
  }
  const hasSelection = Boolean(selectedId)
  const workspaceColumns = (() => {
    let columns = '68px '
    if (panel) columns += '260px '
    columns += 'minmax(420px, 1fr)'
    if (hasSelection) columns += ' 290px'
    return columns
  })()
  return <EditorErrorBoundary><DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveDrag(null)}>
    <div className={booted ? 'editor-app is-booted' : 'editor-app'}>
      <EditorToolbar name={project.name} zoom={zoom} canUndo={past.length > 0} canRedo={future.length > 0} onUndo={undo} onRedo={redo} onZoom={setZoom} onStartNew={startNew} onExport={() => { checkSite(); setExportComplete(false); setExportOpen(true) }} onPreview={() => setPreviewOpen(true)} viewport={viewport} viewportWidth={viewportWidth} onViewport={setViewport} onViewportWidth={setViewportWidth} />
      <div className="editor-workspace" style={{ '--workspace-columns': workspaceColumns } as React.CSSProperties}><ToolRail active={activePanel} onChange={(id) => { if (id === 'add' && window.innerWidth > 760) setInsertOpen(true); else setPanel(id) }} />{panel}<div className="canvas-wrap"><Canvas zoom={zoom} previewFont={previewFont} dragging={Boolean(activeDrag)} onMenu={(id, point) => setMenu({ id, ...point })} /><button type="button" className="canvas-insert" aria-label="Insert" title="Insert" onClick={() => setInsertOpen(true)}>+</button>{showAssetsStrip && <AssetsStrip />}</div>{hasSelection && <PropertiesPanel onOpenFonts={setFontTarget} />}</div>
      {insertOpen && <InsertPopover onClose={() => setInsertOpen(false)} />}
      {menu && <ContextMenu menu={menu} close={() => setMenu(null)} />}
      {fontTarget && <FontPicker target={fontTarget} onSelect={(font) => selectFont(font.family)} onPreview={setPreviewFont} onClose={() => { setPreviewFont(null); setFontTarget(null) }} />}
      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} onPreview={() => setPreviewOpen(true)} onExport={() => { checkSite(); setExportComplete(false); setExportOpen(true) }} />}
      {exportOpen && <ExportDialog busy={exporting} complete={exportComplete} error={exportError} issues={siteIssues} onClose={() => { if (!exporting) { setExportOpen(false); setExportComplete(false) } }} onExport={() => { setExportComplete(false); void runExport() }} onBackup={() => void exportProject(project.id)} />}
      {previewOpen && <section className="site-preview" aria-label="Website preview"><header><button type="button" onClick={() => setPreviewOpen(false)}><ArrowLeft size={16} /> Back to editor</button><div><button type="button" className={viewport === 'desktop' ? 'is-active' : ''} onClick={() => setViewport('desktop')} aria-label="Desktop preview" title="Desktop preview"><Monitor size={15} /></button><button type="button" className={viewport === 'tablet' ? 'is-active' : ''} onClick={() => setViewport('tablet')} aria-label="Tablet preview" title="Tablet preview"><Tablet size={15} /></button><button type="button" className={viewport === 'mobile' ? 'is-active' : ''} onClick={() => setViewport('mobile')} aria-label="Mobile preview" title="Mobile preview"><Smartphone size={15} /></button></div></header><Canvas zoom="fit" interactive={false} onMenu={() => undefined} /></section>}
      <DragOverlay dropAnimation={null}>{activeDrag && <div className="drag-overlay"><Box size={16} /> {activeDrag}</div>}</DragOverlay>
    </div>
  </DndContext></EditorErrorBoundary>
}

export const EditorApp = () => <EditorShell />
