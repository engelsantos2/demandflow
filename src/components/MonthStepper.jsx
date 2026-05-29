import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { monthLabel, currentMonthKey } from '../lib/format'

/**
 * Navegador de mês com setas. Substitui o select.
 *
 * Props:
 *  - value: monthKey 'YYYY-MM' ou 'all'
 *  - months: array ordenado de monthKeys disponíveis (passados + futuros)
 *  - onChange: (next) => void
 *  - showAll: bool — exibe o botão "Todos" ao lado (default true)
 */
export default function MonthStepper({ value, months, onChange, showAll = true }) {
  const cur = currentMonthKey()
  const idx = months.indexOf(value)
  const isAll = value === 'all'

  const canPrev = !isAll && idx > 0
  const canNext = !isAll && idx >= 0 && idx < months.length - 1

  const goPrev = () => {
    if (isAll) {
      onChange(cur)
      return
    }
    if (canPrev) onChange(months[idx - 1])
  }
  const goNext = () => {
    if (isAll) {
      onChange(cur)
      return
    }
    if (canNext) onChange(months[idx + 1])
  }
  const goToday = () => onChange(cur)

  const label = isAll ? 'Todos os meses' : monthLabel(value)
  const isFuture = !isAll && value > cur
  const isCurrent = value === cur

  return (
    <div className="flex items-center gap-8 wrap">
      <div className="month-stepper" role="group" aria-label="Navegar por mês">
        <button
          type="button"
          className="month-stepper-arrow"
          onClick={goPrev}
          disabled={!canPrev && !isAll}
          aria-label="Mês anterior"
          title="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          className="month-stepper-label"
          onClick={goToday}
          title={isCurrent ? 'Mês atual' : 'Voltar ao mês atual'}
        >
          <Calendar size={13} />
          <span>{label}</span>
          {isCurrent && <span className="month-stepper-pill">atual</span>}
          {isFuture && <span className="month-stepper-pill future">futuro</span>}
        </button>

        <button
          type="button"
          className="month-stepper-arrow"
          onClick={goNext}
          disabled={!canNext && !isAll}
          aria-label="Próximo mês"
          title="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {showAll && (
        <button
          type="button"
          className={`pill ${isAll ? 'active' : ''}`}
          onClick={() => onChange(isAll ? cur : 'all')}
          title={isAll ? 'Filtrar pelo mês atual' : 'Ver todos os meses'}
        >
          Todos
        </button>
      )}
    </div>
  )
}
