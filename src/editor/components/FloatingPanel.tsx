import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Placement = 'bottom-end' | 'right-start' | 'top-end'

interface FloatingPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>
  open: boolean
  placement: Placement
  className: string
  children: ReactNode
  onClose: () => void
  gap?: number
}

const margin = 8

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

export const FloatingPanel = ({ anchorRef, open, placement, className, children, onClose, gap = 6 }: FloatingPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' })

  useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const anchor = anchorRef.current
      const panel = panelRef.current
      if (!anchor || !panel) return

      const anchorRect = anchor.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const maxLeft = window.innerWidth - panelRect.width - margin
      const maxTop = window.innerHeight - panelRect.height - margin

      let left = anchorRect.right - panelRect.width
      let top = anchorRect.bottom + gap

      if (placement === 'right-start') {
        left = anchorRect.right + gap
        top = anchorRect.top
      }

      if (placement === 'top-end') {
        left = anchorRect.right - panelRect.width
        top = anchorRect.top - panelRect.height - gap
      }

      setStyle({
        left: clamp(left, margin, Math.max(margin, maxLeft)),
        top: clamp(top, margin, Math.max(margin, maxTop)),
        visibility: 'visible',
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorRef, gap, open, placement])

  useEffect(() => {
    if (!open) return

    const close = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('mousedown', close)
    window.addEventListener('touchstart', close)
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('touchstart', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [anchorRef, onClose, open])

  if (!open) return null

  return createPortal(<div ref={panelRef} className={className} style={style}>{children}</div>, document.body)
}
