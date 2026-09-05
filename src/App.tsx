import { useEffect, useState } from 'react'
import { Builder } from './Builder'
import { Landing } from './Landing'

function getRoute() {
  return window.location.pathname.startsWith('/builder') ? 'builder' : 'home'
}

export default function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const update = () => setRoute(getRoute())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setRoute(getRoute())
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return <div className="route-shell" key={route}>{route === 'builder' ? <Builder /> : <Landing onBuild={() => navigate('/builder?dashboard=1')} />}</div>
}
