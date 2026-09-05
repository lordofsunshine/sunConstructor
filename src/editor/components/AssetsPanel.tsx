import { ImagePlus, Trash2 } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { useRef } from 'react'
import { useEditorStore } from '../store/editorStore'

const sizeLabel = (size: number) => size > 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`

const AssetCard = ({ asset, onUse, onRemove }: { asset: { id: string; name: string; size: number; url: string }; onUse: (id: string) => void; onRemove: (id: string) => void }) => {
  const drag = useDraggable({ id: `asset:${asset.id}` })
  return <article ref={drag.setNodeRef} className="asset-card"><button type="button" {...drag.attributes} {...drag.listeners} onClick={() => onUse(asset.id)}><img src={asset.url} alt="" /><span>{asset.name}</span><small>{sizeLabel(asset.size)}</small></button><button type="button" aria-label={`Delete ${asset.name}`} title={`Delete ${asset.name}`} onClick={() => onRemove(asset.id)}><Trash2 size={13} /></button></article>
}

export const AssetsPanel = () => {
  const { assets, addAssets, removeAsset, addAssetImage, selectedId, updateProps, project } = useEditorStore()
  const input = useRef<HTMLInputElement>(null)
  const useAsset = (id: string) => {
    const selected = selectedId ? project?.document.elements[selectedId] : null
    if (selected?.type === 'image') updateProps(selected.id, { assetId: id })
    else addAssetImage(id)
  }
  return <aside className="editor-panel assets-panel"><div className="panel-heading"><p>Local files</p><h2>Assets</h2></div><input ref={input} type="file" accept="image/*" multiple hidden onChange={(event) => { void addAssets(Array.from(event.target.files ?? [])); event.target.value = '' }} /><button type="button" className="asset-upload" onClick={() => input.current?.click()}><ImagePlus size={17} /> Upload images</button><div className="assets-grid">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} onUse={useAsset} onRemove={(id) => void removeAsset(id)} />)}</div>{assets.length === 0 && <p className="empty-panel-copy">Upload an image to keep it with this project.</p>}</aside>
}
