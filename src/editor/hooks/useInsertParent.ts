import { isLayout } from '../model/types'
import { useEditorStore } from '../store/editorStore'

export const useInsertParent = () => useEditorStore((state) => {
  const id = state.selectedId
  const element = id ? state.project?.document.elements[id] : null
  return element && isLayout(element.type) && !element.props.locked ? element.id : null
})
