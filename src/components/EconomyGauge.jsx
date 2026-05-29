import { currency, monthLabel } from '../lib/format'

/**
 * Gauge circular de "Economia" — mostra que % das receitas sobrou
 * depois das despesas. Útil pra acompanhar saúde financeira do mês.
 *
 * Props:
 *  - title: string (default "Economia mensal")
 *  - monthKey: 'YYYY-MM' opcional como subtítulo
 *  - receitas: número
 *  - despesas: número
 *  - showMonth: mostra label do mês como subtítulo
 *  - subtle: variante mais discreta (para comparar mês anterior)
 */
export default function EconomyGauge({
  title = 'Economia mensal',
  monthKey: mk,
  receitas = 0,
  despesas = 0,
  showMonth = false,
  subtle = false,
}) {
  const economia = receitas - despesas
  const pct = receitas > 0 ? (economia / receitas) * 100 : 0
  const clamped = Math.max(0, Math.min(100, pct))
  // Cor: laranja (positivo baixo) → verde (alto). Vermelho se negativo.
  let color = '#FB923C'
  if (pct >= 50) color = '#00FF85'
  else if (pct >= 25) color = '#FACC15'
  if (pct < 0) color = '#EF4444'

  // Gauge semi-circular (180°). raio 70, stroke 14.
  const size = 180
  const cx = size / 2
  const cy = size / 2 + 10
  const r = 70
  const stroke = 14
  // Caminho do arco semicircular (da esquerda pra direita, por cima)
  const polarToCartesian = (a) => {
    const rad = (a * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  // 180° = esquerda (start), 0° = direita (end). Vai por cima → ângulos negativos.
  const start = polarToCartesian(180)
  const end = polarToCartesian(0)
  const sweepAngle = 180
  const filledEnd = polarToCartesian(180 - (clamped / 100) * sweepAngle)
  const largeArc = clamped > 50 ? 1 : 0

  const trackPath = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`
  const filledPath = clamped > 0
    ? `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${filledEnd.x} ${filledEnd.y}`
    : null

  const message =
    pct < 0
      ? 'Mês negativo — despesas maiores que receitas.'
      : pct < 20
        ? 'Margem apertada. Que tal revisar as despesas?'
        : pct < 50
          ? 'Boa margem. Continue assim!'
          : 'Excelente! Mais da metade do que entrou ficou.'

  return (
    <div className="panel" style={subtle ? { opacity: 0.92 } : undefined}>
      <div className="panel-head">
        <div>
          <div className="panel-title">{title}</div>
          {showMonth && mk && <div className="panel-sub">{monthLabel(mk)}</div>}
        </div>
      </div>

      <div className="flex items-center gap-16 wrap mt-12">
        <div style={{ position: 'relative', width: size, height: size / 2 + 20 }}>
          <svg width={size} height={size / 2 + 20}>
            {/* Track */}
            <path
              d={trackPath}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
            />
            {/* Filled */}
            {filledPath && (
              <path
                d={filledPath}
                stroke={color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                style={{ transition: 'all 0.4s ease' }}
              />
            )}
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -30%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 800, color }}>
              {Math.round(pct)}%
            </div>
            <div className="text-xs text-2" style={{ marginTop: 2 }}>
              de economia
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 140 }}>
          <div className="text-sm font-bold" style={{ color }}>
            {pct >= 50
              ? 'Parabéns!'
              : pct >= 20
                ? 'No caminho certo'
                : pct >= 0
                  ? 'Atenção'
                  : 'Saldo negativo'}
          </div>
          <div className="text-xs text-2 mt-8" style={{ lineHeight: 1.5 }}>
            {receitas > 0 ? (
              <>
                Você economizou <strong style={{ color }}>{currency(economia)}</strong>
                {' '}({pct.toFixed(1)}% das receitas).
              </>
            ) : (
              <>Sem receitas registradas neste mês.</>
            )}
          </div>
          <div className="text-xs text-2 mt-8" style={{ fontStyle: 'italic' }}>
            {message}
          </div>
        </div>
      </div>
    </div>
  )
}
