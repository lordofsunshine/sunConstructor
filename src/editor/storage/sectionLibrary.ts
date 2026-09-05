import type { ReusableSection, SiteDocument } from '../model/types'
import { randomId } from '../model/ids'
import { subtreeIds } from '../model/tree'

const key = 'sunconstructor.reusable-sections'

export const listReusableSections = (): ReusableSection[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]') as ReusableSection[]
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export const saveReusableSection = (document: SiteDocument, id: string) => {
  const node = document.elements[id]
  if (!node || node.type !== 'section') return
  const ids = subtreeIds(document, id)
  const section: ReusableSection = { id: randomId(), name: node.name?.trim() || 'Reusable section', document: { elements: Object.fromEntries(ids.map((item) => [item, structuredClone(document.elements[item])])), rootIds: [id] }, createdAt: new Date().toISOString() }
  try {
    localStorage.setItem(key, JSON.stringify([section, ...listReusableSections()].slice(0, 24)))
  } catch {
    return
  }
  window.dispatchEvent(new Event('sunconstructor:sections'))
}
