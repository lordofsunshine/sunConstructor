import { createElement } from './elements'
import { isLayout, type ElementType, type SiteDocument, type SiteElement } from './types'

export const cloneDocument = (document: SiteDocument) => structuredClone(document)

export const findParent = (document: SiteDocument, id: string) => {
  for (const element of Object.values(document.elements)) {
    if (element.children.includes(id)) return element.id
  }
  return null
}

export const subtreeIds = (document: SiteDocument, id: string, visited = new Set<string>()): string[] => {
  if (visited.has(id)) return []
  visited.add(id)
  const element = document.elements[id]
  if (!element) return []
  return [id, ...element.children.flatMap((childId) => subtreeIds(document, childId, visited))]
}

export const isInside = (document: SiteDocument, id: string, ancestorId: string) => {
  const visited = new Set<string>()
  const stack = [ancestorId]
  while (stack.length) {
    const current = stack.pop()!
    if (visited.has(current)) continue
    visited.add(current)
    if (current === id) return true
    const el = document.elements[current]
    if (el) stack.push(...el.children)
  }
  return false
}

const removeFromParent = (document: SiteDocument, id: string) => {
  const parentId = findParent(document, id)
  if (parentId) {
    document.elements[parentId].children = document.elements[parentId].children.filter((childId) => childId !== id)
    return
  }
  document.rootIds = document.rootIds.filter((rootId) => rootId !== id)
}

export const insertNode = (document: SiteDocument, id: string, parentId: string | null, index?: number) => {
  const collection = parentId ? document.elements[parentId]?.children : document.rootIds
  if (!collection) return
  const nextIndex = typeof index === 'number' ? Math.max(0, Math.min(index, collection.length)) : collection.length
  collection.splice(nextIndex, 0, id)
}

export const addNode = (document: SiteDocument, type: ElementType, parentId: string | null, index?: number) => {
  const element = createElement(type)
  document.elements[element.id] = element
  insertNode(document, element.id, parentId, index)
  return element.id
}

export const removeNode = (document: SiteDocument, id: string) => {
  removeFromParent(document, id)
  for (const nodeId of subtreeIds(document, id)) delete document.elements[nodeId]
}

export const moveNode = (document: SiteDocument, id: string, parentId: string | null, index?: number) => {
  const node = document.elements[id]
  if (!node || node.props.locked || (parentId && isInside(document, parentId, id))) return false
  if (parentId && (!document.elements[parentId] || !isLayout(document.elements[parentId].type))) return false
  if (parentId && document.elements[parentId].props.locked) return false
  const oldParent = findParent(document, id)
  const oldCollection = oldParent ? document.elements[oldParent].children : document.rootIds
  const oldIndex = oldCollection.indexOf(id)
  removeFromParent(document, id)
  // pulling an item out shifts its old siblings, so stepping back one lands it where dropped
  const adjustedIndex = oldParent === parentId && typeof index === 'number' && oldIndex < index ? index - 1 : index
  insertNode(document, id, parentId, adjustedIndex)
  return true
}

const cloneNode = (document: SiteDocument, id: string, copy: Record<string, SiteElement>) => {
  const source = document.elements[id]
  const duplicate = createElement(source.type, {
    content: source.content,
    name: `${source.name ?? source.type} copy`,
    props: structuredClone(source.props),
    styles: structuredClone(source.styles),
    responsive: structuredClone(source.responsive),
    visibility: structuredClone(source.visibility),
  })
  copy[duplicate.id] = duplicate
  duplicate.children = source.children.map((childId) => cloneNode(document, childId, copy))
  return duplicate.id
}

export const duplicateNode = (document: SiteDocument, id: string, parentId?: string | null, index?: number) => {
  if (!document.elements[id]) return null
  const copy: Record<string, SiteElement> = {}
  const duplicateId = cloneNode(document, id, copy)
  Object.assign(document.elements, copy)
  const container = typeof parentId === 'undefined' ? findParent(document, id) : parentId
  const position = typeof index === 'number' ? index : (container ? document.elements[container].children.indexOf(id) : document.rootIds.indexOf(id)) + 1
  insertNode(document, duplicateId, container, position)
  return duplicateId
}
