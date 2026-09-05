import { findFont, fontFallback } from '../fonts/catalog'
import type { ElementStyleValue, Page, Project, SiteElement } from '../model/types'
import { resolveStyleValue } from '../theme/projectTheme'
import type { Shadow, StyleValue } from '../theme/types'

export interface CompilePageOptions {
  assetUrl?: (id: string) => string
  head?: string
  stylesheetHref?: string
  selectedId?: string | null
  previewFont?: string | null
  reveal?: boolean
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"`]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '`': '&#96;' })[character]!)
const cssUrl = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\n\r\f]/g, '')

const stripLeadingControls = (value: string) => {
  let start = 0
  while (start < value.length && value.charCodeAt(start) <= 32) start += 1
  return value.slice(start)
}

export const isUnsafeLink = (link: string) => /^(?:javascript|vbscript|data):/i.test(stripLeadingControls(link))

export const sanitizeLink = (link: string) => isUnsafeLink(link) ? '#' : link

const hashId = (id: string) => {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash = ((hash << 5) - hash + id.charCodeAt(index)) | 0
  return Math.abs(hash).toString(36).padStart(6, '0')
}

export const siteClassName = (id: string) => `sc-${id.replace(/[^a-z0-9]/gi, '').slice(0, 8)}-${hashId(id).slice(0, 4)}`

const resolveValue = (item: ElementStyleValue | undefined, project: Project, fallback: string | number = '') => {
  if (Array.isArray(item)) return fallback
  return resolveStyleValue(item as StyleValue | undefined, project.theme, fallback)
}

