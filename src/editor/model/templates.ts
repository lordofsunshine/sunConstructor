import { createElement } from './elements'
import type { SiteDocument, TemplateType } from './types'
import { literal } from '../theme/types'

const attach = (document: SiteDocument, parentId: string, childId: string) => document.elements[parentId].children.push(childId)

const add = (document: SiteDocument, type: Parameters<typeof createElement>[0], content?: string) => {
  const element = createElement(type, content ? { content } : {})
  document.elements[element.id] = element
  return element.id
}

const art = [
  'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#f5df9b"/><circle cx="572" cy="278" r="205" fill="#e65b46"/><rect x="68" y="70" width="294" height="28" fill="#24221c"/><rect x="68" y="118" width="198" height="14" fill="#24221c"/><path d="M68 416h420" stroke="#24221c" stroke-width="16"/></svg>'),
  'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#dce8f7"/><path d="M0 370 252 86l205 285L638 155l162 215Z" fill="#2f65ba"/><rect x="74" y="68" width="210" height="25" fill="#24221c"/><rect x="74" y="111" width="148" height="13" fill="#24221c"/></svg>'),
  'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#e8dfcf"/><rect x="462" width="338" height="520" fill="#24221c"/><circle cx="568" cy="180" r="110" fill="#f4ce47"/><rect x="66" y="310" width="280" height="32" fill="#24221c"/><rect x="66" y="365" width="194" height="14" fill="#24221c"/></svg>'),
]

const addArt = (document: SiteDocument, index: number) => {
  const image = createElement('image', { props: { src: art[index], alt: '', decorative: true, fit: 'cover' }, styles: { height: 260, radius: 12 } })
  document.elements[image.id] = image
  return image.id
}

const card = (document: SiteDocument, parent: string, title: string, copy: string) => {
  const stack = add(document, 'stack')
  Object.assign(document.elements[stack].styles, { background: literal('#f6f2e8'), paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24, radius: 12 })
  attach(document, parent, stack)
  attach(document, stack, add(document, 'heading', title))
  attach(document, stack, add(document, 'text', copy))
}

const section = (document: SiteDocument) => {
  const root = add(document, 'section')
  document.rootIds.push(root)
  const container = add(document, 'container')
  attach(document, root, container)
  return { root, container }
}

const addColumns = (document: SiteDocument, parent: string, cards: [string, string][]) => {
  const columns = add(document, 'columns')
  attach(document, parent, columns)
  cards.forEach(([title, copy]) => card(document, columns, title, copy))
}

export const createTemplate = (type: TemplateType) => {
  const document: SiteDocument = { elements: {}, rootIds: [] }
  const { root, container } = section(document)

  if (type === 'navigation') {
    const row = add(document, 'row')
    document.elements[row].styles.justify = 'between'
    attach(document, container, row)
    attach(document, row, add(document, 'heading', 'Your studio'))
    attach(document, row, add(document, 'text', 'Work  About  Contact'))
    attach(document, row, add(document, 'button', 'Get in touch'))
  }

  if (type === 'hero') {
    Object.assign(document.elements[root].styles, { paddingTop: 112, paddingBottom: 112 })
    attach(document, container, add(document, 'heading', 'Build the useful version first.'))
    attach(document, container, add(document, 'text', 'A calm starter section with room for a point of view, proof and one clear next step.'))
    attach(document, container, add(document, 'button', 'Create your page'))
  }

  if (type === 'logoStrip') {
    attach(document, container, add(document, 'text', 'Selected by people who care about the small details.'))
    const row = add(document, 'row')
    document.elements[row].styles.justify = 'between'
    attach(document, container, row)
    ;['FIELD', 'SLOW', 'LANTERN', 'NORTH'].forEach((name) => attach(document, row, add(document, 'heading', name)))
  }

  if (type === 'features') {
    attach(document, container, add(document, 'heading', 'Made for a page with momentum'))
    addColumns(document, container, [['Compose', 'Put essential ideas in order.'], ['Refine', 'Choose spacing and type that feels considered.'], ['Publish', 'Keep the result simple and yours.']])
  }

  if (type === 'services') {
    attach(document, container, add(document, 'heading', 'A focused way to work together'))
    addColumns(document, container, [['Direction', 'Clarify what the page needs to say.'], ['Design', 'Build a deliberate visual system.'], ['Launch', 'Leave with a site you can keep.']])
  }

  if (type === 'gallery') {
    attach(document, container, add(document, 'heading', 'A few recent pieces'))
    const columns = add(document, 'columns')
    attach(document, container, columns)
    ;['One good idea.', 'A closer look.', 'Made for the details.'].forEach((copy, index) => {
      const stack = add(document, 'stack')
      attach(document, columns, stack)
      attach(document, stack, addArt(document, index))
      attach(document, stack, add(document, 'text', copy))
    })
  }

  if (type === 'testimonials') {
    document.elements[root].styles.background = literal('#fff4bf')
    attach(document, container, add(document, 'heading', '“The work felt clear from the very first conversation.”'))
    attach(document, container, add(document, 'text', 'Client name · role to confirm'))
  }

  if (type === 'pricing') {
    attach(document, container, add(document, 'heading', 'Choose the amount of support you need'))
    addColumns(document, container, [['Start', 'A strong single page and a useful foundation.'], ['Grow', 'A considered site with the important pages in place.'], ['Keep going', 'An ongoing partnership for work that evolves.']])
  }

  if (type === 'faq') {
    attach(document, container, add(document, 'heading', 'Questions, answered simply'))
    ;[['How does it work?', 'Start with the page that matters most.'], ['Can I change it later?', 'Yes. Every part remains editable.'], ['Where do my files go?', 'You keep them locally until export.']].forEach(([title, copy]) => card(document, container, title, copy))
  }

  if (type === 'cta') {
    document.elements[root].styles.background = literal('#171714')
    attach(document, container, add(document, 'heading', 'Ready when the idea is.'))
    attach(document, container, add(document, 'text', 'Begin with the smallest useful version.'))
    attach(document, container, add(document, 'button', 'Start your project'))
    document.elements[container].children.forEach((id) => { document.elements[id].styles.color = literal('#fffdf8') })
  }

  if (type === 'contact') {
    attach(document, container, add(document, 'heading', 'Tell us what you are making.'))
    attach(document, container, add(document, 'text', 'hello@example.com'))
    attach(document, container, add(document, 'button', 'Send an email'))
  }

  if (type === 'footer') {
    document.elements[root].styles.background = literal('#171714')
    attach(document, container, add(document, 'heading', 'Make it worth opening.'))
    attach(document, container, add(document, 'text', '© 2026 · made with sunConstructor'))
    document.elements[container].children.forEach((id) => { document.elements[id].styles.color = literal('#fffdf8') })
  }

  if (type !== 'hero') Object.values(document.elements).filter((element) => element.type === 'heading').forEach((element) => { element.props.level = 'h2' })

  return document
}
