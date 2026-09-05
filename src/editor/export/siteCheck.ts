import type { AssetPreview, Project, SiteElement } from '../model/types'
import { isUnsafeLink } from '../render/siteCompiler'

export interface SiteIssue {
  level: 'error' | 'suggestion'
  message: string
}

const pageElements = (project: Project) => project.pages.flatMap((page) => Object.values(page.document.elements).map((element) => ({ page, element })))

const isInternalLink = (value: string) => value.startsWith('/') && !value.startsWith('//')

const issue = (level: SiteIssue['level'], message: string): SiteIssue => ({ level, message })

const checkElement = (element: SiteElement, pageName: string, assetIds: Set<string>, pages: Set<string>) => {
  const items: SiteIssue[] = []
  if (element.type === 'image') {
    const assetId = element.props.assetId
    const source = String(element.props.src ?? '')
    if (typeof assetId === 'string' && !assetIds.has(assetId)) items.push(issue('error', `An image on ${pageName} is missing from your assets.`))
    if (!assetId && !source) items.push(issue('error', `An image on ${pageName} has no source.`))
    if (!element.props.decorative && !String(element.props.alt ?? '').trim()) items.push(issue('suggestion', `An image on ${pageName} does not have alternative text.`))
  }
  if (element.type === 'button') {
    const link = String(element.props.link ?? '').trim()
    if (!link || link === '#') items.push(issue('suggestion', `A button on ${pageName} does not have a destination.`))
    if (isUnsafeLink(link)) items.push(issue('error', `A button on ${pageName} uses an unsafe link.`))
    if (isInternalLink(link) && !pages.has(link)) items.push(issue('error', `A link on ${pageName} points to a page that does not exist.`))
  }
  return items
}

export const checkSite = (project: Project, assets: AssetPreview[]) => {
  const items: SiteIssue[] = []
  const slugs = new Set<string>()
  const pages = new Set(project.pages.map((page) => page.slug))
  if (!project.pages.some((page) => page.slug === '/')) items.push(issue('error', 'Your website needs a homepage with the / path.'))
  for (const page of project.pages) {
    if (!page.name.trim()) items.push(issue('error', 'A page needs a name before it can be exported.'))
    if (!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(page.slug)) items.push(issue('error', `${page.name || 'This page'} has an invalid path.`))
    if (slugs.has(page.slug)) items.push(issue('error', `${page.name || 'A page'} shares a path with another page.`))
    slugs.add(page.slug)
    if (!page.description.trim()) items.push(issue('suggestion', `${page.name || 'This page'} could use a description.`))
    const headings = Object.values(page.document.elements).filter((element) => element.type === 'heading' && element.props.level === 'h1')
    if (headings.length === 0) items.push(issue('suggestion', `${page.name || 'This page'} does not have a main heading.`))
    if (headings.length > 1) items.push(issue('suggestion', `${page.name || 'This page'} has more than one main heading.`))
  }
  const assetIds = new Set(assets.map((asset) => asset.id))
  for (const { page, element } of pageElements(project)) items.push(...checkElement(element, page.name || 'this page', assetIds, pages))
  return items
}