const pixelKeys = new Set(['fontSize', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'paddingX', 'paddingY', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap', 'width', 'height', 'maxWidth', 'minHeight', 'borderWidth', 'radius', 'radiusTopLeft', 'radiusTopRight', 'radiusBottomRight', 'radiusBottomLeft', 'thickness', 'letterSpacing', 'blur'])

const cssValue = (key: string, item: ElementStyleValue | undefined, project: Project) => {
  const resolved = resolveValue(item, project)
  if (resolved === '') return ''
  if (key === 'lineHeight' && resolved === 'auto') return 'normal'
  if (pixelKeys.has(key) && typeof resolved === 'number') return `${resolved}px`
  return String(resolved)
}

const withDefaults = (element: SiteElement, styles: Record<string, ElementStyleValue>, project: Project, mode: 'desktop' | 'tablet' | 'mobile') => {
  if (mode !== 'desktop') return styles
  const next = { ...styles }
  const type = element.type
  if (type === 'heading' || type === 'text' || type === 'button') {
    const fallback = type === 'heading' ? project.theme.typography.heading : type === 'button' ? project.theme.button.font : project.theme.typography.body
    if (next.fontFamily === undefined) next.fontFamily = fallback.family
    if (next.fontWeight === undefined) next.fontWeight = fallback.weight
    if (next.fontStyle === undefined) next.fontStyle = fallback.style
  }
  if (type === 'button') {
    if (next.background === undefined) next.background = project.theme.button.background
    if (next.textColor === undefined) next.textColor = project.theme.button.textColor
    if (next.radius === undefined) next.radius = project.theme.button.radius
    if (next.paddingX === undefined) next.paddingX = project.theme.button.paddingX
    if (next.paddingY === undefined) next.paddingY = project.theme.button.paddingY
    if (next.borderStyle === undefined) next.borderStyle = project.theme.button.borderStyle
    if (next.borderWidth === undefined) next.borderWidth = project.theme.button.borderWidth
    if (next.borderColor === undefined) next.borderColor = project.theme.button.borderColor
  }
  return next
}

const shadowValue = (items: Shadow[], project: Project) => items.map((shadow) => {
  const color = String(resolveStyleValue(shadow.color, project.theme, '#000000'))
  const alpha = Math.round(Math.max(0, Math.min(100, shadow.opacity)) * 2.55).toString(16).padStart(2, '0')
  const resolvedColor = /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
  return `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${resolvedColor}`
}).join(', ')

const declarations = (element: SiteElement, project: Project, mode: 'desktop' | 'tablet' | 'mobile', options: CompilePageOptions) => {
  const raw = mode === 'desktop' ? element.styles : mode === 'tablet' ? element.responsive?.tablet ?? {} : { ...(element.responsive?.tablet ?? {}), ...(element.responsive?.mobile ?? {}) }
  const styles = withDefaults(element, raw, project, mode)
  if (mode === 'desktop' && options.selectedId === element.id && options.previewFont) styles.fontFamily = options.previewFont
  const properties: Record<string, string> = {
    background: 'background', color: 'color', textColor: 'color', fontFamily: 'font-family', fontSize: 'font-size', fontWeight: 'font-weight', fontStyle: 'font-style', lineHeight: 'line-height', letterSpacing: 'letter-spacing', textAlign: 'text-align', textDecoration: 'text-decoration', textTransform: 'text-transform', paddingTop: 'padding-top', paddingRight: 'padding-right', paddingBottom: 'padding-bottom', paddingLeft: 'padding-left', marginTop: 'margin-top', marginRight: 'margin-right', marginBottom: 'margin-bottom', marginLeft: 'margin-left', gap: 'gap', maxWidth: 'max-width', minHeight: 'min-height', width: 'width', height: 'height', borderStyle: 'border-style', borderWidth: 'border-width', borderColor: 'border-color', radius: 'border-radius', radiusTopLeft: 'border-top-left-radius', radiusTopRight: 'border-top-right-radius', radiusBottomRight: 'border-bottom-right-radius', radiusBottomLeft: 'border-bottom-left-radius', opacity: 'opacity', order: 'order', direction: 'flex-direction', wrap: 'flex-wrap', align: 'align-items', justify: 'justify-content', thickness: 'height',
  }
  return Object.entries(styles).flatMap(([key, item]) => {
    if (key === 'shadows' && Array.isArray(item)) {
      const value = shadowValue(item as Shadow[], project)
      return value ? [`box-shadow:${value}`] : []
    }
    if (key === 'paddingX' || key === 'paddingY') {
      const value = cssValue(key, item, project)
      if (!value) return []
      return key === 'paddingX' ? [`padding-left:${value}`, `padding-right:${value}`] : [`padding-top:${value}`, `padding-bottom:${value}`]
    }
    if (key === 'blur') {
      const value = cssValue(key, item, project)
      return value && value !== '0' && value !== '0px' ? [`filter:blur(${value})`] : []
    }
    if (key === 'backgroundMode' || key === 'backgroundImage' || Array.isArray(item)) return []
    const property = properties[key]
    const value = cssValue(key, item, project)
    if (!property || !value) return []
    if (key === 'fontFamily') return [`${property}:"${cssUrl(value)}",${fontFallback(value)}`]
    if (key === 'opacity') return [`${property}:${Number(value) / 100}`]
    if (key === 'wrap') return [`${property}:${value === 'true' ? 'wrap' : 'nowrap'}`]
    if (key === 'align') return [`${property}:${value === 'start' ? 'flex-start' : value === 'end' ? 'flex-end' : value}`]
    if (key === 'justify') return [`${property}:${value === 'start' ? 'flex-start' : value === 'end' ? 'flex-end' : value === 'between' ? 'space-between' : value}`]
    if (key === 'textAlign' && element.type === 'button') {
      // text-align only centers the label, the button itself needs align-self to follow
      const self = value === 'center' ? 'center' : value === 'right' ? 'flex-end' : value === 'left' ? 'flex-start' : ''
      return self ? [`${property}:${value}`, `align-self:${self}`] : [`${property}:${value}`]
    }
    return [`${property}:${value}`]
  }).join(';')
}

const backgroundDeclaration = (element: SiteElement, project: Project) => {
  const mode = String(resolveValue(element.styles.backgroundMode, project, 'solid'))
  const background = String(resolveValue(element.styles.background, project, ''))
  if (mode === 'gradient' && background) return `background:${background}`
  if (mode === 'image' && typeof element.styles.backgroundImage === 'string' && element.styles.backgroundImage) return `background:url("${cssUrl(element.styles.backgroundImage)}") center/cover`
  return ''
}

const displayFor = (element: SiteElement) => {
  if (['section', 'container', 'row', 'stack', 'columns'].includes(element.type)) return 'display:flex'
  if (element.type === 'image') return `display:block;max-width:100%;object-fit:${escapeHtml(element.props.fit ?? 'cover')}`
  if (element.type === 'button') return 'display:inline-flex;align-items:center;justify-content:center;width:max-content'
  return 'display:block'
}

export const compilePageCss = (page: Page, project: Project, options: CompilePageOptions = {}) => Object.values(page.document.elements).map((element) => {
  const selector = `.${siteClassName(element.id)}`
  const display = displayFor(element)
  const base = [display, element.visibility?.desktop === false ? 'display:none' : '', declarations(element, project, 'desktop', options), backgroundDeclaration(element, project)].filter(Boolean).join(';')
  const tabletVisibility = element.visibility?.tablet === false ? 'display:none' : element.visibility?.tablet === true && element.visibility?.desktop === false ? display : ''
  const mobileVisibility = element.visibility?.mobile === false ? 'display:none' : element.visibility?.mobile === true && (element.visibility?.desktop === false || element.visibility?.tablet === false) ? display : ''
  const tablet = [declarations(element, project, 'tablet', options), tabletVisibility].filter(Boolean).join(';')
  const mobile = [declarations(element, project, 'mobile', options), mobileVisibility].filter(Boolean).join(';')
  return `${selector}{${base}}${tablet ? `@media(max-width:991px){${selector}{${tablet}}}` : ''}${mobile ? `@media(max-width:767px){${selector}{${mobile}}}` : ''}`
}).join('\n')

const tagFor = (element: SiteElement) => element.type === 'section' ? 'section' : element.type === 'heading' ? String(element.props.level ?? 'h1') : element.type === 'text' ? 'p' : element.type === 'button' ? 'a' : element.type === 'divider' ? 'hr' : 'div'

const linkFor = (link: string, page: Page) => {
  if (!link.startsWith('/')) return link
  if (page.slug === '/') return link === '/' ? 'index.html' : `${link.replace(/^\/+|\/+$/g, '')}/index.html`
  return link === '/' ? '../index.html' : `../${link.replace(/^\/+|\/+$/g, '')}/index.html`
}

const renderElement = (element: SiteElement, page: Page, project: Project, options: CompilePageOptions, imageIndex: { value: number }): string => {
  const layout = ['section', 'container', 'row', 'stack', 'columns'].includes(element.type) ? ' sc-layout' : ''
  const classes = `${siteClassName(element.id)} sc-${element.type}${layout}`
  const attributes = `class="${classes}" data-element-id="${escapeHtml(element.id)}"`
  if (element.type === 'image') {
    const assetId = typeof element.props.assetId === 'string' ? element.props.assetId : ''
    const source = assetId ? options.assetUrl?.(assetId) ?? '' : String(element.props.src ?? '')
    if (!source) return `<div ${attributes} data-missing-image="true" role="img" aria-label="Image source missing"></div>`
    const alt = element.props.decorative ? '' : String(element.props.alt ?? '')
    const loading = imageIndex.value++ === 0 ? 'eager' : 'lazy'
    return `<img ${attributes} src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async">`
  }
  const tag = tagFor(element)
  const content = element.type === 'divider' || element.type === 'spacer' ? '' : escapeHtml(element.content)
  const children = element.children.map((id) => page.document.elements[id]).filter(Boolean).map((child) => renderElement(child, page, project, options, imageIndex)).join('')
  if (element.type === 'button') {
    const link = sanitizeLink(String(element.props.link ?? '#'))
    const external = /^(https?:)?\/\//i.test(link) && !link.startsWith('/')
    return `<a ${attributes} href="${escapeHtml(linkFor(link, page))}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${content}</a>`
  }
  return `<${tag} ${attributes}>${content}${children}</${tag}>`
}

const collectFonts = (project: Project, options: CompilePageOptions) => {
  const families = new Set([project.theme.typography.heading.family, project.theme.typography.body.family, project.theme.button.font.family])
  if (options.previewFont) families.add(options.previewFont)
  for (const page of project.pages) {
    for (const element of Object.values(page.document.elements)) {
      for (const styles of [element.styles, element.responsive?.tablet, element.responsive?.mobile]) {
        const family = styles?.fontFamily
        if (family && !Array.isArray(family)) families.add(String(resolveValue(family, project)))
      }
    }
  }
  return [...families].filter(Boolean)
}

export const compileFontUrl = (project: Project, options: CompilePageOptions = {}) => {
  const families = collectFonts(project, options).map((family) => {
    const weights = findFont(family)?.weights ?? [400, 700]
    return `family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${[...weights].sort((a, b) => a - b).join(';')}`
  })
  return families.length ? `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap` : ''
}

export const siteShellCss = `*{box-sizing:border-box}html{background:#fff;color:#171717;font-family:system-ui,sans-serif}body{margin:0;min-width:320px;overflow-x:clip}main{width:100%}h1,h2,h3,h4,h5,h6,p{margin:0}.sc-heading,.sc-text,.sc-button{white-space:pre-line}.sc-layout{width:100%;min-width:0;flex-direction:column;align-items:stretch;justify-content:flex-start}.sc-container{width:min(100%,1120px);margin-inline:auto}.sc-row{flex-direction:row}.sc-columns{flex-direction:row}.sc-columns>*{flex:1 1 0;min-width:0}.sc-row>*{min-width:0}.sc-button{text-decoration:none;cursor:pointer}.sc-divider{width:100%;border:0;margin:0}.sc-spacer{width:100%}[data-missing-image]{min-height:240px;background:#eee9df}a:focus-visible,[contenteditable=true]:focus-visible{outline:3px solid #d69c00;outline-offset:3px}@media(max-width:767px){.sc-container{width:100%}.sc-columns{flex-direction:column;align-items:stretch!important}.sc-columns>*{width:100%;flex-basis:auto}.sc-row{flex-wrap:wrap}}html.sc-wait main{opacity:0}html.sc-ready main{animation:sc-main-in .45s ease-out}html.sc-ready main>section{animation:sc-enter .65s ease-out backwards}html.sc-ready main>section:nth-child(2){animation-delay:.08s}html.sc-ready main>section:nth-child(3){animation-delay:.16s}html.sc-ready main>section:nth-child(4){animation-delay:.24s}html.sc-ready main>section:nth-child(5){animation-delay:.32s}html.sc-ready main>section:nth-child(6){animation-delay:.4s}html.sc-ready main>section:nth-child(7){animation-delay:.48s}html.sc-ready main>section:nth-child(8){animation-delay:.56s}html.sc-ready main>section:nth-child(n+9){animation-delay:.64s}@keyframes sc-main-in{from{opacity:0}to{opacity:1}}@keyframes sc-enter{from{opacity:0;transform:translateY(20px)}to{opacity:1}}`

const revealBoot = `<script>document.documentElement.classList.add("sc-wait")</script>`

// hold the curtain until fonts and images settle, then let the sections cascade in
const revealReady = `<script>(function(){var l=false,f=false,d=false,t=null;function go(){if(d||!l||!f)return;d=true;if(t)clearTimeout(t);var e=document.documentElement;e.classList.remove("sc-wait");e.classList.add("sc-ready")}function fin(){if(d)return;d=true;if(t)clearTimeout(t);var e=document.documentElement;e.classList.remove("sc-wait");e.classList.add("sc-ready")}t=setTimeout(fin,3200);if(document.readyState==="complete"){l=true}else{addEventListener("load",function(){l=true;go()})}if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){f=true;go()})}else{f=true}go()})()</script>`

export const compilePage = (page: Page, project: Project, options: CompilePageOptions = {}) => {
  const css = `${siteShellCss}\n${compilePageCss(page, project, options)}`
  const fontUrl = compileFontUrl(project, options)
  const imageIndex = { value: 0 }
  const body = page.document.rootIds.map((id) => page.document.elements[id]).filter(Boolean).map((element) => renderElement(element, page, project, options, imageIndex)).join('')
  const title = escapeHtml(page.title.trim() || `${page.name} | ${project.name}`)
  const description = page.description.trim() ? `<meta name="description" content="${escapeHtml(page.description)}">` : ''
  const robots = page.allowIndex === false ? '<meta name="robots" content="noindex,nofollow">' : ''
  const stylesheet = options.stylesheetHref ? `<link rel="stylesheet" href="${escapeHtml(options.stylesheetHref)}">` : `<style>${css}</style>`
  const boot = options.reveal ? revealBoot : ''
  const ready = options.reveal ? revealReady : ''
  const html = `<!doctype html><html lang="${escapeHtml(project.settings.language || 'en')}"><head>${boot}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${description}${robots}${options.head ?? ''}${fontUrl ? `<link rel="stylesheet" href="${escapeHtml(fontUrl)}">` : ''}${stylesheet}</head><body><main>${body}</main>${ready}</body></html>`
  return { html, body, css, fontUrl }
}
