import { ChevronDown, Download, Eye, Monitor, MoreHorizontal, Plus, Redo2, Smartphone, Tablet, Undo2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Brand } from '../../components/Brand'
import type { ResponsiveMode, Zoom } from '../model/types'
import { FloatingPanel } from './FloatingPanel'

interface EditorToolbarProps {
  name: string
  zoom: Zoom
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onZoom: (zoom: Zoom) => void
  onStartNew: () => void
  onExport: () => void
  onPreview: () => void
  viewport: ResponsiveMode
  viewportWidth: number
  onViewport: (viewport: ResponsiveMode) => void
  onViewportWidth: (width: number) => void
}

export const EditorToolbar = ({ name, zoom, canUndo, canRedo, onUndo, onRedo, onZoom, onStartNew, onExport, onPreview, viewport, viewportWidth, onViewport, onViewportWidth }: EditorToolbarProps) => {
  const [publishOpen, setPublishOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const publishRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  return <header className="editor-toolbar">
    <a className="builder-brand" href="/builder" aria-label="My projects" onClick={(event) => { event.preventDefault(); onStartNew() }}><Brand /></a>
    <div className="project-title"><span>Project</span><strong>{name}</strong><ChevronDown size={14} /></div>
    <div className="editor-actions">
      <div className="viewport-segment" aria-label="Viewport">
        <button type="button" className={viewport === 'desktop' ? 'is-active' : ''} onClick={() => onViewport('desktop')} aria-label="Desktop" title="Desktop"><Monitor size={14} /></button>
        <button type="button" className={viewport === 'tablet' ? 'is-active' : ''} onClick={() => onViewport('tablet')} aria-label="Tablet" title="Tablet"><Tablet size={14} /></button>
        <button type="button" className={viewport === 'mobile' ? 'is-active' : ''} onClick={() => onViewport('mobile')} aria-label="Mobile" title="Mobile"><Smartphone size={14} /></button>
        <input aria-label="Canvas width" type="number" min="320" max="1600" value={viewportWidth} onChange={(event) => onViewportWidth(Number(event.target.value))} />
      </div>
      <div className="toolbar-divider" />
      <button className="icon-button" type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo"><Undo2 size={16} /></button>
      <button className="icon-button" type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo"><Redo2 size={16} /></button>
      <label className="zoom-control">Zoom<select value={zoom} onChange={(event) => onZoom(event.target.value === 'fit' ? 'fit' : Number(event.target.value) as Zoom)}><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option><option value="fit">Fit</option></select></label>
      <div className="publish-wrap">
        <button ref={publishRef} className="publish-button" type="button" onClick={() => setPublishOpen((value) => !value)}>Publish <ChevronDown size={13} /></button>
        <FloatingPanel anchorRef={publishRef} open={publishOpen} placement="bottom-end" className="publish-menu" onClose={() => setPublishOpen(false)}>
          <button type="button" role="menuitem" onClick={() => { setPublishOpen(false); onPreview() }}><Eye size={14} /> Preview</button>
          <button type="button" role="menuitem" onClick={() => { setPublishOpen(false); onExport() }}><Download size={14} /> Export website</button>
          <button type="button" role="menuitem" onClick={() => { setPublishOpen(false); onStartNew() }}><Plus size={14} /> New project</button>
        </FloatingPanel>
      </div>
      <div className="toolbar-more">
        <button ref={moreRef} className="icon-button" type="button" aria-label="More" title="More" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}><MoreHorizontal size={16} /></button>
        <FloatingPanel anchorRef={moreRef} open={moreOpen} placement="bottom-end" className="toolbar-more-menu" onClose={() => setMoreOpen(false)}>
          <button type="button" onClick={() => { setMoreOpen(false); onUndo() }} disabled={!canUndo}>Undo</button>
          <button type="button" onClick={() => { setMoreOpen(false); onRedo() }} disabled={!canRedo}>Redo</button>
          <button type="button" onClick={() => setMoreOpen(false)}>Zoom {String(zoom)}</button>
        </FloatingPanel>
      </div>
    </div>
  </header>
}
