import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { withAlpha } from '../lib/ui'
import { useCountUp } from '../lib/useCountUp'

export default function StatCard({ icon: Icon, label, value, accent = '#00FF85', trend }) {
  const animated = useCountUp(value, { duration: 900 })

  return (
    <div className="stat-card animate-fade-up">
      <div
        className="stat-icon"
        style={{ background: withAlpha(accent, 0.12), color: accent }}
      >
        <Icon />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{animated}</div>
      {trend && (
        <div className={`stat-trend ${trend.dir}`}>
          {trend.dir === 'up' && <TrendingUp size={13} />}
          {trend.dir === 'down' && <TrendingDown size={13} />}
          {trend.dir === 'flat' && <Minus size={13} />}
          {trend.text}
        </div>
      )}
    </div>
  )
}
