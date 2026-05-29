import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon />
      </div>
      <div className="empty-title">{title}</div>
      {text && <p className="empty-text">{text}</p>}
      {action && <div className="mt-16">{action}</div>}
    </div>
  )
}
