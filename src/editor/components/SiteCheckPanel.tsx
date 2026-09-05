import { CheckCircle2, CircleAlert, Lightbulb, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

export const SiteCheckPanel = () => {
  const { project, siteIssues, checkSite } = useEditorStore()
  useEffect(() => { checkSite() }, [checkSite, project])
  const errors = siteIssues.filter((item) => item.level === 'error')
  const suggestions = siteIssues.filter((item) => item.level === 'suggestion')
  const reviewCount = siteIssues.length
  return <aside className="editor-panel site-check-panel"><div className="panel-heading"><p>Quality review</p><h2>Site check</h2></div><div className="site-check-content"><button type="button" className="small-action" onClick={checkSite}><RefreshCw size={14} /> Check website</button>{reviewCount === 0 ? <div className="site-check-ready"><CheckCircle2 size={22} /><strong>Ready to export</strong><span>Your pages are clear of the checks available here.</span></div> : <><div className={errors.length ? 'site-check-summary has-errors' : 'site-check-summary'}><strong>{errors.length ? `${errors.length} thing${errors.length === 1 ? '' : 's'} to fix` : `${suggestions.length} thing${suggestions.length === 1 ? '' : 's'} to review`}</strong><span>{errors.length ? 'Resolve these before exporting your website.' : 'These suggestions will not stop an export.'}</span></div>{errors.map((item, index) => <article className="site-check-item is-error" key={`error-${index}`}><CircleAlert size={16} /><span>{item.message}</span></article>)}{suggestions.map((item, index) => <article className="site-check-item" key={`suggestion-${index}`}><Lightbulb size={16} /><span>{item.message}</span></article>)}</>}</div></aside>
}
