import { Copy, GripVertical, Trash2 } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { elementLabel } from '../model/elements'
import { findParent, isInside } from '../model/tree'
import { isEditable, isLayout, type SiteElement, type Zoom } from '../model/types'
import { compilePage } from '../render/siteCompiler'
import { useEditorStore } from '../store/editorStore'

interface CanvasProps {
  zoom: Zoom
  previewFont?: string | null
  onMenu: (id: string, point: { x: number; y: number }) => void
  dragging?: boolean
  interactive?: boolean
}

interface ElementRect {
  left: number
  top: number
  width: number
  height: number
}

interface CanvasDrag {
  id: string
  source: HTMLElement
  target: HTMLElement | null
  parentId: string | null
  index: number
  moved: boolean
  startX: number
  startY: number
}

const DropSurface = ({ index }: { index: number }) => {
  const drop = useDroppable({ id: `drop:root:${index}` })
  return <div ref={drop.setNodeRef} className={drop.isOver ? 'canvas-drop-surface is-over' : 'canvas-drop-surface'}><span>Drop here to move to the end of the page</span></div>
}

const EmptyDropSurface = () => {
  const drop = useDroppable({ id: 'drop:root:0' })
  return <div ref={drop.setNodeRef} className={drop.isOver ? 'empty-canvas-drop is-over' : 'empty-canvas-drop'} />
}

