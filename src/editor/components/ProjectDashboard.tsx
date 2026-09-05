import { Copy, Download, FolderOpen, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Brand } from '../../components/Brand'
import { useBooted } from '../hooks/useBooted'
import { useEditorStore } from '../store/editorStore'
import { StarterDialog } from './StarterDialog'
import type { StarterId } from '../model/types'
import type { Project } from '../model/types'
import { compilePage } from '../render/siteCompiler'
import { loadAssets } from '../storage/projectStorage'

const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))

function ProjectThumb({ project }: { project: Project }) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const page = project.pages.find((item) => item.id === project.activePageId) ?? project.pages[0]

  useEffect(() => {
    let cancelled = false
    let urls: string[] = []

    const build = async () => {
      if (!page) return
      const assets = await loadAssets(project.id).catch(() => [])
      urls = assets.map((asset) => asset.url)
      const assetMap = new Map(assets.map((asset) => [asset.id, asset.url]))
      const compiled = compilePage(page, project, { assetUrl: (id) => assetMap.get(id) ?? '' })
      if (!cancelled) setSrcDoc(compiled.html)
    }

    void build()
    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [page, project])

  if (!page) return <div className="project-thumb-empty"><span>{project.name.trim().charAt(0).toUpperCase() || 'S'}</span><small>No pages yet</small></div>

  return <div className="project-thumb-frame">
    {srcDoc ? <iframe title={`${project.name} cover`} sandbox="" srcDoc={srcDoc} loading="lazy" tabIndex={-1} /> : <div className="project-thumb-loading"><span /><span /><span /></div>}
  </div>
}

export const ProjectDashboard = () => {
  const { projects, createProject, openProject, duplicateProject, removeProject, exportProject, importProject } = useEditorStore()
  const booted = useBooted()
  const [name, setName] = useState('Untitled project')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [pendingName, setPendingName] = useState<string | null>(null)
  const [nudge] = useState(() => {
    try {
      if (localStorage.getItem('sunconstructor.new-project-hint')) return false
      localStorage.setItem('sunconstructor.new-project-hint', '1')
      return true
    } catch {
      return false
    }
  })
  const input = useRef<HTMLInputElement>(null)
  const visible = useMemo(() => projects.filter((project) => project.name.toLowerCase().includes(query.trim().toLowerCase())), [projects, query])
  const importFile = async (file: File) => {
    try {
      setError('')
      await importProject(file)
    } catch {
      void 0
      setError('This backup could not be imported. Choose a valid .sunproject file.')
    }
  }
  const chooseStarter = async (starter: StarterId) => {
    if (!pendingName) return
    await createProject(pendingName, starter)
    setPendingName(null)
  }
  return <main className={booted ? 'project-dashboard is-booted' : 'project-dashboard'}><header><a className="builder-brand" href="/" aria-label="sunConstructor home"><Brand /></a><p>Stored in this browser.</p></header><section className="dashboard-intro"><div><h1>Your projects</h1><p>Open a site, add another idea or keep a backup where you choose.</p></div><form className={nudge ? 'is-hint' : undefined} onSubmit={(event) => { event.preventDefault(); setPendingName(name.trim() || 'Untitled project') }}><label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label><button className="sun-button" type="submit"><Plus size={16} /> New project</button></form></section><div className="dashboard-tools"><label className="dashboard-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." /></label><input ref={input} type="file" accept=".sunproject,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = '' }} /><button type="button" className="small-action" onClick={() => input.current?.click()}><Upload size={14} /> Import backup</button></div>{error && <p className="dashboard-error" role="alert">{error}</p>}<section className="project-grid">{visible.map((project) => <article className="project-card" key={project.id}><div className="project-card-cover"><ProjectThumb project={project} /><button type="button" className="project-cover-open" onClick={() => void openProject(project.id)} aria-label={`Open ${project.name}`} title={`Open ${project.name}`} /></div><button type="button" className="project-card-open" onClick={() => void openProject(project.id)}><strong>{project.name}</strong><small>{project.pages.length} {project.pages.length === 1 ? 'page' : 'pages'} · Edited {dateLabel(project.updatedAt)}</small></button><div className="project-card-actions"><button type="button" onClick={() => void exportProject(project.id)} aria-label={`Create backup for ${project.name}`} title={`Create backup for ${project.name}`}><Download size={15} /></button><button type="button" onClick={() => void duplicateProject(project.id)} aria-label={`Duplicate ${project.name}`} title={`Duplicate ${project.name}`}><Copy size={15} /></button><button type="button" onClick={() => void removeProject(project.id)} aria-label={`Delete ${project.name}`} title={`Delete ${project.name}`}><Trash2 size={15} /></button></div></article>)}</section>{projects.length === 0 && <div className="dashboard-empty"><FolderOpen size={24} /><h2>Nothing here yet.</h2><p>Give the first project a name and choose a starting point.</p></div>}{pendingName && <StarterDialog name={pendingName} onChoose={(starter) => void chooseStarter(starter)} onClose={() => setPendingName(null)} />}</main>
}
