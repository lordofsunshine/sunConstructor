import { Box, Layers3, MoreHorizontal, Palette, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import type { EditorPanel } from '../model/types'
import { FloatingPanel } from './FloatingPanel'

const primary: { id: EditorPanel; label: string; icon: typeof Plus }[] = [
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'layers', label: 'Layers', icon: Layers3 },
  { id: 'styles', label: 'Styles', icon: Palette },
]

const overflow: { id: EditorPanel; label: string }[] = [
  { id: 'pages', label: 'Pages' },
  { id: 'assets', label: 'Assets' },
  { id: 'check', label: 'Check' },
]

export const ToolRail = ({ active, onChange }: { active: EditorPanel; onChange: (panel: EditorPanel) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const isOverflowActive = overflow.some((item) => item.id === active)
  const placement = typeof window !== 'undefined' && window.innerWidth <= 760 ? 'top-end' : 'right-start'
  return <nav className="tool-rail" aria-label="Editor tools">
    {primary.map(({ id, label, icon: Icon }) => <button className={active === id ? 'tool-rail-item is-active' : 'tool-rail-item'} type="button" onClick={() => onChange(id)} key={id}><Icon size={19} /><span>{label}</span></button>)}
    <div className="tool-rail-overflow">
      <button ref={ref} className={isOverflowActive ? 'tool-rail-item is-active' : 'tool-rail-item'} type="button" aria-label="More panels" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreHorizontal size={18} /><span>More</span></button>
      <FloatingPanel anchorRef={ref} open={open} placement={placement} className="tool-rail-menu" onClose={() => setOpen(false)}>
        {overflow.map((item) => <button key={item.id} role="menuitem" className={active === item.id ? 'is-active' : ''} type="button" onClick={() => { onChange(item.id); setOpen(false) }}>{item.label}</button>)}
      </FloatingPanel>
    </div>
    <span className="tool-rail-mark"><Box size={18} /></span>
  </nav>
}