const SelectionOverlay = ({ element, rect, scale }: { element: SiteElement; rect: ElementRect; scale: number }) => {
  const { duplicateElement, deleteElement, updateStyles, beginTransaction, commitTransaction } = useEditorStore()
  const drag = useDraggable({ id: `node:${element.id}`, disabled: Boolean(element.props.locked) })
  const resizable = element.type === 'image' || element.type === 'spacer' || element.type === 'divider'
  const resize = (event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    beginTransaction()
    const move = (pointer: PointerEvent) => updateStyles(element.id, {
      width: Math.max(40, rect.width + (pointer.clientX - startX) / scale),
      height: Math.max(16, rect.height + (pointer.clientY - startY) / scale),
    }, false)
    const finish = () => {
      commitTransaction()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }
  return <div className="canvas-selection" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
    <div className="canvas-selection-label" {...drag.attributes} {...drag.listeners}><span className="canvas-selection-grip"><GripVertical size={13} /></span><span>{elementLabel(element)}</span></div>
    <div className="canvas-selection-actions"><button type="button" aria-label="Duplicate" title="Duplicate" onClick={() => duplicateElement(element.id)}><Copy size={13} /></button><button type="button" aria-label="Delete" title="Delete" onClick={() => deleteElement(element.id)}><Trash2 size={13} /></button></div>
    {resizable && <button type="button" className="canvas-resize-handle" aria-label="Resize element" title="Resize element" onPointerDown={resize} />}
  </div>
}

export const Canvas = ({ zoom, previewFont, onMenu, dragging = false, interactive = true }: CanvasProps) => {
  const { project, assets, selectedId, select, updateContent, finishTyping, addElement, addTemplate, moveElement, viewport, viewportWidth } = useEditorStore()
  const stageRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [stageWidth, setStageWidth] = useState(0)
  const [frameHeight, setFrameHeight] = useState(640)
  const [selectedRect, setSelectedRect] = useState<ElementRect | null>(null)
  const page = project?.pages.find((item) => item.id === project.activePageId)
  const rootCount = page?.document.rootIds.length ?? 0
  const selected = selectedId && page ? page.document.elements[selectedId] : null
  const availableWidth = Math.max(280, stageWidth - (stageWidth <= 760 ? 16 : 72))
  const requestedScale = zoom === 'fit' ? Math.min(1, availableWidth / viewportWidth) : zoom / 100
  const scale = Math.min(requestedScale, availableWidth / viewportWidth)
  const html = useMemo(() => {
    if (!project || !page) return ''
    const assetUrls = new Map(assets.map((asset) => [asset.id, asset.url]))
    return compilePage(page, project, { assetUrl: (id) => assetUrls.get(id) ?? '', selectedId, previewFont, reveal: !interactive, head: interactive ? '<style>[data-element-id]{cursor:grab}[data-element-id][contenteditable=true]{cursor:text}.sc-is-dragging{opacity:.46!important;pointer-events:none!important;cursor:grabbing!important}.sc-drop-before{box-shadow:inset 0 4px 0 #d4ab20!important}.sc-drop-after{box-shadow:inset 0 -4px 0 #d4ab20!important}.sc-drop-inside{outline:3px solid #d4ab20!important;outline-offset:-3px!important}body.sc-dragging{user-select:none;cursor:grabbing}</style>' : '' }).html
  }, [assets, interactive, page, previewFont, project, selectedId])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width))
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const measure = useCallback(() => {
    const frame = frameRef.current
    const doc = frame?.contentDocument
    if (!frame || !doc) return
    const height = Math.max(640, doc.documentElement.scrollHeight, doc.body.scrollHeight)
    setFrameHeight(height)
    if (!selectedId) {
      setSelectedRect(null)
      return
    }
    const target = doc.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(selectedId)}"]`)
    if (!target) {
      setSelectedRect(null)
      return
    }
    // the frame is never scrolled and starts at the origin, so its pixels line up with the overlay
    const rect = target.getBoundingClientRect()
    setSelectedRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
  }, [selectedId])

  const bindFrame = useCallback(() => {
    const frame = frameRef.current
    const doc = frame?.contentDocument
    if (!frame || !doc) return
    const selectTarget = (target: EventTarget | null) => target && 'closest' in target ? (target as HTMLElement).closest<HTMLElement>('[data-element-id]') : null
    let drag: CanvasDrag | null = null
    let suppressClick = false
    const clearDropTarget = () => {
      if (!drag?.target) return
      drag.target.classList.remove('sc-drop-before', 'sc-drop-after', 'sc-drop-inside')
      drag.target = null
    }
    const finishDrag = () => {
      if (!drag) return
      clearDropTarget()
      drag.source.classList.remove('sc-is-dragging')
      doc.body.classList.remove('sc-dragging')
      drag = null
    }
    const dropTarget = (id: string, point: { x: number; y: number }) => {
      const source = page?.document.elements[id]
      const node = doc.elementFromPoint(point.x, point.y)
      let target = selectTarget(node)
      if (!source || !target) return null
      if (source.type === 'section') target = target.closest<HTMLElement>('.sc-section[data-element-id]')
      const targetId = target?.dataset.elementId
      if (!target || !targetId || targetId === id || isInside(page!.document, targetId, id)) return null
      const element = page!.document.elements[targetId]
      if (!element || element.props.locked) return null
      const rect = target.getBoundingClientRect()
      const center = source.type !== 'section' && isLayout(element.type) && point.x > rect.left + rect.width * .2 && point.x < rect.right - rect.width * .2 && point.y > rect.top + rect.height * .2 && point.y < rect.bottom - rect.height * .2
      if (center) return { target, parentId: targetId, index: element.children.length, position: 'inside' as const }
      const parentId = findParent(page!.document, targetId)
      const siblings = parentId ? page!.document.elements[parentId].children : page!.document.rootIds
      const parent = parentId ? page!.document.elements[parentId] : null
      const horizontal = parent?.type === 'row' || parent?.type === 'columns'
      const after = horizontal ? point.x > rect.left + rect.width / 2 : point.y > rect.top + rect.height / 2
      return { target, parentId, index: siblings.indexOf(targetId) + (after ? 1 : 0), position: after ? 'after' as const : 'before' as const }
    }
    const pointerDown = (event: PointerEvent) => {
      if (!interactive || event.button !== 0 || (event.target instanceof HTMLElement && event.target.isContentEditable)) return
      const target = selectTarget(event.target)
      const id = target?.dataset.elementId
      const element = id ? page?.document.elements[id] : null
      if (!target || !id || !element || element.props.locked) return
      drag = { id, source: target, target: null, parentId: null, index: 0, moved: false, startX: event.clientX, startY: event.clientY }
    }
    const pointerMove = (event: PointerEvent) => {
      if (!drag) return
      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 7) return
        drag.moved = true
        drag.source.classList.add('sc-is-dragging')
        doc.body.classList.add('sc-dragging')
      }
      event.preventDefault()
      const target = dropTarget(drag.id, { x: event.clientX, y: event.clientY })
      clearDropTarget()
      if (!target) return
      drag.target = target.target
      drag.parentId = target.parentId
      drag.index = target.index
      drag.target.classList.add(`sc-drop-${target.position}`)
    }
    const pointerUp = (event: PointerEvent) => {
      if (!drag) return
      const current = drag
      if (current.moved) {
        event.preventDefault()
        suppressClick = true
        if (current.target) moveElement(current.id, current.parentId, current.index)
      }
      finishDrag()
    }
    const pointerCancel = () => finishDrag()
    const nativeDragStart = (event: DragEvent) => event.preventDefault()
    const click = (event: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false
        event.preventDefault()
        event.stopPropagation()
        return
      }
      const anchor = targetAnchor(event.target)
      if (anchor) event.preventDefault()
      if (!interactive) return
      const target = selectTarget(event.target)
      select(target?.dataset.elementId ?? null)
    }
    const context = (event: MouseEvent) => {
      if (!interactive) return
      const target = selectTarget(event.target)
      if (!target?.dataset.elementId) return
      event.preventDefault()
      select(target.dataset.elementId)
      const frameRect = frame.getBoundingClientRect()
      onMenu(target.dataset.elementId, { x: frameRect.left + event.clientX * scale, y: frameRect.top + event.clientY * scale })
    }
    const edit = (event: MouseEvent) => {
      if (!interactive) return
      const target = selectTarget(event.target)
      if (!target?.dataset.elementId) return
      const element = page?.document.elements[target.dataset.elementId]
      if (!element || !isEditable(element.type) || element.props.locked) return
      event.preventDefault()
      target.contentEditable = 'true'
      target.focus()
      const selection = frame.contentWindow?.getSelection()
      const range = doc.createRange()
      range.selectNodeContents(target)
      selection?.removeAllRanges()
      selection?.addRange(range)
      const keydown = (keyEvent: KeyboardEvent) => {
        if ((keyEvent.key === 'Enter' && !keyEvent.shiftKey) || keyEvent.key === 'Escape') {
          keyEvent.preventDefault()
          target.blur()
        }
      }
      const finish = () => {
        target.contentEditable = 'false'
        updateContent(element.id, (target.innerText ?? '').replace(/\n\n+/g, '\n\n'))
        finishTyping()
        target.removeEventListener('keydown', keydown)
      }
      target.addEventListener('keydown', keydown)
      target.addEventListener('blur', finish, { once: true })
    }
    doc.addEventListener('click', click, true)
    doc.addEventListener('pointerdown', pointerDown, true)
    doc.addEventListener('pointermove', pointerMove, true)
    doc.addEventListener('pointerup', pointerUp, true)
    doc.addEventListener('pointercancel', pointerCancel, true)
    doc.addEventListener('dragstart', nativeDragStart, true)
    doc.addEventListener('contextmenu', context)
    doc.addEventListener('dblclick', edit)
    const observer = new ResizeObserver(measure)
    observer.observe(doc.body)
    doc.querySelectorAll('img').forEach((image) => image.addEventListener('load', measure, { once: true }))
    void doc.fonts.ready.then(() => requestAnimationFrame(measure))
    requestAnimationFrame(measure)
    return () => {
      finishDrag()
      observer.disconnect()
      doc.removeEventListener('click', click, true)
      doc.removeEventListener('pointerdown', pointerDown, true)
      doc.removeEventListener('pointermove', pointerMove, true)
      doc.removeEventListener('pointerup', pointerUp, true)
      doc.removeEventListener('pointercancel', pointerCancel, true)
      doc.removeEventListener('dragstart', nativeDragStart, true)
      doc.removeEventListener('contextmenu', context)
      doc.removeEventListener('dblclick', edit)
    }
  }, [finishTyping, interactive, measure, moveElement, onMenu, page, scale, select, updateContent])

  return <main ref={stageRef} className="editor-stage">
    <div className="stage-ruler">{viewport === 'desktop' ? 'Desktop' : viewport === 'tablet' ? 'Tablet' : 'Mobile'} · {viewportWidth}px</div>
    <div className="canvas-scroll" tabIndex={0}><div className="canvas-frame" style={{ '--canvas-display-width': `${Math.ceil(viewportWidth * scale)}px`, '--canvas-display-height': `${Math.ceil(frameHeight * scale)}px` } as React.CSSProperties}><div className="canvas-zoom" style={{ '--canvas-zoom': scale, '--canvas-width': `${viewportWidth}px` } as React.CSSProperties}><div className="canvas-document" style={{ height: frameHeight }}>
      <iframe ref={frameRef} className="site-canvas" title="Website canvas" srcDoc={html} style={{ height: frameHeight }} onLoad={bindFrame} />
      {interactive && selected && selectedRect && <SelectionOverlay element={selected} rect={selectedRect} scale={scale} />}
      {interactive && dragging && rootCount > 0 && <DropSurface index={rootCount} />}
      {interactive && dragging && rootCount === 0 && <EmptyDropSurface />}
      {interactive && rootCount === 0 && <div className="empty-canvas"><p>A blank page is a good start</p><h1>Start with a section</h1><span>Add a ready-made starting point, then make it yours.</span><div><button type="button" className="sun-button" onClick={() => addTemplate('hero')}>Browse sections</button><button type="button" className="outline-button" onClick={() => addElement('section')}>Add empty section</button></div></div>}
    </div></div></div></div>
  </main>
}

const targetAnchor = (target: EventTarget | null) => target && 'closest' in target ? (target as HTMLElement).closest('a') : null
