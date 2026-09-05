import { create } from 'zustand'
import { createElement } from '../model/elements'
import { randomId } from '../model/ids'
import { cloneDocument, duplicateNode, findParent, isInside, moveNode, removeNode, subtreeIds } from '../model/tree'
import { createTemplate } from '../model/templates'
import { isLayout, type AssetPreview, type AssetRecord, type EditorPanel, type ElementStyleValue, type ElementType, type Page, type Project, type ReusableSection, type ResponsiveMode, type SiteDocument, type SiteElement, type StarterId, type TemplateType, type Zoom } from '../model/types'
import { deleteAsset, deleteProject, listProjects, loadAssetRecords, loadAssets, loadProject, normalizeProject, saveAsset, saveProject } from '../storage/projectStorage'
import { defaultTheme } from '../theme/projectTheme'
import type { ProjectTheme } from '../theme/types'
import { viewportWidths } from '../responsive/responsiveStyles'
import { backupName, createBackup, readBackup } from '../storage/backup'
import { exportWebsite, websiteExportName } from '../export/websiteExport'
import { checkSite, type SiteIssue } from '../export/siteCheck'
import { createStarterDocument, starterById } from '../model/starters'
import { saveReusableSection } from '../storage/sectionLibrary'

interface Clipboard {
  sourceId: string
  document: SiteDocument
}

