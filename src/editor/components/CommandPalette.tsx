import { Command, Eye, FileArchive, LayoutPanelLeft, Palette, Search, Settings2, SquareStack, X } from 'lucide-react'
import { useLayoutEffect, useMemo, useState } from 'react'
import { useEditorStore } from '../store/editorStore'

export const CommandPalette = ({ onClose, onPreview, onExport }: { onClose: () => void; onPreview: () => void; onExport: () => void }) => {
  const { addElement, setPanel, undo, redo } = useEditorStore()
  const [query, setQuery] = useState('')
  useLayoutEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close, true)
    return () => window.removeEventListener('keydown', close, true)
  }, [onClose])
  const commands = useMemo(() => [
    { label: 'Add section', icon: LayoutPanelLeft, run: () => addElement('section') },
    { label: 'Add heading', icon: Command, run: () => addElement('heading') },
    { label: 'Open pages', icon: SquareStack, run: () => setPanel('pages') },
    { label: 'Open styles', icon: Palette, run: () => setPanel('styles') },
    { label: 'Open site check', icon: Settings2, run: () => setPanel('check') },
    { label: 'Preview website', icon: Eye, run: onPreview },
    { label: 'Export website', icon: FileArchive, run: onExport },
    { label: 'Undo last change', icon: Command, run: undo },
    { label: 'Redo last change', icon: Command, run: redo },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [addElement, onExport, onPreview, query, redo, setPanel, undo])
  return <div className="command-backdrop" role="presentation" onMouseDown={onClose}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Escape') onClose() }} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="dialog-close" aria-label="Close commands" title="Close commands" onClick={onClose}><X size={17} /></button><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); if (event.key === 'Enter') commands[0]?.run() }} placeholder="Search sunConstructor" /></label><div>{commands.map(({ label, icon: Icon, run }) => <button type="button" key={label} onMouseUp={(event) => (event.currentTarget as HTMLButtonElement).blur()} onClick={() => { run(); onClose() }}><Icon size={16} /><span>{label}</span></button>)}{commands.length === 0 && <p>No commands match that search.</p>}</div><footer><kbd>Esc</kbd> close <kbd>↵</kbd> run first result</footer></section></div>
}
