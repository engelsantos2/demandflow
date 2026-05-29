import { initials } from '../lib/format'

export default function Avatar({ name, size = 32 }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      title={name}
    >
      {initials(name)}
    </span>
  )
}
