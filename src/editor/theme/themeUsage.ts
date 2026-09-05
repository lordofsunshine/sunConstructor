import type { Project } from '../model/types'
import type { StyleValue } from './types'
import { usesToken } from './projectTheme'

export const usedFonts = (project: Project) => {
  const names = new Set([project.theme.typography.heading.family, project.theme.typography.body.family, project.theme.button.font.family])
  const allElements = project.pages.flatMap((page) => Object.values(page.document.elements))
  allElements.push(...Object.values(project.document.elements))
  for (const element of allElements) {
    const family = element.styles.fontFamily
    if (typeof family === 'string') names.add(family)
    if (typeof family === 'object' && family !== null && 'type' in family && family.type === 'value' && typeof family.value === 'string') names.add(family.value)
  }
  return [...names]
}

export const countColorUses = (project: Project, colorId: string) => {
  const name = `colors.${colorId}`
  let count = 0
  const countValue = (value: StyleValue | undefined) => { if (usesToken(value, name)) count += 1 }
  countValue(project.theme.button.background)
  countValue(project.theme.button.textColor)
  countValue(project.theme.button.borderColor)
  const pages = project.pages.length ? project.pages : [{ document: project.document } as unknown as typeof project.pages[number]]
  for (const page of pages) {
    for (const element of Object.values(page.document.elements)) {
      for (const value of Object.values(element.styles)) {
        if (Array.isArray(value)) value.forEach((shadow) => countValue((shadow as { color: StyleValue }).color))
        else countValue(value as StyleValue | undefined)
      }
    }
  }
  return count
}
