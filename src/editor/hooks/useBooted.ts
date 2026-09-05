import { useEffect, useState } from 'react'

export const useBooted = () => {
  const [booted, setBooted] = useState(false)
  useEffect(() => {
    let active = true
    const finish = () => {
      if (active) setBooted(true)
    }
    const frame = () => requestAnimationFrame(() => requestAnimationFrame(finish))
    const fallback = window.setTimeout(finish, 2500)
    if (document.fonts?.ready) {
      document.fonts.ready.then(frame, frame)
    } else {
      frame()
    }
    return () => {
      active = false
      window.clearTimeout(fallback)
    }
  }, [])
  return booted
}
