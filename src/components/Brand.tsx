interface BrandProps {
  compact?: boolean
}

export const Brand = ({ compact = false }: BrandProps) => (
  <span className={`brand${compact ? ' brand--compact' : ''}`}>
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path className="brand-mark__sun" d="m24 2 4.66 4.61 6.34-1.66 1.73 6.32 6.32 1.73-1.66 6.34L46 24l-4.61 4.66 1.66 6.34-6.32 1.73-1.73 6.32-6.34-1.66L24 46l-4.66-4.61L13 43.05l-1.73-6.32L4.95 35l1.66-6.34L2 24l4.61-4.66L4.95 13l6.32-1.73L13 4.95l6.34 1.66Z" />
      <path className="brand-mark__letter" d="M29.5 18a8.14 8.14 0 1 0 0 12" />
    </svg>
    <span className="brand-name"><b>sun</b>Constructor</span>
  </span>
)
