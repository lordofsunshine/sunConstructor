import { createElement } from './elements'
import type { ElementStyleValue, ElementType, SiteDocument } from './types'
import { literal } from '../theme/types'

const elementTypes = new Set<ElementType>(['section', 'container', 'heading', 'text', 'button', 'image', 'divider', 'spacer', 'row', 'stack', 'columns'])

const number = (value: string | undefined) => {
  if (!value) return undefined
  const result = Number(value)
  return Number.isFinite(result) ? result : undefined
}

const padding = (value: string | undefined): Record<string, ElementStyleValue> => {
  if (!value) return {}
  const values = value.split(/\s+/).map(Number).filter(Number.isFinite)
  if (!values.length) return {}
  const [top, right = top, bottom = top, left = right] = values
  return { paddingTop: top, paddingRight: right, paddingBottom: bottom, paddingLeft: left }
}

const inlineText = (node: Node): string => {
  if (node.nodeName === 'BR') return '\n'
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  // scripts carry code, not copy, so leave their text behind
  if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.nodeName)) return ''
  return Array.from(node.childNodes).map(inlineText).join('')
}

const typeFor = (node: HTMLElement): ElementType | null => {
  const declared = node.dataset.sc
  if (declared && elementTypes.has(declared as ElementType)) return declared as ElementType
  if (/^H[1-6]$/.test(node.tagName)) return 'heading'
  if (node.tagName === 'P') return 'text'
  if (node.tagName === 'A' || node.tagName === 'BUTTON') return 'button'
  if (node.tagName === 'IMG') return 'image'
  if (node.tagName === 'HR') return 'divider'
  return null
}

const stylesFor = (node: HTMLElement, type: ElementType): Record<string, ElementStyleValue> => {
  const styles: Record<string, ElementStyleValue> = { ...padding(node.dataset.scPadding) }
  const literalAttributes: Record<string, string | undefined> = {
    background: node.dataset.scBg,
    fontFamily: node.dataset.scFont,
    textAlign: node.dataset.scTextAlign,
    direction: node.dataset.scDirection,
    align: node.dataset.scAlign,
    justify: node.dataset.scJustify,
    borderColor: node.dataset.scBorderColor,
  }
  for (const [key, value] of Object.entries(literalAttributes)) if (value) styles[key] = literal(value)
  if (node.dataset.scColor) styles[type === 'button' ? 'textColor' : 'color'] = literal(node.dataset.scColor)
  const numberAttributes: Record<string, string | undefined> = {
    gap: node.dataset.scGap,
    maxWidth: node.dataset.scMaxWidth,
    minHeight: node.dataset.scMinHeight,
    radius: node.dataset.scRadius,
    borderWidth: node.dataset.scBorderWidth,
    fontSize: node.dataset.scSize,
    fontWeight: node.dataset.scWeight,
    lineHeight: node.dataset.scLine,
    letterSpacing: node.dataset.scTracking,
    height: node.dataset.scHeight,
    width: node.dataset.scWidth,
    thickness: node.dataset.scThickness,
    paddingX: node.dataset.scPaddingX,
    paddingY: node.dataset.scPaddingY,
  }
  for (const [key, value] of Object.entries(numberAttributes)) {
    const parsed = number(value)
    if (parsed !== undefined) styles[key] = parsed
  }
  if (node.dataset.scWrap === 'true') styles.wrap = true
  if (node.dataset.scBorder === 'solid') styles.borderStyle = 'solid'
  if (node.dataset.scDecoration) styles.textDecoration = node.dataset.scDecoration
  return styles
}

const responsiveStylesFor = (node: HTMLElement, type: ElementType, mode: 'tablet' | 'mobile') => {
  const attribute = (name: string) => node.getAttribute(`data-sc-${mode}-${name}`) ?? undefined
  const styles: Record<string, ElementStyleValue> = { ...padding(attribute('padding')) }
  const literals: Record<string, string | undefined> = {
    background: attribute('bg'),
    fontFamily: attribute('font'),
    textAlign: attribute('text-align'),
    direction: attribute('direction'),
    align: attribute('align'),
    justify: attribute('justify'),
    borderColor: attribute('border-color'),
  }
  for (const [key, value] of Object.entries(literals)) if (value) styles[key] = literal(value)
  const color = attribute('color')
  if (color) styles[type === 'button' ? 'textColor' : 'color'] = literal(color)
  const numbers: Record<string, string | undefined> = {
    gap: attribute('gap'),
    maxWidth: attribute('max-width'),
    minHeight: attribute('min-height'),
    radius: attribute('radius'),
    borderWidth: attribute('border-width'),
    fontSize: attribute('size'),
    fontWeight: attribute('weight'),
    lineHeight: attribute('line'),
    letterSpacing: attribute('tracking'),
    height: attribute('height'),
    width: attribute('width'),
    paddingX: attribute('padding-x'),
    paddingY: attribute('padding-y'),
  }
  for (const [key, value] of Object.entries(numbers)) {
    const parsed = number(value)
    if (parsed !== undefined) styles[key] = parsed
  }
  const wrap = attribute('wrap')
  if (wrap) styles.wrap = wrap === 'true'
  return styles
}

const addNode = (node: HTMLElement, document: SiteDocument): string | null => {
  const type = typeFor(node)
  if (!type) return null
  const rawContent = type === 'heading' || type === 'text' || type === 'button' ? inlineText(node).replace(/[ \t]+/g, ' ').trim() || undefined : undefined
  const content = rawContent
  const props: Record<string, string | number | boolean> = {}
  if (type === 'heading') props.level = node.dataset.scLevel ?? node.tagName.toLowerCase()
  if (type === 'button') props.link = node.getAttribute('href') ?? '#'
  if (type === 'image') {
    props.src = node.getAttribute('src') ?? ''
    props.alt = node.getAttribute('alt') ?? ''
    props.decorative = !props.alt
    props.fit = node.dataset.scFit ?? 'cover'
  }
  const tablet = responsiveStylesFor(node, type, 'tablet')
  const mobile = responsiveStylesFor(node, type, 'mobile')
  const responsive = Object.keys(tablet).length || Object.keys(mobile).length ? { ...(Object.keys(tablet).length ? { tablet } : {}), ...(Object.keys(mobile).length ? { mobile } : {}) } : undefined
  const element = createElement(type, { content, name: node.dataset.scName, props, styles: stylesFor(node, type), responsive })
  document.elements[element.id] = element
  for (const child of Array.from(node.children)) {
    const childId = addNode(child as HTMLElement, document)
    if (childId) element.children.push(childId)
  }
  return element.id
}

export const parseHtmlTemplate = (source: string): SiteDocument => {
  const parsed = new DOMParser().parseFromString(source, 'text/html')
  const document: SiteDocument = { elements: {}, rootIds: [] }
  for (const node of Array.from(parsed.body.children)) {
    const id = addNode(node as HTMLElement, document)
    if (id) document.rootIds.push(id)
  }
  return document
}
