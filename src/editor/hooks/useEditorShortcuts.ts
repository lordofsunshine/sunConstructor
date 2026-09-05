import { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

const isTyping = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true
  if (target.isContentEditable) {
    const editing = target.getAttribute('contenteditable') === 'true'
    return editing
  }
  return false
}

export const useEditorShortcuts = () => {
  const { select, deleteElement, duplicateElement, copy, paste, undo, redo } = useEditorStore()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const { project, selectedId, moveElement, updateStyles, viewport } = useEditorStore.getState()
        if (!project || !selectedId) return
        const element = project.document.elements[selectedId]
        if (!element || element.props.locked) return
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          const parentId = (() => {
            for (const el of Object.values(project.document.elements)) if (el.children.includes(selectedId)) return el.id
            return null
          })()
          const siblings = parentId ? project.document.elements[parentId].children : project.document.rootIds
          const index = siblings.indexOf(selectedId)
          const nextIndex = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? index - 1 : index + 1
          if (nextIndex < 0 || nextIndex >= siblings.length) return
          moveElement(selectedId, parentId, nextIndex)
          return
        }
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        const deltaX = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0
        const deltaY = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0
        if (deltaX !== 0) {
          const current = Number(element.styles.marginLeft ?? 0)
          const next = current + deltaX
          if (viewport === 'desktop') updateStyles(selectedId, { marginLeft: next })
          else updateStyles(selectedId, { marginLeft: next }, true)
        }
        if (deltaY !== 0) {
          const current = Number(element.styles.marginTop ?? 0)
          const next = current + deltaY
          if (viewport === 'desktop') updateStyles(selectedId, { marginTop: next })
          else updateStyles(selectedId, { marginTop: next }, true)
        }
        return
      }

      if (event.key === 'Escape') {
        select(null)
        return
      }

      if (event.key.toLowerCase() === 'p' && !event.ctrlKey && !event.metaKey) {
        window.dispatchEvent(new Event('sunconstructor:preview'))
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteElement()
        return
      }

      if (!event.ctrlKey && !event.metaKey) return
      const key = event.key.toLowerCase()
      if (key === 'k') {
        event.preventDefault()
        window.dispatchEvent(new Event('sunconstructor:command'))
        return
      }
      if (key === 'd') {
        event.preventDefault()
        duplicateElement()
      }
      if (key === 'c') {
        event.preventDefault()
        copy()
      }
      if (key === 'v') {
        event.preventDefault()
        paste()
      }
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [copy, deleteElement, duplicateElement, paste, redo, select, undo])
}
