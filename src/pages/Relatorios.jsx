import { useMemo, useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Percent,
  FileDown,
  Printer,
  FileText,
  KanbanSquare,
  Receipt,
  CheckCircle2,
  Wallet,
  CalendarRange,
  Repeat,
  Sparkles,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import Avatar from '../components/Avatar'
import DateInput from '../components/DateInput'
import { useDB } from '../data/store'
import { useUI } from '../components/UIProvider'
import {
  currency,
  compactCurrency,
  monthKey,
  currentMonthKey,
  monthLabel,
  lastMonths,
  lastDayOfMonth,
  todayISO,
  addDays,
  addMonths,
  daysUntil,
  daysBetween,
  formatDate,
  formatDayShort,
} from '../lib/format'
import { effectiveStatus } from '../lib/finance'
import { FIN_STATUS } from '../lib/constants'
import { downloadCSV, exportPDF } from '../lib/export'
import Pagination, { usePaginated } from '../components/Pagination'
import { projectedEntries, mrrSummary } from '../lib/projection'

const PRESETS = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: 'ano', label: 'Este ano' },
  { id: 'tudo', label: 'Tudo' },
]

const FORECAST_PRESETS = [
  { id: '1m', label: 'Próximo mês' },
  { id: '3m', label: 'Próximos 3 meses' },
  { id: '6m', label: 'Próximos 6 meses' },
  { id: '12m', label: 'Próximos 12 meses' },
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#101613', border: '1px solid #1f2a24', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#a3a3a3', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {currency(p.value)}
        </div>
      ))}
    </div>
  )
}

function CategoryList({ data, accent }) {
  if (data.length === 0) return <p className="text-sm text-2">Sem lançamentos no período.</p>
  const max = Math.max(...data.map((d) => d.value), 1)
  return data.map((d) => (
    <div key={d.name} style={{ padding: '6px 0' }}>
      <div className="flex justify-between text-sm" style={{ marginBottom: 4 }}>
        <span>{d.name}</span>
        <span className="font-bold">{currency(d.value)}</span>
      </div>
      <div className="progress">
        <div
          className="progress-fill"
          style={{ width: `${(d.value / max) * 100}%`, background: accent }}
        />
      </div>
    </div>
  ))
}

