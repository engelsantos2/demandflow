import { withAlpha } from '../lib/ui'

export default function Badge({ label, color = '#00FF85', dot = true }) {
  return (
    <span
      className="badge"
      style={{
        background: withAlpha(color, 0.14),
        color,
        borderColor: withAlpha(color, 0.32),
      }}
    >
      {dot && <span className="dot-sm" />}
      {label}
    </span>
  )
}
