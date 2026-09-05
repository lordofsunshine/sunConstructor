import { Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { starters, type StarterOption } from '../model/starters'
import type { StarterId } from '../model/types'
import './starter.css'

const filters = ['All', 'Blank', 'Portfolio', 'Creative', 'Food', 'Product'] as const

const StarterPreview = ({ starter }: { starter: StarterOption }) => <figure className="starter-preview" style={{ '--preview-bg': starter.preview.background, '--preview-ink': starter.preview.ink, '--preview-accent': starter.preview.accent } as React.CSSProperties} aria-hidden="true"><header><span>{starter.brand}</span><small>{starter.category}</small></header><div className="starter-preview__body"><div><strong>{starter.headline}</strong><span>{starter.description}</span></div><img src={starter.preview.image} alt="" /></div><footer>{starter.sectionLabels.map((section) => <span key={section}>{section}</span>)}</footer></figure>

export const StarterDialog = ({ name, onChoose, onClose }: { name: string; onChoose: (starter: StarterId) => void; onClose: () => void }) => {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [query, setQuery] = useState('')
  const options = useMemo(() => starters.filter((starter) => (filter === 'All' || starter.category === filter) && `${starter.name} ${starter.description} ${starter.headline}`.toLowerCase().includes(query.toLowerCase())), [filter, query])

  return <div className="starter-backdrop" role="presentation" onMouseDown={onClose}><section className="starter-dialog" role="dialog" aria-modal="true" aria-labelledby="starter-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="dialog-close" aria-label="Close starter choices" title="Close starter choices" onClick={onClose}><X size={17} /></button><p>New project</p><h2 id="starter-title">Choose a complete starting point.</h2><span>{name} stays local. Each layout begins as its own editable HTML composition.</span><div className="starter-toolbar"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates..." /></label><div>{filters.map((item) => <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="starter-grid">{options.map((starter) => <button type="button" className={`starter-card starter-${starter.id}`} key={starter.id} onClick={() => onChoose(starter.id)}><StarterPreview starter={starter} /><span className="starter-card__title"><strong>{starter.name}</strong><small>{starter.sectionLabels.length} scenes</small></span><span className="starter-card__description">{starter.description}</span>{starter.badge && <span className="starter-card__suggestion"><Check size={12} /> {starter.badge}</span>}</button>)}</div>{options.length === 0 && <div className="starter-empty">No templates match that search.</div>}</section></div>
}