export default function Relatorios() {
  const db = useDB()
  const { toast } = useUI()

  const [mode, setMode] = useState('periodo')
  const [preset, setPreset] = useState('30d')
  const [forecastPreset, setForecastPreset] = useState('3m')
  const [monthSel, setMonthSel] = useState(currentMonthKey())
  const [startDate, setStartDate] = useState(addDays(todayISO(), -29))
  const [endDate, setEndDate] = useState(todayISO())

  const monthOptions = useMemo(() => {
    // Inclui também os 24 próximos meses no select para o modo "Por mês"
    const future = []
    let mk = currentMonthKey()
    for (let i = 0; i < 24; i++) {
      mk = addMonths(`${mk}-01`, 1).slice(0, 7)
      future.push(mk)
    }
    return [...lastMonths(24).reverse(), ...future]
  }, [])

  const mrr = useMemo(() => mrrSummary(db), [db.recurringContracts]) // eslint-disable-line

  // ---------- resolve intervalo {start, end, isForecast} ----------
  const range = useMemo(() => {
    const today = todayISO()
    if (mode === 'mes') {
      return {
        start: `${monthSel}-01`,
        end: lastDayOfMonth(monthSel),
        isForecast: monthSel > currentMonthKey(),
      }
    }
    if (mode === 'intervalo') {
      let s = startDate || today
      let e = endDate || today
      if (s > e) [s, e] = [e, s]
      return { start: s, end: e, isForecast: e > today }
    }
    if (mode === 'projecao') {
      const cur = currentMonthKey()
      const startMK = addMonths(`${cur}-01`, 1).slice(0, 7) // próximo mês
      const monthsAhead = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[forecastPreset] || 3
      const endMK = addMonths(`${startMK}-01`, monthsAhead - 1).slice(0, 7)
      return {
        start: `${startMK}-01`,
        end: lastDayOfMonth(endMK),
        isForecast: true,
      }
    }
    const cur = currentMonthKey()
    switch (preset) {
      case '7d':
        return { start: addDays(today, -6), end: today, isForecast: false }
      case '30d':
        return { start: addDays(today, -29), end: today, isForecast: false }
      case 'mes':
        return { start: `${cur}-01`, end: today, isForecast: false }
      case '3m':
        return { start: `${lastMonths(3)[0]}-01`, end: today, isForecast: false }
      case '6m':
        return { start: `${lastMonths(6)[0]}-01`, end: today, isForecast: false }
      case 'ano':
        return { start: `${cur.slice(0, 4)}-01-01`, end: today, isForecast: false }
      default: {
        const dates = db.financialEntries
          .map((e) => e.dueDate)
          .concat(db.demands.map((d) => (d.createdAt || '').slice(0, 10)))
          .filter(Boolean)
        const earliest = dates.length ? dates.sort()[0] : addMonths(today, -12)
        return { start: earliest, end: today, isForecast: false }
      }
    }
  }, [mode, preset, forecastPreset, monthSel, startDate, endDate, db.financialEntries, db.demands])

  const rangeDays = daysBetween(range.start, range.end) + 1
  const inRange = (iso) => {
    if (!iso) return false
    const d = iso.slice(0, 10)
    return d >= range.start && d <= range.end
  }
  const entryDate = (e) => (e.paymentDate || e.dueDate || '').slice(0, 10)
  const clientName = (id) => db.clients.find((c) => c.id === id)?.name || '—'

  // ---------- buckets (dia ou mês) ----------
  const { granularity, buckets } = useMemo(() => {
    if (rangeDays <= 45) {
      const out = []
      let d = range.start
      while (d <= range.end) {
        out.push({ key: d, label: formatDayShort(d) })
        d = addDays(d, 1)
      }
      return { granularity: 'day', buckets: out }
    }
    const out = []
    let mk = range.start.slice(0, 7)
    const endMk = range.end.slice(0, 7)
    while (mk <= endMk) {
      out.push({ key: mk, label: monthLabel(mk) })
      mk = addMonths(`${mk}-01`, 1).slice(0, 7)
    }
    return { granularity: 'month', buckets: out }
  }, [range, rangeDays])

  const bucketOf = (iso) => (granularity === 'day' ? iso.slice(0, 10) : monthKey(iso))

  // ---------- lançamentos do período (reais + projetados se intervalo toca futuro) ----------
  const periodEntries = useMemo(() => {
    if (range.isForecast) {
      return projectedEntries(db, range.start, range.end).sort((a, b) =>
        entryDate(b).localeCompare(entryDate(a)),
      )
    }
    return db.financialEntries
      .filter((e) => inRange(entryDate(e)))
      .sort((a, b) => entryDate(b).localeCompare(entryDate(a)))
  }, [db, range]) // eslint-disable-line

  const chartData = useMemo(() => {
    const valid = periodEntries.filter((e) => e.status !== 'cancelado')
    return buckets.map((b) => {
      const inBucket = valid.filter((e) => bucketOf(entryDate(e)) === b.key)
      const receitaReal = inBucket
        .filter((e) => e.type === 'receita' && !e.isProjected)
        .reduce((s, e) => s + e.value, 0)
      const receitaProj = inBucket
        .filter((e) => e.type === 'receita' && e.isProjected)
        .reduce((s, e) => s + e.value, 0)
      const despesaReal = inBucket
        .filter((e) => e.type === 'despesa' && !e.isProjected)
        .reduce((s, e) => s + e.value, 0)
      const despesaProj = inBucket
        .filter((e) => e.type === 'despesa' && e.isProjected)
        .reduce((s, e) => s + e.value, 0)
      const receita = receitaReal + receitaProj
      const despesa = despesaReal + despesaProj
      return {
        label: b.label,
        Receita: receita,
        ReceitaReal: receitaReal,
        ReceitaProjetada: receitaProj,
        Despesa: despesa,
        DespesaReal: despesaReal,
        DespesaProjetada: despesaProj,
        Lucro: receita - despesa,
      }
    })
  }, [periodEntries, buckets, granularity]) // eslint-disable-line

  const totals = useMemo(() => {
    const valid = periodEntries.filter((e) => e.status !== 'cancelado')
    const receitas = valid.filter((e) => e.type === 'receita')
    const despesas = valid.filter((e) => e.type === 'despesa')
    const receita = receitas.reduce((s, e) => s + e.value, 0)
    const despesa = despesas.reduce((s, e) => s + e.value, 0)
    const receitaProj = receitas.filter((e) => e.isProjected).reduce((s, e) => s + e.value, 0)
    const despesaProj = despesas.filter((e) => e.isProjected).reduce((s, e) => s + e.value, 0)
    return {
      receita,
      despesa,
      receitaProj,
      despesaProj,
      lucro: receita - despesa,
      margem: receita ? Math.round(((receita - despesa) / receita) * 100) : 0,
      lancamentos: valid.length,
      recebido: receitas.filter((e) => e.status === 'recebido').reduce((s, e) => s + e.value, 0),
      aReceber: receitas
        .filter((e) => e.status === 'pendente' || e.status === 'previsto')
        .reduce((s, e) => s + e.value, 0),
    }
  }, [periodEntries])

  const catBreakdown = (type) => {
    const map = {}
    periodEntries
      .filter((e) => e.type === type && e.status !== 'cancelado')
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.value
      })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }
  const receitasCat = useMemo(() => catBreakdown('receita'), [periodEntries])
  const despesasCat = useMemo(() => catBreakdown('despesa'), [periodEntries])

  const concludedMonth = (d) => {
    const ev = [...d.history].reverse().find((h) => /conclu/i.test(h.text))
    return ev ? ev.date.slice(0, 10) : (d.createdAt || '').slice(0, 10)
  }

  const proposals = useMemo(() => {
    const list = db.proposals.filter((p) => inRange((p.createdAt || '').slice(0, 10)))
    return {
      total: list.length,
      aprovadas: list.filter((p) => p.status === 'aprovada'),
      recusadas: list.filter((p) => p.status === 'recusada'),
      pendentes: list.filter((p) => ['rascunho', 'enviada', 'visualizada'].includes(p.status)),
    }
  }, [db.proposals, range]) // eslint-disable-line

  const demands = useMemo(() => {
    const concluidas = db.demands.filter(
      (d) => d.status === 'concluido' && inRange(concludedMonth(d)),
    )
    const atrasadas = db.demands.filter((d) => {
      if (['concluido', 'cancelado'].includes(d.status)) return false
      const dd = daysUntil(d.dueDate)
      return dd !== null && dd < 0
    })
    return { concluidas, atrasadas }
  }, [db.demands, range]) // eslint-disable-line

  const topClients = useMemo(() => {
    const map = {}
    // No modo projeção, considera o valor "esperado" — tudo que não é cancelado
    const validStatuses = range.isForecast
      ? ['recebido', 'pendente', 'previsto']
      : ['recebido']
    periodEntries
      .filter(
        (e) => e.type === 'receita' && validStatuses.includes(e.status) && e.clientId,
      )
      .forEach((e) => {
        map[e.clientId] = (map[e.clientId] || 0) + e.value
      })
    return Object.entries(map)
      .map(([id, value]) => ({ id, name: clientName(id), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [periodEntries, range.isForecast]) // eslint-disable-line

  const topServices = useMemo(() => {
    const map = {}
    db.demands
      .filter((d) => d.serviceId && inRange((d.createdAt || '').slice(0, 10)))
      .forEach((d) => {
        if (!map[d.serviceId]) map[d.serviceId] = { count: 0, value: 0 }
        map[d.serviceId].count += 1
        map[d.serviceId].value += d.value || 0
      })
    return Object.entries(map)
      .map(([id, v]) => ({ id, name: db.services.find((s) => s.id === id)?.name || '—', ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [db.demands, range]) // eslint-disable-line

  const rangeLabel = `${formatDate(range.start)} até ${formatDate(range.end)} • ${rangeDays} dia(s)`
  const detailPag = usePaginated(periodEntries, 15)

  const exportSummaryCSV = () => {
    const rows = [
      [granularity === 'day' ? 'Dia' : 'Mês', 'Receita', 'Despesa', 'Lucro'],
      ...chartData.map((m) => [
        m.label,
        String(m.Receita).replace('.', ','),
        String(m.Despesa).replace('.', ','),
        String(m.Lucro).replace('.', ','),
      ]),
    ]
    downloadCSV(`relatorio-resumo-${range.start}_${range.end}.csv`, rows)
    toast('Resumo exportado em CSV')
  }

  const exportDetailCSV = () => {
    const rows = [
      ['Data', 'Tipo', 'Descrição', 'Cliente', 'Categoria', 'Valor', 'Status'],
      ...periodEntries.map((e) => [
        formatDate(entryDate(e)),
        e.type === 'receita' ? 'Receita' : 'Despesa',
        e.description,
        clientName(e.clientId),
        e.category,
        String(e.value).replace('.', ','),
        FIN_STATUS[effectiveStatus(e)].label,
      ]),
    ]
    downloadCSV(`relatorio-lancamentos-${range.start}_${range.end}.csv`, rows)
    toast('Lançamentos exportados em CSV')
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle={`Análise de desempenho • ${rangeLabel}`}
        actions={
          <>
            <button className="btn" onClick={exportSummaryCSV}>
              <FileDown size={15} /> CSV
            </button>
            <button className="btn" onClick={exportPDF}>
              <Printer size={15} /> PDF
            </button>
          </>
        }
      />

      {/* ---------- filtros ---------- */}
      <div className="panel">
        <div className="flex items-center gap-12 wrap" style={{ marginBottom: 14 }}>
          <CalendarRange size={17} className="text-neon" />
          <div className="segmented">
            <button className={mode === 'periodo' ? 'active' : ''} onClick={() => setMode('periodo')}>
              Período
            </button>
            <button className={mode === 'mes' ? 'active' : ''} onClick={() => setMode('mes')}>
              Por mês
            </button>
            <button className={mode === 'intervalo' ? 'active' : ''} onClick={() => setMode('intervalo')}>
              Intervalo de dias
            </button>
            <button className={mode === 'projecao' ? 'active' : ''} onClick={() => setMode('projecao')}>
              <Sparkles size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
              Projeção
            </button>
          </div>
          <span className="text-xs text-2">{rangeLabel}</span>
          {range.isForecast && (
            <span
              className="badge"
              style={{
                background: 'rgba(167, 139, 250, 0.14)',
                color: '#A78BFA',
                borderColor: 'rgba(167, 139, 250, 0.3)',
              }}
            >
              <Sparkles size={11} /> Inclui projeções de receita fixa
            </span>
          )}
        </div>

        {mode === 'periodo' && (
          <div className="flex gap-6 wrap">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`pill ${preset === p.id ? 'active' : ''}`}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {mode === 'mes' && (
          <div style={{ maxWidth: 280 }}>
            <select className="select" value={monthSel} onChange={(e) => setMonthSel(e.target.value)}>
              {monthOptions.map((k) => {
                const isFuture = k > currentMonthKey()
                return (
                  <option key={k} value={k}>
                    {monthLabel(k)} ({k}){isFuture ? ' — projeção' : ''}
                  </option>
                )
              })}
            </select>
          </div>
        )}

        {mode === 'intervalo' && (
          <div className="form-row cols-2" style={{ maxWidth: 460 }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Data inicial</label>
              <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Data final</label>
              <DateInput value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        )}

        {mode === 'projecao' && (
          <>
            <div className="flex gap-6 wrap">
              {FORECAST_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`pill ${forecastPreset === p.id ? 'active' : ''}`}
                  onClick={() => setForecastPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div
              className="muted-box mt-16 flex items-center gap-12"
              style={{ borderColor: 'rgba(167, 139, 250, 0.25)' }}
            >
              <Repeat size={18} className="text-neon" />
              <div>
                <div className="font-bold text-sm">
                  MRR ativo: {currency(mrr.receita)} / mês
                  {mrr.despesa > 0 && (
                    <span className="text-2" style={{ fontWeight: 400 }}>
                      {' '}— despesa fixa {currency(mrr.despesa)}/mês
                    </span>
                  )}
                </div>
                <div className="text-xs text-2">
                  {mrr.contratos} contrato(s) ativo(s). A projeção considera todos os
                  contratos ativos e os lançamentos já cadastrados nos próximos meses.
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------- KPIs ---------- */}
      <div className="grid cols-4 mt-24 stagger">
        <StatCard
          icon={ArrowUpCircle}
          label={range.isForecast ? 'Receita projetada' : 'Receita total'}
          value={compactCurrency(totals.receita)}
          accent={range.isForecast ? '#A78BFA' : '#00FF85'}
          trend={
            range.isForecast && totals.receitaProj > 0
              ? { dir: 'flat', text: `${compactCurrency(totals.receitaProj)} de receita fixa` }
              : null
          }
        />
        <StatCard
          icon={ArrowDownCircle}
          label={range.isForecast ? 'Despesa projetada' : 'Despesa total'}
          value={compactCurrency(totals.despesa)}
          accent="#EF4444"
          trend={
            range.isForecast && totals.despesaProj > 0
              ? { dir: 'flat', text: `${compactCurrency(totals.despesaProj)} recorrente` }
              : null
          }
        />
        <StatCard
          icon={TrendingUp}
          label={range.isForecast ? 'Lucro previsto' : 'Lucro do período'}
          value={compactCurrency(totals.lucro)}
          accent={totals.lucro >= 0 ? '#00FF85' : '#EF4444'}
        />
        <StatCard icon={Percent} label="Margem de lucro" value={`${totals.margem}%`} accent="#FACC15" />
      </div>
      <div className="grid cols-4 mt-16 stagger">
        <StatCard icon={Receipt} label="Lançamentos" value={totals.lancamentos} accent="#38BDF8" />
        <StatCard
          icon={Wallet}
          label={range.isForecast ? 'Já recebido no período' : 'Recebido'}
          value={compactCurrency(totals.recebido)}
          accent="#00FF85"
        />
        <StatCard
          icon={ArrowUpCircle}
          label={range.isForecast ? 'A receber + previsto' : 'A receber no período'}
          value={compactCurrency(totals.aReceber)}
          accent="#FACC15"
        />
        <StatCard icon={CheckCircle2} label="Demandas concluídas" value={demands.concluidas.length} accent="#22C55E" />
      </div>

      {/* ---------- gráfico ---------- */}
      <div className="panel mt-24">
        <div className="panel-head">
          <div>
            <div className="panel-title">Receita, despesa e lucro</div>
            <div className="panel-sub">
              {granularity === 'day' ? 'Visão diária' : 'Visão mensal'} • {rangeLabel}
              {range.isForecast && ' • inclui projeções'}
            </div>
          </div>
          {range.isForecast && (
            <div className="flex gap-12 text-xs text-2 items-center wrap">
              <span className="flex items-center gap-6">
                <span style={{ width: 10, height: 10, background: '#00A85A', borderRadius: 2 }} />
                Realizado
              </span>
              <span className="flex items-center gap-6">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: 'repeating-linear-gradient(45deg, #A78BFA 0 3px, transparent 3px 6px)',
                    border: '1px solid #A78BFA',
                    borderRadius: 2,
                  }}
                />
                Projetado
              </span>
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ left: -14, right: 6, top: 6 }}>
            <defs>
              <pattern id="dashedReceita" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="rgba(0, 168, 90, 0.18)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#00A85A" strokeWidth="3" />
              </pattern>
              <pattern id="dashedDespesa" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="rgba(127, 29, 29, 0.18)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#A78BFA" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" stroke="#86868b" fontSize={11} tickLine={false} axisLine={false}
              minTickGap={16} />
            <YAxis stroke="#86868b" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : v)} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="ReceitaReal" name="Receita realizada" stackId="r" fill="#00A85A" radius={[0, 0, 0, 0]} maxBarSize={26} />
            <Bar dataKey="ReceitaProjetada" name="Receita projetada" stackId="r" fill="url(#dashedReceita)" radius={[5, 5, 0, 0]} maxBarSize={26} />
            <Bar dataKey="DespesaReal" name="Despesa realizada" stackId="d" fill="#7f1d1d" radius={[0, 0, 0, 0]} maxBarSize={26} />
            <Bar dataKey="DespesaProjetada" name="Despesa projetada" stackId="d" fill="url(#dashedDespesa)" radius={[5, 5, 0, 0]} maxBarSize={26} />
            <Line type="monotone" dataKey="Lucro" stroke="#00FF85" strokeWidth={2.5} dot={{ r: 2.5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ---------- categorias ---------- */}
      <div className="grid cols-2 mt-24">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Receitas por categoria</span>
          </div>
          <CategoryList data={receitasCat} accent="#00FF85" />
        </div>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Despesas por categoria</span>
          </div>
          <CategoryList data={despesasCat} accent="#EF4444" />
        </div>
      </div>

      {/* ---------- propostas / demandas ---------- */}
      <div className="grid cols-2 mt-24">
        <div className="panel">
          <div className="panel-head">
            <div className="flex items-center gap-8">
              <FileText size={16} className="text-neon" />
              <span className="panel-title">Propostas no período</span>
            </div>
          </div>
          <div className="grid cols-3" style={{ gap: 10 }}>
            <div className="muted-box text-center">
              <div className="stat-value" style={{ fontSize: 22 }}>{proposals.aprovadas.length}</div>
              <div className="text-xs text-2">Aprovadas</div>
            </div>
            <div className="muted-box text-center">
              <div className="stat-value" style={{ fontSize: 22 }}>{proposals.recusadas.length}</div>
              <div className="text-xs text-2">Recusadas</div>
            </div>
            <div className="muted-box text-center">
              <div className="stat-value" style={{ fontSize: 22 }}>{proposals.pendentes.length}</div>
              <div className="text-xs text-2">Em aberto</div>
            </div>
          </div>
          <div className="divider" />
          <div className="flex justify-between text-sm">
            <span className="text-2">Valor aprovado</span>
            <span className="font-bold text-neon">
              {currency(proposals.aprovadas.reduce((s, p) => s + (p.totalValue || 0), 0))}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-8">
            <span className="text-2">Taxa de conversão</span>
            <span className="font-bold">
              {proposals.total ? Math.round((proposals.aprovadas.length / proposals.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="flex items-center gap-8">
              <KanbanSquare size={16} className="text-neon" />
              <span className="panel-title">Demandas</span>
            </div>
          </div>
          <div className="grid cols-2" style={{ gap: 10 }}>
            <div className="muted-box text-center">
              <div className="stat-value text-neon" style={{ fontSize: 24 }}>
                {demands.concluidas.length}
              </div>
              <div className="text-xs text-2">Concluídas no período</div>
            </div>
            <div className="muted-box text-center">
              <div className="stat-value text-danger" style={{ fontSize: 24 }}>
                {demands.atrasadas.length}
              </div>
              <div className="text-xs text-2">Atrasadas (em aberto)</div>
            </div>
          </div>
          <div className="divider" />
          <div className="flex justify-between text-sm">
            <span className="text-2">Valor concluído</span>
            <span className="font-bold text-neon">
              {currency(demands.concluidas.reduce((s, d) => s + (d.value || 0), 0))}
            </span>
          </div>
        </div>
      </div>

      {/* ---------- rankings ---------- */}
      <div className="grid cols-2 mt-24">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Clientes que mais geraram receita</span>
          </div>
          {topClients.length === 0 ? (
            <p className="text-sm text-2">Sem receitas recebidas no período.</p>
          ) : (
            topClients.map((c, i) => (
              <div key={c.id} className="list-row">
                <span className="text-2 font-bold" style={{ width: 18 }}>{i + 1}</span>
                <Avatar name={c.name} size={30} />
                <span style={{ flex: 1 }} className="text-sm font-bold">{c.name}</span>
                <span className="font-bold text-neon">{currency(c.value)}</span>
              </div>
            ))
          )}
        </div>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Serviços mais vendidos</span>
          </div>
          {topServices.length === 0 ? (
            <p className="text-sm text-2">Sem demandas com serviço no período.</p>
          ) : (
            topServices.map((s, i) => (
              <div key={s.id} className="list-row">
                <span className="text-2 font-bold" style={{ width: 18 }}>{i + 1}</span>
                <span style={{ flex: 1 }} className="text-sm font-bold">{s.name}</span>
                <Badge label={`${s.count}x`} color="#38BDF8" dot={false} />
                <span className="font-bold text-neon">{currency(s.value)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---------- detalhamento ---------- */}
      <div className="card mt-24">
        <div className="panel-head" style={{ padding: '18px 20px 0' }}>
          <div>
            <span className="panel-title">Lançamentos do período</span>
            <div className="panel-sub">{periodEntries.length} lançamento(s)</div>
          </div>
          <button className="btn btn-sm" onClick={exportDetailCSV}>
            <FileDown size={14} /> Exportar CSV
          </button>
        </div>
        {periodEntries.length === 0 ? (
          <p className="text-sm text-2" style={{ padding: 20 }}>
            Nenhum lançamento financeiro neste período.
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Cliente</th>
                  <th>Categoria</th>
                  <th className="text-right">Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detailPag.paged.map((e) => {
                  const st = FIN_STATUS[effectiveStatus(e)]
                  return (
                    <tr key={e.id}>
                      <td className="text-sm">{formatDate(entryDate(e))}</td>
                      <td>
                        <Badge
                          label={e.type === 'receita' ? 'Receita' : 'Despesa'}
                          color={e.type === 'receita' ? '#00FF85' : '#EF4444'}
                          dot={false}
                        />
                      </td>
                      <td className="font-bold">{e.description}</td>
                      <td className="text-sm text-2">{clientName(e.clientId)}</td>
                      <td>
                        <span className="tag">{e.category}</span>
                      </td>
                      <td className="text-right font-bold" style={{ color: e.type === 'receita' ? '#00FF85' : '#EF4444' }}>
                        {e.type === 'receita' ? '+' : '-'} {currency(e.value)}
                      </td>
                      <td>
                        <Badge label={st.label} color={st.color} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pagination
              page={detailPag.page}
              pages={detailPag.pages}
              from={detailPag.from}
              to={detailPag.to}
              total={detailPag.total}
              pageSize={detailPag.pageSize}
              onPage={detailPag.setPage}
              onPageSize={detailPag.setPageSize}
            />
          </div>
        )}
      </div>
    </>
  )
}
