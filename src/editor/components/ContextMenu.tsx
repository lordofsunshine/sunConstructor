import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Bookmark, ChevronRight, Copy, Eye, Lock, Move, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { findParent, isInside } from '../model/tree'
import { isLayout } from '../model/types'
import { useEditorStore } from '../store/editorStore'

export interface MenuState {
  id: string
  x: number
  y: number
}

export const ContextMenu = ({ menu, close }: { menu: MenuState; close: () => void }) => {
  const { project, duplicateElement, toggleHidden, toggleLocked, deleteElement, copy, saveReusableSection, moveElement } = useEditorStore()
  const [moveOpen, setMoveOpen] = useState(false)
  const element = project?.document.elements[menu.id]
  if (!element || !project) return null
  const rename = () => {
    window.dispatchEvent(new CustomEvent('sunconstructor:rename', { detail: menu.id }))
    close()
  }
  const action = (callback: () => void) => { callback(); close() }
  const parentId = findParent(project.document, menu.id)
  const siblings = parentId ? project.document.elements[parentId].children : project.document.rootIds
  const index = siblings.indexOf(menu.id)
  const move = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= siblings.length || nextIndex === index) return
    // the item leaves the list first, so going down needs one extra step
    moveElement(menu.id, parentId, nextIndex > index ? nextIndex + 1 : nextIndex)
  }
  const moveOut = () => {
    if (!parentId) return
    const grandparent = findParent(project.document, parentId)
    const outer = grandparent ? project.document.elements[grandparent].children : project.document.rootIds
    moveElement(menu.id, grandparent, outer.indexOf(parentId) + 1)
  }
  const moveInside = (direction: -1 | 1) => {
    const neighbor = siblings[direction === -1 ? index - 1 : index + 1]
    const target = neighbor ? project.document.elements[neighbor] : null
    if (!target || !isLayout(target.type) || target.props.locked || isInside(project.document, menu.id, neighbor)) return
    moveElement(menu.id, neighbor, direction === -1 ? target.children.length : 0)
  }
  const clamped = {
    x: Math.min(menu.x, window.innerWidth - 168),
    y: Math.min(menu.y, window.innerHeight - 280),
  }
  const submenuLeft = menu.x > window.innerWidth - 344
  return <div className="editor-context-menu" style={{ left: Math.max(8, clamped.x), top: Math.max(8, clamped.y) }} role="menu">
    <button type="button" onClick={rename}><Pencil size={15} /> Rename</button>
    <button type="button" onClick={() => action(() => duplicateElement(menu.id))}><Copy size={15} /> Duplicate</button>
    <button type="button" onClick={() => action(() => copy())}><Copy size={15} /> Copy</button>
    <div className="context-submenu-wrap" onMouseEnter={() => setMoveOpen(true)} onMouseLeave={() => setMoveOpen(false)}>
      <button type="button" aria-haspopup="menu" aria-expanded={moveOpen} onClick={(event) => { event.stopPropagation(); setMoveOpen((value) => !value) }}><Move size={15} /> Move<ChevronRight size={14} className="context-submenu-chevron" /></button>
      {moveOpen && <div className={submenuLeft ? 'context-submenu is-left' : 'context-submenu'} role="menu">
        <button type="button" aria-disabled={index <= 0} onClick={() => action(() => move(index - 1))}><ArrowUp size={15} /> Move up</button>
        <button type="button" aria-disabled={index < 0 || index >= siblings.length - 1} onClick={() => action(() => move(index + 1))}><ArrowDown size={15} /> Move down</button>
        <button type="button" aria-disabled={!parentId} onClick={() => action(moveOut)}><ArrowLeft size={15} /> Move out</button>
        <button type="button" onClick={() => action(() => moveInside(1))}><ArrowRight size={15} /> Move into next</button>
      </div>}
    </div>
    {element.type === 'section' && <button type="button" onClick={() => action(() => saveReusableSection(menu.id))}><Bookmark size={15} /> Save as reusable section</button>}
    <button type="button" onClick={() => action(() => toggleHidden(menu.id))}><Eye size={15} /> {element.props.hidden ? 'Show' : 'Hide'}</button>
    <button type="button" onClick={() => action(() => toggleLocked(menu.id))}><Lock size={15} /> {element.props.locked ? 'Unlock' : 'Lock'}</button>
    <button className="context-danger" type="button" onClick={() => action(() => deleteElement(menu.id))}><Trash2 size={15} /> Delete</button>
  </div>
}
