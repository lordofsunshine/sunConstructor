import { ImagePlus, Trash2 } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'

const AssetThumb = ({ asset, onUse, onRemove }: { asset: { id: string; name: string; url: string }; onUse: (id: string) => void; onRemove: (id: string) => void }) => {
  const drag = useDraggable({ id: `asset:${asset.id}` })
  return <div ref={drag.setNodeRef} className="asset-strip-item">
    <button type="button" className="asset-strip-thumb" aria-label={`Use ${asset.name}`} title={`Use ${asset.name}`} onClick={() => onUse(asset.id)} {...drag.attributes} {...drag.listeners}><img src={asset.url} alt="" /></button>
    <button type="button" className="asset-strip-remove" aria-label={`Remove ${asset.name}`} title={`Remove ${asset.name}`} onClick={() => onRemove(asset.id)}><Trash2 size={11} /></button>
  </div>
}

export const AssetsStrip = () => {
  const { assets, addAssets, removeAsset, addAssetImage, selectedId, updateProps, project } = useEditorStore()
  const input = useRef<HTMLInputElement>(null)
  const [blink, setBlink] = useState(true)
  useEffect(() => { const timer = window.setTimeout(() => setBlink(false), 1100); return () => window.clearTimeout(timer) }, [])
  const useAsset = (id: string) => {
    const selected = selectedId ? project?.document.elements[selectedId] : null
    if (selected?.type === 'image') updateProps(selected.id, { assetId: id })
    else addAssetImage(id)
  }
  return <div className={blink ? 'assets-strip assets-strip--blink' : 'assets-strip'}>
    <div className="assets-strip-list">
      {assets.map((asset) => <AssetThumb key={asset.id} asset={asset} onUse={useAsset} onRemove={(id) => void removeAsset(id)} />)}
      {assets.length === 0 && <span className="assets-strip-empty">No images yet</span>}
    </div>
    <input ref={input} type="file" accept="image/*" multiple hidden onChange={(event) => { void addAssets(Array.from(event.target.files ?? [])); event.target.value = '' }} />
    <button type="button" className="assets-strip-upload" onClick={() => input.current?.click()}><ImagePlus size={14} /> Upload</button>
  </div>
}
