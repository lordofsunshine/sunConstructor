import type { ElementType, SiteElement } from './types'
import { token } from '../theme/types'
import { randomId } from './ids'

const id = () => randomId()

const names: Record<ElementType, string> = {
  section: 'Section',
  container: 'Container',
  heading: 'Heading',
  text: 'Text',
  button: 'Button',
  image: 'Image',
  divider: 'Divider',
  spacer: 'Spacer',
  row: 'Row',
  stack: 'Stack',
  columns: 'Columns',
}

export const createElement = (type: ElementType, overrides: Partial<SiteElement> = {}): SiteElement => {
  const base: SiteElement = {
    id: id(),
    type,
    name: names[type],
    props: { hidden: false, locked: false },
    styles: {},
    children: [],
  }

  const defaults: Record<ElementType, Partial<SiteElement>> = {
    section: { styles: { background: token('colors.background'), paddingTop: token('spacing.xl'), paddingRight: token('spacing.lg'), paddingBottom: token('spacing.xl'), paddingLeft: token('spacing.lg'), gap: token('spacing.md'), direction: 'column', align: 'stretch', justify: 'start', wrap: false } },
    container: { styles: { maxWidth: 1120, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, align: 'center', gap: 16, direction: 'column', justify: 'start', wrap: false } },
    heading: { content: 'A clear heading', props: { hidden: false, locked: false, level: 'h1' }, styles: { fontFamily: token('typography.headingFont'), fontSize: 52, lineHeight: 1.05, letterSpacing: 0, textAlign: 'left', color: token('colors.text'), textDecoration: 'none', textTransform: 'none' } },
    text: { content: 'Write a short, useful piece of copy that gives this section a purpose.', styles: { fontFamily: token('typography.bodyFont'), fontSize: 18, lineHeight: 1.55, letterSpacing: 0, textAlign: 'left', color: token('colors.muted'), textDecoration: 'none', textTransform: 'none' } },
    button: { content: 'Get started', props: { hidden: false, locked: false, link: '#' }, styles: { fontFamily: token('button.fontFamily'), fontWeight: token('button.fontWeight'), fontStyle: token('button.fontStyle'), textColor: token('button.textColor'), background: token('button.background'), radius: token('button.radius') } },
    image: { props: { hidden: false, locked: false, src: '', alt: 'Image', fit: 'cover' }, styles: { width: '100%', height: 320, radius: token('radius.medium') } },
    divider: { styles: { width: '100%', thickness: 1, color: token('colors.muted') } },
    spacer: { styles: { height: 48 } },
    row: { styles: { gap: 18, direction: 'row', align: 'center', justify: 'start', wrap: true } },
    stack: { styles: { gap: 18, direction: 'column', align: 'stretch', justify: 'start', wrap: false } },
    columns: { styles: { gap: 24, direction: 'row', align: 'stretch', justify: 'start', wrap: true } },
  }

  const current = defaults[type]
  return {
    ...base,
    ...current,
    ...overrides,
    props: { ...base.props, ...current.props, ...overrides.props },
    styles: { ...base.styles, ...current.styles, ...overrides.styles },
    children: overrides.children ?? current.children ?? base.children,
  }
}

export const elementLabel = (element: SiteElement) => element.name?.trim() || names[element.type]
