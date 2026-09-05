import JSZip from 'jszip'
import type { AssetRecord, Page, Project } from '../model/types'
import { compilePage, siteShellCss } from '../render/siteCompiler'

const cleanSlug = (value: string) => value.replace(/^\/+|\/+$/g, '')
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"`]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '`': '&#96;' })[character]!)

const pagePath = (page: Page) => page.slug === '/' ? 'index.html' : `${cleanSlug(page.slug)}/index.html`

const relativeAsset = (page: Page, value: string) => {
  if (!value || /^(data:|https?:\/\/|\/)/i.test(value) || page.slug === '/') return value
  return `../${value}`
}

const headFor = (page: Page, project: Project, names: Map<string, string>) => {
  const prefix = page.slug === '/' ? '' : '../'
  const siteUrl = project.settings.siteUrl.trim().replace(/["'`<>]/g, '').replace(/\/$/, '')
  const socialImage = page.socialImageId ? names.get(page.socialImageId) : ''
  const favicon = project.settings.faviconAssetId ? names.get(project.settings.faviconAssetId) : ''
  const canonical = siteUrl ? `<link rel="canonical" href="${escapeHtml(`${siteUrl}${page.slug}`)}">` : ''
  const social = socialImage ? `<meta property="og:title" content="${escapeHtml(page.title)}"><meta property="og:description" content="${escapeHtml(page.description)}"><meta property="og:image" content="${escapeHtml(`${prefix}${socialImage}`)}">` : ''
  return `${canonical}${social}${favicon ? `<link rel="icon" href="${escapeHtml(`${prefix}${favicon}`)}">` : ''}`
}

export const exportWebsite = async (project: Project, assets: AssetRecord[]) => {
  const zip = new JSZip()
  const used = new Set<string>()
  for (const page of project.pages) {
    for (const element of Object.values(page.document.elements)) {
      if (typeof element.props.assetId === 'string') used.add(element.props.assetId)
    }
    if (page.socialImageId) used.add(page.socialImageId)
  }
  if (project.settings.faviconAssetId) used.add(project.settings.faviconAssetId)

  const names = new Map<string, string>()
  for (const asset of assets.filter((item) => used.has(item.id))) {
    const safeName = asset.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || `image-${names.size + 1}`
    const preferred = `assets/images/${names.size ? `${names.size + 1}-` : ''}${safeName}`
    const name = [...names.values()].includes(preferred) ? `assets/images/${names.size + 1}-${safeName}` : preferred
    names.set(asset.id, name)
    zip.file(name, asset.blob)
  }

  const pageCss = project.pages.map((page) => compilePage(page, project).css.replace(`${siteShellCss}\n`, '')).join('\n')
  zip.file('styles/site.css', `${siteShellCss}\n${pageCss}`)
  for (const page of project.pages) {
    const stylesheetHref = page.slug === '/' ? 'styles/site.css' : '../styles/site.css'
    const compiled = compilePage(page, project, {
      assetUrl: (id) => relativeAsset(page, names.get(id) ?? ''),
      stylesheetHref,
      head: headFor(page, project, names),
      reveal: true,
    })
    zip.file(pagePath(page), compiled.html)
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

export const websiteExportName = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'website'}.zip`
