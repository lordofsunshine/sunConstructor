import type { AssetPreview, AssetRecord, Project } from '../model/types'
import { randomId } from '../model/ids'
import { defaultTheme } from '../theme/projectTheme'

const databaseName = 'sunconstructor'
const databaseVersion = 1
const projectsStore = 'projects'
const assetsStore = 'assets'
const legacyKey = 'sunconstructor.active-project.v2'

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(databaseName, databaseVersion)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(projectsStore)) database.createObjectStore(projectsStore, { keyPath: 'id' })
    if (!database.objectStoreNames.contains(assetsStore)) {
      const assets = database.createObjectStore(assetsStore, { keyPath: 'id' })
      assets.createIndex('projectId', 'projectId')
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('Storage could not be opened.'))
})

const requestValue = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('Storage request failed.'))
})

const transaction = async <T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
  const database = await openDatabase()
  const tx = database.transaction(storeName, mode)
  const store = tx.objectStore(storeName)
  const completed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Storage transaction failed.'))
    tx.onabort = () => reject(tx.error ?? new Error('Storage transaction was aborted.'))
  })
  try {
    const result = await requestValue(action(store))
    await completed
    return result
  } finally {
    database.close()
  }
}

export const normalizeProject = (project: Partial<Project>): Project => {
  const now = new Date().toISOString()
  const fallbackDocument = { elements: {}, rootIds: [] as string[] }
  const rawPages = project.pages?.length ? project.pages : undefined
  const home = rawPages?.[0] ?? { id: randomId(), name: 'Home', slug: '/', title: `${project.name ?? 'Untitled project'} | Home`, description: '', document: structuredClone(project.document ?? fallbackDocument) }
  const pages = rawPages ? rawPages.map((p) => ({ ...p, document: structuredClone(p.document ?? fallbackDocument) })) : [home]
  const activePageId = pages.some((page) => page.id === project.activePageId) ? project.activePageId! : home.id
  const active = pages.find((page) => page.id === activePageId) ?? home
  return { id: project.id ?? randomId(), name: project.name?.trim() || 'Untitled project', document: structuredClone(active.document), pages, activePageId, theme: project.theme ?? defaultTheme(), settings: { language: project.settings?.language || 'en', siteUrl: project.settings?.siteUrl || '', faviconAssetId: project.settings?.faviconAssetId }, schemaVersion: Math.max(project.schemaVersion ?? 2, 3), createdAt: project.createdAt ?? project.updatedAt ?? now, updatedAt: project.updatedAt ?? now }
}

const migrateLegacyProject = async () => {
  let legacy: string | null
  try { legacy = localStorage.getItem(legacyKey) } catch { return }
  if (!legacy) return
  try {
    const project = normalizeProject(JSON.parse(legacy) as Partial<Project>)
    await saveProject(project)
  } finally {
    try { localStorage.removeItem(legacyKey) } catch { /* ignore */ }
  }
}

export const saveProject = async (project: Project) => {
  await transaction(projectsStore, 'readwrite', (store) => store.put(normalizeProject(project)))
}

export const loadProject = async (id: string) => {
  const project = await transaction(projectsStore, 'readonly', (store) => store.get(id) as IDBRequest<Project | undefined>)
  return project ? normalizeProject(project) : null
}

export const listProjects = async () => {
  await migrateLegacyProject()
  const projects = await transaction(projectsStore, 'readonly', (store) => store.getAll() as IDBRequest<Project[]>)
  return projects.map(normalizeProject).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export const deleteProject = async (id: string) => {
  const database = await openDatabase()
  const tx = database.transaction([projectsStore, assetsStore], 'readwrite')
  tx.objectStore(projectsStore).delete(id)
  const cursor = tx.objectStore(assetsStore).index('projectId').openCursor(IDBKeyRange.only(id))
  cursor.onsuccess = () => {
    const item = cursor.result
    if (!item) return
    item.delete()
    item.continue()
  }
  cursor.onerror = () => tx.abort()
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Project could not be deleted.'))
    tx.onabort = () => reject(tx.error ?? new Error('Project deletion aborted.'))
  })
  database.close()
}

export const saveAsset = async (asset: AssetRecord) => transaction(assetsStore, 'readwrite', (store) => store.put(asset))

export const loadAssets = async (projectId: string): Promise<AssetPreview[]> => {
  const database = await openDatabase()
  const tx = database.transaction(assetsStore, 'readonly')
  const entries = await requestValue(tx.objectStore(assetsStore).index('projectId').getAll(projectId) as IDBRequest<AssetRecord[]>)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Assets could not be loaded.'))
  })
  database.close()
  return entries.map((asset) => ({ id: asset.id, name: asset.name, type: asset.type, size: asset.size, url: URL.createObjectURL(asset.blob) }))
}

export const loadAssetRecords = async (projectId: string) => {
  const database = await openDatabase()
  const tx = database.transaction(assetsStore, 'readonly')
  const entries = await requestValue(tx.objectStore(assetsStore).index('projectId').getAll(projectId) as IDBRequest<AssetRecord[]>)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Assets could not be loaded.'))
  })
  database.close()
  return entries
}

export const deleteAsset = async (id: string) => transaction(assetsStore, 'readwrite', (store) => store.delete(id))

export const persistentStorage = async () => navigator.storage?.persist?.() ?? false
