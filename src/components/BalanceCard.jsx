import { currency, monthLabel } from '../lib/format'

/**
 * Card "Balanço mensal" — barras verticais minimalistas + valores de
 * Receitas, Despesas e Balanço.
 *
 * Props:
 *  - title: string (default "Balanço mensal")
 *  - monthKey: ex. '2026-06' (apenas pra subtítulo opcional)
 *  - receitas: número
 *  - despesas: número
 *  - showMonth: boolean — mostra mês como subtítulo
 */
export default function BalanceCard({
  title = 'Balanço mensal',
  monthKey: mk,
  receitas = 0,
  despesas = 0,
  showMonth = false,
}) {
  const balanco = receitas - despesas
  const maxVal = Math.max(receitas, despesas, 1)
  const receitaPct = (receitas / maxVal) * 100
  const despesaPct = (despesas / maxVal) * 100

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">{title}</div>
          {showMonth && mk && <div className="panel-sub">{monthLabel(mk)}</div>}
        </div>
      </div>
      <div className="flex items-center gap-16 mt-12">
        {/* Barras verticais */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            height: 110,
            paddingLeft: 4,
          }}
        >
          <div
            style={{
              width: 16,
              height: `${Math.max(receitaPct, 4)}%`,
              background: 'linear-gradient(180deg, #00FF85 0%, #00C46A 100%)',
              borderRadius: 8,
              minHeight: 6,
              transition: 'height 0.4s ease',
            }}
            title={`Receitas: ${currency(receitas)}`}
          />
          <div
            style={{
              width: 16,
              height: `${Math.max(despesaPct, 4)}%`,
              background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)',
              borderRadius: 8,
              minHeight: 6,
              transition: 'height 0.4s ease',
            }}
            title={`Despesas: ${currency(despesas)}`}
          />
        </div>

        {/* Valores */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex justify-between items-center" style={{ padding: '4px 0' }}>
            <span className="text-sm">Receitas</span>
            <span className="font-bold text-neon">{currency(receitas)}</span>
          </div>
          <div className="flex justify-between items-center" style={{ padding: '4px 0' }}>
            <span className="text-sm">Despesas</span>
            <span className="font-bold" style={{ color: '#EF4444' }}>
              {currency(despesas)}
            </span>
          </div>
          <div className="divider" style={{ margin: '8px 0' }} />
          <div className="flex justify-between items-center" style={{ padding: '4px 0' }}>
            <span className="text-sm font-bold">Balanço</span>
            <span
              className="font-bold"
              style={{ color: balanco >= 0 ? '#00FF85' : '#EF4444', fontSize: 16 }}
            >
              {currency(balanco)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