interface EditorState {
  project: Project | null
  projects: Project[]
  assets: AssetPreview[]
  selectedId: string | null
  activePanel: EditorPanel
  zoom: Zoom
  viewport: ResponsiveMode
  viewportWidth: number
  past: Project[]
  future: Project[]
  clipboard: Clipboard | null
  typingId: string | null
  transaction: Project | null
  initialized: boolean
  siteIssues: SiteIssue[]
  hydrate: () => Promise<void>
  createProject: (name: string, starter?: StarterId) => Promise<void>
  openProject: (id: string) => Promise<void>
  startNew: () => void
  refreshProjects: () => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  duplicateProject: (id: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  setViewport: (viewport: ResponsiveMode) => void
  setViewportWidth: (width: number) => void
  addPage: (name: string, slug?: string) => void
  selectPage: (id: string) => void
  renamePage: (id: string, name: string) => void
  duplicatePage: (id: string) => void
  deletePage: (id: string) => void
  updatePage: (id: string, patch: Partial<Pick<Page, 'name' | 'slug' | 'title' | 'description' | 'socialImageId' | 'allowIndex'>>) => void
  setVisibility: (id: string, visible: boolean) => void
  addAssets: (files: File[]) => Promise<void>
  removeAsset: (id: string) => Promise<void>
  exportProject: (id: string) => Promise<void>
  exportWebsite: () => Promise<void>
  checkSite: () => void
  importProject: (file: File) => Promise<void>
  select: (id: string | null) => void
  setPanel: (panel: EditorPanel) => void
  setZoom: (zoom: Zoom) => void
  addElement: (type: ElementType, parentId?: string | null, index?: number) => void
  addAssetImage: (assetId: string, parentId?: string | null, index?: number) => void
  addTemplate: (type: TemplateType, parentId?: string | null) => void
  insertReusableSection: (section: ReusableSection) => void
  saveReusableSection: (id: string) => void
  updateElement: (id: string, patch: Partial<Pick<SiteElement, 'content' | 'name'>>) => void
  updateContent: (id: string, content: string) => void
  updateProps: (id: string, props: Record<string, string | number | boolean>) => void
  updateStyles: (id: string, styles: Record<string, ElementStyleValue>, record?: boolean) => void
  resetStyle: (id: string, key: string) => void
  updateTheme: (update: (theme: ProjectTheme) => void, record?: boolean) => void
  updateProject: (update: (project: Project) => void, record?: boolean) => void
  beginTransaction: () => void
  commitTransaction: () => void
  deleteElement: (id?: string) => void
  duplicateElement: (id?: string) => void
  moveElement: (id: string, parentId: string | null, index?: number) => void
  toggleHidden: (id?: string) => void
  toggleLocked: (id?: string) => void
  copy: () => void
  paste: () => void
  undo: () => void
  redo: () => void
  finishTyping: () => void
}

const now = () => new Date().toISOString()

const getUrlProjectId = () => {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/^\/builder\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

const syncUrl = (id: string | null) => {
  if (typeof window === 'undefined') return
  const current = getUrlProjectId()
  if (current === id) return
  const next = id ? `/builder/${encodeURIComponent(id)}` : '/builder'
  window.history.pushState({}, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const slugify = (name: string) => `/${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'page'}`

const uniqueSlug = (pages: Page[], preferred: string) => {
  const normalized = preferred.trim() || '/'
  const base = normalized === '/' ? '/' : `/${normalized.replace(/^\/+|\/+$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'page'}`
  if (base === '/') {
    if (!pages.some((page) => page.slug === '/')) return '/'
    let index = 2
    while (pages.some((page) => page.slug === `/page-${index}`)) index += 1
    return `/page-${index}`
  }
  if (!pages.some((page) => page.slug === base)) return base
  let index = 2
  while (pages.some((page) => page.slug === `${base}-${index}`)) index += 1
  return `${base}-${index}`
}

let saveQueue: Promise<void> = Promise.resolve()
const scheduleSave = (project: Project) => {
  saveQueue = saveQueue.then(() => saveProject(project)).catch(() => saveProject(project))
}

const copyDocument = (source: SiteDocument): SiteDocument => {
  const document = structuredClone(source)
  const ids = new Map(Object.keys(document.elements).map((id) => [id, randomId()]))
  const elements: SiteDocument['elements'] = {}
  for (const [id, element] of Object.entries(document.elements)) {
    const nextId = ids.get(id)!
    const cloned = structuredClone(element)
    cloned.id = nextId
    cloned.children = element.children.map((childId) => ids.get(childId)!)
    elements[nextId] = cloned
  }
  return { elements, rootIds: document.rootIds.map((id) => ids.get(id)!) }
}

const remapAssetReferences = (project: Project, assets: Map<string, string>) => {
  for (const page of project.pages) {
    for (const element of Object.values(page.document.elements)) {
      const assetId = element.props.assetId
      if (typeof assetId === 'string' && assets.has(assetId)) element.props.assetId = assets.get(assetId)!
    }
  }
}

const syncList = (state: EditorState, next: Project) => state.projects.some((item) => item.id === next.id)
  ? state.projects.map((item) => item.id === next.id ? next : item)
  : state.projects

const remember = (state: EditorState, next: Project, record = true) => {
  scheduleSave(next)
  return {
    project: next,
    projects: syncList(state, next),
    past: record ? [...state.past, state.project!].slice(-50) : state.past,
    future: record ? [] : state.future,
  }
}

const withDocument = (state: EditorState, update: (document: SiteDocument) => void, record = true) => {
  if (!state.project) return {}
  const document = cloneDocument(state.project.document)
  const before = JSON.stringify(document)
  update(document)
  if (JSON.stringify(document) === before) return {}
  const clonedProject = structuredClone(state.project)
  const project = { ...clonedProject, document, updatedAt: now() }
  project.pages = project.pages.map((page) => page.id === project.activePageId ? { ...page, document } : page)
  return remember(state, project, record)
}

const withTheme = (state: EditorState, update: (theme: ProjectTheme) => void, record = true) => {
  if (!state.project) return {}
  const project = structuredClone(state.project)
  update(project.theme)
  return remember(state, { ...project, updatedAt: now() }, record)
}

const withProject = (state: EditorState, update: (project: Project) => void, record = true) => {
  if (!state.project) return {}
  const project = structuredClone(state.project)
  update(project)
  return remember(state, { ...project, updatedAt: now() }, record)
}

const resolveLayoutParent = (document: SiteDocument, parentId: string | null, index?: number) => {
  if (!parentId || !document.elements[parentId]) return { parentId, index }
  if (isLayout(document.elements[parentId].type)) return { parentId, index }
  // headings and friends can't hold children, so just land right after them
  const grandparent = findParent(document, parentId)
  const siblings = grandparent ? document.elements[grandparent].children : document.rootIds
  return { parentId: grandparent, index: siblings.indexOf(parentId) + 1 }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  projects: [],
  assets: [],
  selectedId: null,
  activePanel: 'add',
  zoom: 100,
  viewport: 'desktop',
  viewportWidth: viewportWidths.desktop,
  past: [],
  future: [],
  clipboard: null,
  typingId: null,
  transaction: null,
  initialized: false,
  siteIssues: [],
  hydrate: async () => {
    const projects = await listProjects()
    const urlId = getUrlProjectId()
    if (urlId) {
      const found = projects.find((item) => item.id === urlId)
      if (found) {
        const loaded = await loadProject(found.id)
        if (loaded) {
          const assets = await loadAssets(loaded.id)
          try { localStorage.setItem('sunconstructor.last-project', loaded.id) } catch { void 0 }
          set({ projects, project: loaded, assets, initialized: true })
          return
        }
      }
      syncUrl(null)
    }
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href)
        if (url.searchParams.has('dashboard')) {
          url.searchParams.delete('dashboard')
          window.history.replaceState({}, '', url.pathname + url.search + url.hash)
        }
      } catch { void 0 }
    }
    set({ projects, project: null, assets: [], initialized: true })
  },
  refreshProjects: async () => set({ projects: await listProjects() }),
  createProject: async (name, starter = 'coffee') => {
    const createdAt = now()
    const document = createStarterDocument(starter)
    const home: Page = { id: randomId(), name: 'Home', slug: '/', title: `${name.trim()} | Home`, description: starterById(starter).description, document }
    const project: Project = { id: randomId(), name: name.trim() || 'Untitled project', document, pages: [home], activePageId: home.id, theme: defaultTheme(), settings: { language: 'en', siteUrl: '' }, schemaVersion: 3, createdAt, updatedAt: createdAt }
    await saveProject(project)
    try { localStorage.setItem('sunconstructor.last-project', project.id) } catch { void 0 }
    syncUrl(project.id)
    set((state) => ({ project, projects: [project, ...state.projects], assets: [], selectedId: null, past: [], future: [], typingId: null, transaction: null, viewport: 'desktop', viewportWidth: viewportWidths.desktop }))
  },
  openProject: async (id) => {
    const project = await loadProject(id)
    if (!project) {
      syncUrl(null)
      return
    }
    const assets = await loadAssets(project.id)
    try { localStorage.setItem('sunconstructor.last-project', project.id) } catch { void 0 }
    syncUrl(project.id)
    set({ project, assets, selectedId: null, past: [], future: [], typingId: null, transaction: null, viewport: 'desktop', viewportWidth: viewportWidths.desktop })
  },
  startNew: () => {
    const assets = get().assets
    assets.forEach((asset) => URL.revokeObjectURL(asset.url))
    syncUrl(null)
    set({ project: null, assets: [], selectedId: null, past: [], future: [], clipboard: null, typingId: null, transaction: null })
  },
  renameProject: async (id, name) => {
    const project = await loadProject(id)
    if (!project || !name.trim()) return
    const next = { ...project, name: name.trim(), updatedAt: now() }
    await saveProject(next)
    set((state) => ({ projects: state.projects.map((item) => item.id === id ? next : item), project: state.project?.id === id ? next : state.project }))
  },
  duplicateProject: async (id) => {
    const project = await loadProject(id)
    if (!project) return
    const sourceAssets = await loadAssetRecords(id)
    const copy = structuredClone(project)
    copy.id = randomId()
    copy.name = `${project.name} copy`
    copy.createdAt = now()
    copy.updatedAt = copy.createdAt
    copy.pages = copy.pages.map((page) => ({ ...page, id: randomId(), document: copyDocument(page.document) }))
    copy.activePageId = copy.pages[0].id
    copy.document = copy.pages[0].document
    const assetIds = new Map(sourceAssets.map((asset) => [asset.id, randomId()]))
    remapAssetReferences(copy, assetIds)
    await saveProject(copy)
    await Promise.all(sourceAssets.map((asset) => saveAsset({ ...asset, id: assetIds.get(asset.id)!, projectId: copy.id, blob: asset.blob.slice(0, asset.blob.size, asset.blob.type) })))
    set((state) => ({ projects: [copy, ...state.projects] }))
  },
  removeProject: async (id) => {
    await deleteProject(id)
    const isCurrent = get().project?.id === id
    if (isCurrent) syncUrl(null)
    set((state) => ({ projects: state.projects.filter((project) => project.id !== id), project: state.project?.id === id ? null : state.project, assets: state.project?.id === id ? [] : state.assets }))
  },
  setViewport: (viewport) => set({ viewport, viewportWidth: viewportWidths[viewport] }),
  setViewportWidth: (width) => {
    const viewportWidth = Math.max(320, Math.min(1600, Math.round(width)))
    const viewport: ResponsiveMode = viewportWidth <= 767 ? 'mobile' : viewportWidth <= 991 ? 'tablet' : 'desktop'
    set({ viewportWidth, viewport })
  },
  select: (selectedId) => set({ selectedId }),
  setPanel: (activePanel) => set({ activePanel }),
  setZoom: (zoom) => set({ zoom }),
  addPage: (name, slug) => set((state) => {
    if (!state.project || !name.trim()) return {}
    const project = structuredClone(state.project)
    const page: Page = { id: randomId(), name: name.trim(), slug: uniqueSlug(project.pages, slug?.trim() || slugify(name)), title: `${project.name} | ${name.trim()}`, description: '', document: { elements: {}, rootIds: [] } }
    project.pages.push(page)
    project.activePageId = page.id
    project.document = page.document
    project.updatedAt = now()
    return { ...remember(state, project), selectedId: null, activePanel: 'pages' }
  }),
  selectPage: (id) => set((state) => {
    if (!state.project) return {}
    const page = state.project.pages.find((item) => item.id === id)
    if (!page || page.id === state.project.activePageId) return {}
    const project = { ...state.project, activePageId: id, document: page.document }
    scheduleSave(project)
    return { project, selectedId: null }
  }),
  renamePage: (id, name) => set((state) => {
    if (!state.project || !name.trim()) return {}
    const project = structuredClone(state.project)
    const page = project.pages.find((item) => item.id === id)
    if (!page) return {}
    page.name = name.trim()
    project.updatedAt = now()
    return remember(state, project)
  }),
  duplicatePage: (id) => set((state) => {
    if (!state.project) return {}
    const project = structuredClone(state.project)
    const source = project.pages.find((page) => page.id === id)
    if (!source) return {}
    const page: Page = { ...structuredClone(source), id: randomId(), name: `${source.name} copy`, slug: uniqueSlug(project.pages, `${source.slug}-copy`), document: copyDocument(source.document) }
    project.pages.push(page)
    project.activePageId = page.id
    project.document = page.document
    project.updatedAt = now()
    return { ...remember(state, project), selectedId: null }
  }),
  deletePage: (id) => set((state) => {
    if (!state.project || state.project.pages.length < 2) return {}
    const project = structuredClone(state.project)
    const index = project.pages.findIndex((page) => page.id === id)
    if (index < 0) return {}
    project.pages.splice(index, 1)
    if (project.activePageId === id) {
      const next = project.pages[Math.max(0, index - 1)]
      project.activePageId = next.id
      project.document = next.document
    }
    project.updatedAt = now()
    return { ...remember(state, project), selectedId: null }
  }),
  updatePage: (id, patch) => set((state) => {
    if (!state.project) return {}
    const project = structuredClone(state.project)
    const page = project.pages.find((item) => item.id === id)
    if (!page) return {}
    Object.assign(page, patch)
    if (patch.slug) page.slug = uniqueSlug(project.pages.filter((item) => item.id !== id), patch.slug)
    project.updatedAt = now()
    return remember(state, project)
  }),
  setVisibility: (id, visible) => set((state) => withDocument(state, (document) => {
    const element = document.elements[id]
    if (!element || element.props.locked) return
    if (state.viewport === 'desktop') element.visibility = { ...element.visibility, desktop: visible }
    else if (state.viewport === 'tablet') element.visibility = { ...element.visibility, tablet: visible }
    else element.visibility = { ...element.visibility, mobile: visible }
  })),
  addAssets: async (files) => {
    const state = get()
    if (!state.project) return
    const accepted = files.filter((file) => file.type.startsWith('image/'))
    const records: AssetRecord[] = accepted.map((file) => ({ id: randomId(), projectId: state.project!.id, name: file.name, type: file.type, size: file.size, createdAt: now(), blob: file }))
    await Promise.all(records.map(saveAsset))
    const assets = await loadAssets(state.project.id)
    state.assets.forEach((asset) => URL.revokeObjectURL(asset.url))
    set({ assets })
  },
  removeAsset: async (id) => {
    await deleteAsset(id)
    const state = get()
    const asset = state.assets.find((item) => item.id === id)
    if (asset) URL.revokeObjectURL(asset.url)
    set({ assets: state.assets.filter((item) => item.id !== id) })
  },
  exportProject: async (id) => {
    const project = await loadProject(id)
    if (!project) return
    const blob = await createBackup(project, await loadAssetRecords(id))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupName(project.name)
    link.click()
    URL.revokeObjectURL(url)
  },
  exportWebsite: async () => {
    const project = get().project
    if (!project) return
    const blob = await exportWebsite(project, await loadAssetRecords(project.id))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = websiteExportName(project.name)
    link.click()
    URL.revokeObjectURL(url)
  },
  checkSite: () => {
    const { project, assets } = get()
    set({ siteIssues: project ? checkSite(project, assets) : [] })
  },
  importProject: async (file) => {
    const imported = await readBackup(file)
    const projects = get().projects
    const existing = new Set(projects.map((project) => project.name.toLowerCase()))
    const project = normalizeProject(structuredClone(imported.project))
    const originalName = project.name || 'Imported project'
    let name = originalName
    let counter = 2
    while (existing.has(name.toLowerCase())) {
      name = `${originalName} copy${counter === 2 ? '' : ` ${counter - 1}`}`
      counter += 1
    }
    project.id = randomId()
    project.name = name
    project.createdAt = now()
    project.updatedAt = project.createdAt
    const assetIds = new Map(imported.assets.map((asset) => [asset.id, randomId()]))
    remapAssetReferences(project, assetIds)
    const active = project.pages.find((page) => page.id === project.activePageId) ?? project.pages[0]
    project.document = active ? structuredClone(active.document) : { elements: {}, rootIds: [] }
    if (!project.pages.length) {
      const home: Page = { id: randomId(), name: 'Home', slug: '/', title: `${project.name} | Home`, description: '', document: project.document }
      project.pages = [home]
      project.activePageId = home.id
    }
    await saveProject(project)
    await Promise.all(imported.assets.map((asset) => saveAsset({ ...asset, id: assetIds.get(asset.id)!, projectId: project.id })))
    const next = await listProjects()
    set({ projects: next })
  },
  addElement: (type, parentId = null, index) => set((state) => {
    if (parentId && state.project?.document.elements[parentId]?.props.locked) return {}
    let elementId: string | null = null
    const result = withDocument(state, (document) => {
      const resolved = resolveLayoutParent(document, parentId, index)
      const element = createElement(type)
      document.elements[element.id] = element
      const parent = resolved.parentId && document.elements[resolved.parentId] ? document.elements[resolved.parentId] : null
      const target = parent ? parent.children : document.rootIds
      target.splice(typeof resolved.index === 'number' ? Math.min(resolved.index, target.length) : target.length, 0, element.id)
      elementId = element.id
    })
    return { ...result, selectedId: elementId, activePanel: 'layers' }
  }),
  addAssetImage: (assetId, parentId = null, index?: number) => set((state) => {
    if (parentId && state.project?.document.elements[parentId]?.props.locked) return {}
    let elementId: string | null = null
    const result = withDocument(state, (document) => {
      const resolved = resolveLayoutParent(document, parentId, index)
      const element = createElement('image')
      element.props.assetId = assetId
      document.elements[element.id] = element
      const parent = resolved.parentId && document.elements[resolved.parentId] ? document.elements[resolved.parentId] : null
      const target = parent ? parent.children : document.rootIds
      const at = typeof resolved.index === 'number' ? Math.min(resolved.index, target.length) : target.length
      target.splice(at, 0, element.id)
      elementId = element.id
    })
    return { ...result, selectedId: elementId, activePanel: 'assets' }
  }),
  addTemplate: (type, parentId = null) => set((state) => {
    if (parentId && state.project?.document.elements[parentId]?.props.locked) return {}
    let elementId: string | null = null
    const result = withDocument(state, (document) => {
      const template = createTemplate(type)
      Object.assign(document.elements, template.elements)
      const roots = parentId && document.elements[parentId] ? document.elements[parentId].children : document.rootIds
      roots.push(...template.rootIds)
      elementId = template.rootIds[0]
    })
    return { ...result, selectedId: elementId, activePanel: 'layers' }
  }),
  insertReusableSection: (section) => set((state) => {
    let rootId: string | null = null
    const result = withDocument(state, (document) => {
      const ids = new Map(Object.keys(section.document.elements).map((id) => [id, randomId()]))
      for (const [id, source] of Object.entries(section.document.elements)) {
        const element = structuredClone(source)
        element.id = ids.get(id)!
        element.children = element.children.map((childId) => ids.get(childId)!)
        document.elements[element.id] = element
      }
      rootId = ids.get(section.document.rootIds[0])!
      document.rootIds.push(rootId)
    })
    return { ...result, selectedId: rootId, activePanel: 'layers' }
  }),
  saveReusableSection: (id) => {
    const project = get().project
    if (project) saveReusableSection(project.document, id)
  },
  updateElement: (id, patch) => set((state) => {
    const result = withDocument(state, (document) => {
      const element = document.elements[id]
      if (!element || element.props.locked) return
      Object.assign(element, patch)
    })
    return result
  }),
  updateContent: (id, content) => set((state) => {
    const current = state.project?.document.elements[id]
    if (current && (current.props.locked || current.content === content)) return {}
    const grouped = state.typingId === id
    const result = withDocument(state, (document) => {
      const element = document.elements[id]
      if (!element || element.props.locked) return
      element.content = content
    }, !grouped)
    return { ...result, typingId: grouped ? state.typingId : id }
  }),
  updateProps: (id, props) => set((state) => {
    const element = state.project?.document.elements[id]
    if (element && !element.props.locked && Object.entries(props).every(([key, value]) => element.props[key] === value)) return {}
    return withDocument(state, (document) => {
      const target = document.elements[id]
      if (!target || target.props.locked) return
      Object.assign(target.props, props)
    })
  }),
  updateStyles: (id, styles, record = true) => set((state) => {
    const element = state.project?.document.elements[id]
    if (element && !element.props.locked) {
      const slot = state.viewport === 'desktop' ? element.styles : element.responsive?.[state.viewport]
      if (Object.entries(styles).every(([key, value]) => JSON.stringify(slot?.[key]) === JSON.stringify(value))) return {}
    }
    return withDocument(state, (document) => {
      const target = document.elements[id]
      if (!target || target.props.locked) return
      if (state.viewport === 'desktop') Object.assign(target.styles, styles)
      else Object.assign(target.responsive ??= {}, { [state.viewport]: { ...target.responsive?.[state.viewport], ...styles } })
    }, record)
  }),
  resetStyle: (id, key) => set((state) => withDocument(state, (document) => {
    const element = document.elements[id]
    if (!element || element.props.locked) return
    if (state.viewport === 'desktop') delete element.styles[key]
    else delete element.responsive?.[state.viewport]?.[key]
  })),
  updateTheme: (update, record = true) => set((state) => withTheme(state, update, record)),
  updateProject: (update, record = true) => set((state) => withProject(state, update, record)),
  beginTransaction: () => set((state) => state.project && !state.transaction ? { transaction: structuredClone(state.project) } : {}),
  commitTransaction: () => set((state) => {
    if (!state.transaction || !state.project) return {}
    return { past: [...state.past, state.transaction].slice(-50), future: [], transaction: null }
  }),
  deleteElement: (id) => set((state) => {
    const nodeId = id ?? state.selectedId
    if (!nodeId || !state.project || state.project.document.elements[nodeId]?.props.locked) return {}
    const parent = findParent(state.project.document, nodeId)
    const result = withDocument(state, (document) => removeNode(document, nodeId))
    return { ...result, selectedId: parent }
  }),
  duplicateElement: (id) => set((state) => {
    const nodeId = id ?? state.selectedId
    if (!nodeId || !state.project || state.project.document.elements[nodeId]?.props.locked) return {}
    let duplicateId: string | null = null
    const result = withDocument(state, (document) => { duplicateId = duplicateNode(document, nodeId) })
    return { ...result, selectedId: duplicateId }
  }),
  moveElement: (id, parentId, index) => set((state) => {
    if (!state.project || state.project.document.elements[id]?.props.locked) return {}
    if (parentId && state.project.document.elements[parentId]?.props.locked) return {}
    if (parentId && isInside(state.project.document, parentId, id)) return {}
    let moved = false
    const result = withDocument(state, (document) => {
      const resolved = resolveLayoutParent(document, parentId, index)
      if (resolved.parentId && isInside(document, resolved.parentId, id)) return
      moved = moveNode(document, id, resolved.parentId, resolved.index)
    })
    if (!moved) return {}
    return result
  }),
  toggleHidden: (id) => set((state) => {
    const nodeId = id ?? state.selectedId
    if (!nodeId) return {}
    return withDocument(state, (document) => {
      const element = document.elements[nodeId]
      if (element && !element.props.locked) element.props.hidden = !element.props.hidden
    })
  }),
  toggleLocked: (id) => set((state) => {
    const nodeId = id ?? state.selectedId
    if (!nodeId) return {}
    return withDocument(state, (document) => {
      const element = document.elements[nodeId]
      if (element) element.props.locked = !element.props.locked
    })
  }),
  copy: () => {
    const state = get()
    if (!state.project || !state.selectedId) return
    const ids = subtreeIds(state.project.document, state.selectedId)
    const elements = Object.fromEntries(ids.map((id) => [id, structuredClone(state.project!.document.elements[id])]))
    set({ clipboard: { sourceId: state.selectedId, document: { elements, rootIds: [state.selectedId] } } })
  },
  paste: () => set((state) => {
    if (!state.project || !state.clipboard) return {}
    if (state.selectedId) {
      const parent = findParent(state.project.document, state.selectedId)
      const targetParent = parent ? state.project.document.elements[parent] : null
      if (targetParent?.props.locked) return {}
      if (state.project.document.elements[state.selectedId!]?.props.locked) return {}
    }
    let pastedId: string | null = null
    const result = withDocument(state, (document) => {
      const source = state.clipboard!.document
      const remap = new Map<string, string>()
      for (const sourceId of Object.keys(source.elements)) remap.set(sourceId, randomId())
      for (const [sourceId, sourceNode] of Object.entries(source.elements)) {
        const node = structuredClone(sourceNode)
        node.id = remap.get(sourceId)!
        node.name = `${node.name ?? node.type} copy`
        node.children = node.children.map((childId) => remap.get(childId)!)
        document.elements[node.id] = node
      }
      pastedId = remap.get(source.rootIds[0])!
      const parent = state.selectedId ? findParent(document, state.selectedId) : null
      const target = parent ? document.elements[parent] : null
      if (target?.props.locked) return
      const roots = parent ? document.elements[parent].children : document.rootIds
      const after = state.selectedId ? roots.indexOf(state.selectedId) + 1 : roots.length
      roots.splice(after, 0, pastedId)
    })
    return { ...result, selectedId: pastedId }
  }),
  undo: () => set((state) => {
    const previous = state.past.at(-1)
    if (!previous || !state.project) return {}
    scheduleSave(previous)
    return { project: previous, projects: syncList(state, previous), past: state.past.slice(0, -1), future: [state.project, ...state.future], selectedId: null, typingId: null, transaction: null }
  }),
  redo: () => set((state) => {
    const next = state.future[0]
    if (!next || !state.project) return {}
    scheduleSave(next)
    return { project: next, projects: syncList(state, next), past: [...state.past, state.project].slice(-50), future: state.future.slice(1), selectedId: null, typingId: null, transaction: null }
  }),
  finishTyping: () => set({ typingId: null }),
}))
