export type ElementType =
  | 'section'
  | 'container'
  | 'heading'
  | 'text'
  | 'button'
  | 'image'
  | 'divider'
  | 'spacer'
  | 'row'
  | 'stack'
  | 'columns'

import type { ProjectTheme, Shadow, StyleValue } from '../theme/types'

export type ElementValue = string | number | boolean
export type ElementStyleValue = StyleValue | Shadow[]
export type ResponsiveMode = 'desktop' | 'tablet' | 'mobile'
export type ResponsiveOverrides = Partial<Record<Exclude<ResponsiveMode, 'desktop'>, Record<string, ElementStyleValue>>>

export interface SiteElement {
  id: string
  type: ElementType
  content?: string
  name?: string
  props: Record<string, ElementValue>
  styles: Record<string, ElementStyleValue>
  responsive?: ResponsiveOverrides
  visibility?: Partial<Record<ResponsiveMode, boolean>>
  children: string[]
}

export interface SiteDocument {
  elements: Record<string, SiteElement>
  rootIds: string[]
}

export interface Project {
  id: string
  name: string
  document: SiteDocument
  pages: Page[]
  activePageId: string
  theme: ProjectTheme
  settings: SiteSettings
  schemaVersion: number
  createdAt: string
  updatedAt: string
}

export interface Page {
  id: string
  name: string
  slug: string
  title: string
  description: string
  socialImageId?: string
  allowIndex?: boolean
  document: SiteDocument
}

export interface SiteSettings {
  language: string
  siteUrl: string
  faviconAssetId?: string
}

export interface AssetRecord {
  id: string
  projectId: string
  name: string
  type: string
  size: number
  createdAt: string
  blob: Blob
}

export interface AssetPreview {
  id: string
  name: string
  type: string
  size: number
  url: string
}

export type TemplateType = 'navigation' | 'hero' | 'logoStrip' | 'features' | 'services' | 'gallery' | 'testimonials' | 'pricing' | 'faq' | 'cta' | 'contact' | 'footer'

export type StarterId = 'blank' | 'coffee' | 'studio' | 'portfolio' | 'restaurant' | 'product'

export interface ReusableSection {
  id: string
  name: string
  document: SiteDocument
  createdAt: string
}

export type EditorPanel = 'add' | 'pages' | 'layers' | 'assets' | 'styles' | 'check'

export type Zoom = 75 | 100 | 125 | 'fit'

export const layoutTypes: ElementType[] = ['section', 'container', 'row', 'stack', 'columns']

export const editableTypes: ElementType[] = ['heading', 'text', 'button']

export const isLayout = (type: ElementType) => layoutTypes.includes(type)

export const isEditable = (type: ElementType) => editableTypes.includes(type)
