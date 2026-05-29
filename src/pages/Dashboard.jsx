import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  KanbanSquare,
  Loader,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  FileText,
  CalendarClock,
  AlertTriangle,
  Target,
  Scale,
  Clock,
  Hourglass,
  SlidersHorizontal,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import MonthStepper from '../components/MonthStepper'
import CustomizeMetricsModal from '../components/CustomizeMetricsModal'
import { useDB, updateSettings } from '../data/store'
import { totalRealBalance } from '../lib/bankAccounts'
import {
  METRIC_DEFS,
  METRIC_MAP,
  METRIC_GROUPS,
  DEFAULT_DASHBOARD_METRICS,
} from '../lib/dashboardMetrics'

// Mapa de ícones disponíveis para o catálogo de métricas.
const ICONS = {
  KanbanSquare,
  Loader,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  FileText,
  CalendarClock,
  AlertTriangle,
  Target,
  Scale,
  Clock,
  Hourglass,
}
import {
  currency,
  compactCurrency,
  monthKey,
  currentMonthKey,
  monthLabel,
  lastMonths,
  formatDate,
  daysUntil,
  relativeDeadline,
  addMonths,
  lastDayOfMonth,
} from '../lib/format'
import { projectedEntries } from '../lib/projection'
import {
  KANBAN_COLUMNS,
  PROPOSAL_STATUS,
  PRIORITY_MAP,
} from '../lib/constants'

function ChartTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#101613',
        border: '1px solid #1f2a24',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12,
        boxShadow: '0 10px 30px -12px rgba(0,0,0,0.8)',
      }}
    >
      <div style={{ color: '#a3a3a3', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.payload?.fill, fontWeight: 600 }}>
          {p.name}: {money ? currency(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const db = useDB()
  const [period, setPeriod] = useState(currentMonthKey())
  const [customizeOpen, setCustomizeOpen] = useState(false)

  // Lista de métricas exibidas (persistida nas settings)
  const selectedMetrics =
    db.settings?.dashboardMetrics?.length
      ? db.settings.dashboardMetrics
      : DEFAULT_DASHBOARD_METRICS

  const saveMetrics = (ids) => updateSettings({ dashboardMetrics: ids })

  // 12 meses passados + atual + 12 meses futuros (ordem cronológica ascendente)
  const months = useMemo(() => {
    const past = lastMonths(12)
    const future = []
    let mk = currentMonthKey()
    for (let i = 0; i < 12; i++) {
      mk = addMonths(`${mk}-01`, 1).slice(0, 7)
      future.push(mk)
    }
    return [...past, ...future]
  }, [])

  // ---------- TODAS as métricas pré-calculadas ----------
  // Cada card do dashboard só lê dessa estrutura — sem cálculo duplicado.
  const m = useMemo(() => {
    const cur = currentMonthKey()
    const sel = period === 'all' ? cur : period
    const inPeriod = (key) => period === 'all' || key === sel
    const isFuturePeriod = period !== 'all' && period > cur

    const demands = db.demands
    const open = demands.filter((d) => !['concluido', 'cancelado'].includes(d.status))
    const andamento = demands.filter((d) =>
      ['producao', 'revisao'].includes(d.status),
    )
    const concluidasMes = demands.filter((d) => {
      if (d.status !== 'concluido') return false
      const ev = [...d.history].reverse().find((h) => /conclu/i.test(h.text))
      return ev ? inPeriod(monthKey(ev.date)) : false
    })
    const atrasadas = demands.filter((d) => {
      if (['concluido', 'cancelado'].includes(d.status)) return false
      const dd = daysUntil(d.dueDate)
      return dd !== null && dd < 0
    })
    const aguardandoCliente = demands.filter((d) =>
      ['briefing', 'aprovacao'].includes(d.status),
    )

    const refMonth = (e) => monthKey(e.paymentDate || e.dueDate)

    // Quando o mês selecionado é futuro, inclui também as receitas/despesas
    // PROJETADAS de contratos recorrentes para esse mês (entries virtuais).
    // Assim os cards mostram corretamente o que está previsto para entrar/sair.
    let entriesForPeriod = db.financialEntries
    if (isFuturePeriod) {
      const start = `${period}-01`
      const end = lastDayOfMonth(period)
      const projected = projectedEntries(db, start, end)
      const realOther = db.financialEntries.filter((e) => refMonth(e) !== period)
      entriesForPeriod = [...realOther, ...projected]
    }

    const receitas = entriesForPeriod.filter(
      (e) => e.type === 'receita' && e.status !== 'cancelado',
    )
    const despesas = entriesForPeriod.filter(
      (e) => e.type === 'despesa' && e.status !== 'cancelado',
    )

    const receitasRecebidas = receitas
      .filter((e) => e.status === 'recebido' && inPeriod(refMonth(e)))
      .reduce((s, e) => s + e.value, 0)
    // Pendentes inclui status 'pendente' E 'previsto' (projetadas de contratos)
    const receitasPendentes = receitas
      .filter(
        (e) => e.status !== 'recebido' && inPeriod(monthKey(e.dueDate)),
      )
      .reduce((s, e) => s + e.value, 0)
    const receitasPrevistas = receitasRecebidas + receitasPendentes

    const despesasPagas = despesas
      .filter((e) => e.status === 'pago' && inPeriod(refMonth(e)))
      .reduce((s, e) => s + e.value, 0)
    const despesasPendentes = despesas
      .filter((e) => e.status !== 'pago' && inPeriod(monthKey(e.dueDate)))
      .reduce((s, e) => s + e.value, 0)
    const despesasPrevistas = despesasPagas + despesasPendentes

    // Saldo total da conta é SEMPRE o saldo real (só entries reais quitadas).
    const saldoTotal = totalRealBalance(db.bankAccounts, db.financialEntries)
    // Saldo previsto do mês = receita prevista - despesa prevista do mês.
    // (Considera receitas projetadas de contratos quando navega no futuro.)
    const saldoPrevistoMes = receitasPrevistas - despesasPrevistas

    const lucroRealizado = receitasRecebidas - despesasPagas
    const lucroEstimado = receitasPrevistas - despesasPrevistas

    // Contas vencidas (qualquer mês) e a vencer nos próximos 30 dias
    const contasVencidas = db.financialEntries.filter((e) => {
      if (e.type === 'transferencia') return false
      if (e.status !== 'pendente') return false
      const dd = daysUntil(e.dueDate)
      return dd !== null && dd < 0
    })
    const contasAVencer = db.financialEntries.filter((e) => {
      if (e.type === 'transferencia') return false
      if (e.status !== 'pendente') return false
      const dd = daysUntil(e.dueDate)
      return dd !== null && dd >= 0 && dd <= 30
    })

    // mês anterior para tendência
    const prev = addMonths(`${sel}-01`, -1).slice(0, 7)
    const recebidoPrev = receitas
      .filter((e) => e.status === 'recebido' && refMonth(e) === prev)
      .reduce((s, e) => s + e.value, 0)

    const propostasEnviadas = db.proposals.filter((p) =>
      ['enviada', 'visualizada'].includes(p.status),
    ).length
    const propostasAprovadas = db.proposals.filter((p) => p.status === 'aprovada').length
    const propostasRecusadas = db.proposals.filter((p) => p.status === 'recusada').length
    const propostasFinalizadas = propostasAprovadas + propostasRecusadas

    return {
      // financeiro
      saldoTotal,
      saldoPrevistoMes,
      receitasRecebidas,
      receitasPendentes,
      receitasPrevistas,
      despesasPagas,
      despesasPendentes,
      despesasPrevistas,
      lucroRealizado,
      lucroEstimado,
      recebidoPrev,
      contasVencidasCount: contasVencidas.length,
      contasVencidasValor: contasVencidas.reduce((s, e) => s + e.value, 0),
      contasAVencerCount: contasAVencer.length,
      contasAVencerValor: contasAVencer.reduce((s, e) => s + e.value, 0),
      // demandas / propostas
      demandasAbertas: open.length,
      demandasAndamento: andamento.length,
      demandasConcluidasMes: concluidasMes.length,
      demandasAtrasadas: atrasadas.length,
      demandasAguardandoCliente: aguardandoCliente.length,
      demandasTotal: demands.length,
      propostasEnviadas,
      propostasAprovadas,
      propostasRecusadas,
      propostasFinalizadas,
    }
  }, [db, period])

  const monthlyData = useMemo(() => {
    const months = lastMonths(6)
    return months.map((key) => {
      const receita = db.financialEntries
        .filter((e) => e.type === 'receita' && monthKey(e.paymentDate || e.dueDate) === key)
        .reduce((s, e) => s + e.value, 0)
      const despesa = db.financialEntries
        .filter((e) => e.type === 'despesa' && monthKey(e.paymentDate || e.dueDate) === key)
        .reduce((s, e) => s + e.value, 0)
      return { mes: monthLabel(key), Receita: receita, Despesa: despesa }
    })
  }, [db])

  const stageData = useMemo(
    () =>
      KANBAN_COLUMNS.map((c) => ({
        name: c.label.replace('Aguardando ', '').replace('Em ', ''),
        value: db.demands.filter((d) => d.status === c.id).length,
        fill: c.accent,
      })),
    [db],
  )

  const proposalData = useMemo(
    () =>
      PROPOSAL_STATUS.map((s) => ({
        name: s.label,
        value: db.proposals.filter((p) => p.status === s.id).length,
        fill: s.color,
      })).filter((d) => d.value > 0),
    [db],
  )

  const upcoming = useMemo(
    () =>
      db.demands
        .filter((d) => !['concluido', 'cancelado'].includes(d.status))
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 5),
    [db],
  )

  const alerts = useMemo(
    () =>
      db.financialEntries
        .filter((e) => {
          if (e.status === 'recebido' || e.status === 'pago' || e.status === 'cancelado')
            return false
          const dd = daysUntil(e.dueDate)
          return dd !== null && dd <= 7
        })
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 6),
    [db],
  )

  const clientName = (id) => db.clients.find((c) => c.id === id)?.name || '—'

  const trendRecebido =
    m.recebidoPrev === 0
      ? null
      : m.receitasRecebidas >= m.recebidoPrev
        ? { dir: 'up', text: `${Math.round(((m.receitasRecebidas - m.recebidoPrev) / m.recebidoPrev) * 100)}% vs. mês anterior` }
        : { dir: 'down', text: `${Math.round(((m.receitasRecebidas - m.recebidoPrev) / m.recebidoPrev) * 100)}% vs. mês anterior` }

  // Renderiza um card de métrica de acordo com a definição do catálogo
  const renderMetric = (id) => {
    const def = METRIC_MAP[id]
    if (!def) return null
    const Icon = ICONS[def.icon] || KanbanSquare
    const accent = def.dynamicAccent ? def.dynamicAccent(m) : def.accent
    const trend = id === 'receitasRecebidas' ? trendRecebido : null
    return (
      <StatCard
        key={id}
        icon={Icon}
        label={def.label}
        value={def.compute(m)}
        accent={accent}
        trend={trend || undefined}
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Visão geral do estúdio • ${monthLabel(currentMonthKey())}`}
        actions={
          <Link to="/demandas" className="btn btn-primary">
            <KanbanSquare size={15} /> Ir para Demandas
          </Link>
        }
      />

      <div className="flex items-center justify-between wrap gap-12 mb-16">
        <MonthStepper value={period} months={months} onChange={setPeriod} />
        <div className="flex items-center gap-8 wrap">
          <span className="text-xs text-2" style={{ marginRight: 4 }}>
            Métricas financeiras respeitam o mês selecionado.
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setCustomizeOpen(true)}
            title="Escolher quais métricas aparecem no Dashboard"
          >
            <SlidersHorizontal size={14} /> Personalizar métricas
          </button>
        </div>
      </div>

      {selectedMetrics.length === 0 ? (
        <div className="muted-box text-sm text-2">
          Nenhuma métrica selecionada. Use <strong>Personalizar métricas</strong> para
          escolher quais cards exibir.
        </div>
      ) : (
        <div className="grid cols-5 stagger">
          {selectedMetrics.map(renderMetric)}
        </div>
      )}

      {db.settings.monthlyGoal > 0 && (
        <div className="goal-card mt-24">
          <div className="flex justify-between items-center wrap gap-12 mb-16">
            <div className="flex items-center gap-12">
              <div
                className="stat-icon"
                style={{
                  background: 'rgba(0,255,133,0.16)',
                  color: 'var(--neon)',
                  marginBottom: 0,
                }}
              >
                <Target />
              </div>
              <div>
                <div className="font-bold">
                  Meta de faturamento — {monthLabel(period === 'all' ? currentMonthKey() : period)}
                </div>
                <div className="text-xs text-2">
                  Recebido no mês comparado com a meta configurada
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-2">Progresso</div>
              <div className="font-bold" style={{ fontSize: 22, color: m.receitasRecebidas >= db.settings.monthlyGoal ? '#00FF85' : 'var(--text)' }}>
                {Math.round((m.receitasRecebidas / db.settings.monthlyGoal) * 100)}%
              </div>
            </div>
          </div>
          <div className="progress" style={{ height: 10 }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, (m.receitasRecebidas / db.settings.monthlyGoal) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-sm mt-8 wrap gap-8">
            <span className="text-2">
              Recebido:{' '}
              <span className="text-neon font-bold">{currency(m.receitasRecebidas)}</span>
            </span>
            <span className="text-2">
              Faltam:{' '}
              <span className="font-bold">
                {currency(Math.max(0, db.settings.monthlyGoal - m.receitasRecebidas))}
              </span>
            </span>
            <span className="text-2">
              Meta:{' '}
              <span className="font-bold">{currency(db.settings.monthlyGoal)}</span>
            </span>
          </div>
        </div>
      )}

      <div className="grid cols-3 mt-24" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Receitas x Despesas</div>
              <div className="panel-sub">Últimos 6 meses</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={252}>
            <AreaChart data={monthlyData} margin={{ left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF85" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#00FF85" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDespesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#18211c" vertical={false} />
              <XAxis dataKey="mes" stroke="#5f6b64" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#5f6b64"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
              />
              <Tooltip content={<ChartTooltip money />} cursor={{ stroke: '#1f2a24' }} />
              <Area
                type="monotone"
                dataKey="Receita"
                stroke="#00FF85"
                strokeWidth={2}
                fill="url(#gReceita)"
              />
              <Area
                type="monotone"
                dataKey="Despesa"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#gDespesa)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Propostas por status</div>
              <div className="panel-sub">{db.proposals.length} no total</div>
            </div>
          </div>
          {proposalData.length === 0 ? (
            <p className="text-2 text-sm">Nenhuma proposta cadastrada.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={proposalData}
                    dataKey="value"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {proposalData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-8">
                {proposalData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm" style={{ padding: '3px 0' }}>
                    <span className="flex items-center gap-8">
                      <span className="dot-sm" style={{ background: d.fill }} />
                      {d.name}
                    </span>
                    <span className="font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel mt-24">
        <div className="panel-head">
          <div>
            <div className="panel-title">Demandas por etapa</div>
            <div className="panel-sub">Distribuição atual do Kanban</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stageData} margin={{ left: -22, right: 6, top: 6 }}>
            <CartesianGrid stroke="#18211c" vertical={false} />
            <XAxis dataKey="name" stroke="#5f6b64" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#5f6b64" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#0f1612' }} />
            <Bar dataKey="value" name="Demandas" radius={[6, 6, 0, 0]}>
              {stageData.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid cols-2 mt-24">
        <div className="panel">
          <div className="panel-head">
            <div className="flex items-center gap-8">
              <CalendarClock size={17} className="text-neon" />
              <span className="panel-title">Próximas entregas</span>
            </div>
            <Link to="/demandas" className="text-xs text-neon">
              Ver Kanban
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-2 text-sm">Nenhuma demanda em aberto.</p>
          ) : (
            upcoming.map((d) => {
              const dd = daysUntil(d.dueDate)
              const late = dd !== null && dd < 0
              const prio = PRIORITY_MAP[d.priority]
              return (
                <div key={d.id} className="list-row">
                  <span
                    className="dot-sm"
                    style={{ background: prio.color, width: 8, height: 8 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</div>
                    <div className="text-xs text-2">{clientName(d.clientId)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{formatDate(d.dueDate)}</div>
                    <div
                      className="text-xs"
                      style={{ color: late ? '#ef4444' : 'var(--text-2)' }}
                    >
                      {relativeDeadline(d.dueDate)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="flex items-center gap-8">
              <AlertTriangle size={17} className="text-warn" />
              <span className="panel-title">Alertas financeiros</span>
            </div>
            <Link to="/financeiro" className="text-xs text-neon">
              Ver financeiro
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-2 text-sm">Nenhuma conta vencendo nos próximos dias.</p>
          ) : (
            alerts.map((e) => {
              const dd = daysUntil(e.dueDate)
              const late = dd < 0
              return (
                <div key={e.id} className="list-row">
                  <div
                    className="dot-icon"
                    style={{
                      background: late ? 'rgba(239,68,68,0.14)' : 'rgba(250,204,21,0.14)',
                      color: late ? '#ef4444' : '#facc15',
                    }}
                  >
                    {e.type === 'receita' ? (
                      <ArrowUpCircle size={15} />
                    ) : (
                      <ArrowDownCircle size={15} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.description}</div>
                    <div className="text-xs text-2">
                      {e.type === 'receita' ? 'A receber' : 'A pagar'} • vence {formatDate(e.dueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{currency(e.value)}</div>
                    <Badge
                      label={late ? 'Atrasado' : 'A vencer'}
                      color={late ? '#ef4444' : '#facc15'}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <CustomizeMetricsModal
        open={customizeOpen}
        title="Personalizar métricas do Dashboard"
        hint="Marque/desmarque métricas, reordene a lista e salve. As métricas financeiras respeitam o mês selecionado no Dashboard. As preferências ficam salvas neste navegador."
        catalog={METRIC_DEFS}
        groups={METRIC_GROUPS}
        defaults={DEFAULT_DASHBOARD_METRICS}
        selected={selectedMetrics}
        onClose={() => setCustomizeOpen(false)}
        onSave={saveMetrics}
      />
    </>
  )
}
