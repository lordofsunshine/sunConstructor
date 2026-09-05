import type { AssetRecord, Project } from '../model/types'

interface BackupAsset {
  id: string
  name: string
  type: string
  size: number
  createdAt: string
  data: string
}

interface BackupFile {
  format: 'sunproject'
  version: 1
  project: Project
  assets: BackupAsset[]
}

const blobToData = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Asset could not be read.'))
  reader.onerror = () => reject(reader.error ?? new Error('Asset could not be read.'))
  reader.readAsDataURL(blob)
})

const dataToBlob = async (data: string) => {
  const comma = data.indexOf(',')
  const header = data.slice(0, comma)
  const base64 = data.slice(comma + 1)
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export const createBackup = async (project: Project, assets: AssetRecord[]) => {
  const file: BackupFile = { format: 'sunproject', version: 1, project, assets: await Promise.all(assets.map(async (asset) => ({ id: asset.id, name: asset.name, type: asset.type, size: asset.size, createdAt: asset.createdAt, data: await blobToData(asset.blob) }))) }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

export const readBackup = async (file: File) => {
  if (file.size > 250 * 1024 * 1024) throw new Error('This backup is too large to open in the browser.')
  const text = await file.text()
  if (text.length > 260 * 1024 * 1024) throw new Error('This backup is too large to open in the browser.')
  const raw = JSON.parse(text) as Partial<BackupFile>
  if (raw.format !== 'sunproject' || raw.version !== 1 || !raw.project || !Array.isArray(raw.assets)) throw new Error('This backup could not be opened.')
  const assets = await Promise.all(raw.assets.map(async (asset) => {
    if (!asset.id || !asset.name || !asset.type || typeof asset.data !== 'string' || !asset.data.startsWith('data:')) throw new Error('This backup contains an unsupported asset.')
    return { id: asset.id, projectId: raw.project!.id, name: asset.name, type: asset.type, size: asset.size, createdAt: asset.createdAt, blob: await dataToBlob(asset.data) } as AssetRecord
  }))
  return { project: raw.project, assets }
}

export const backupName = (name: string) => `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project'}.sunproject`
