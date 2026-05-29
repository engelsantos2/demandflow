// Catálogo de métricas disponíveis para o Dashboard.
//
// Cada item define:
//  • id        — identificador estável (persistido em settings.dashboardMetrics)
//  • label     — texto exibido nos cards e no modal de personalização
//  • group     — 'financeiro' | 'demandas'
//  • icon      — nome do ícone (resolvido em runtime no Dashboard.jsx)
//  • accent    — cor do StatCard
//  • compute   — função (m) => valor já formatado/pronto para exibir
//  • dynamicAccent (opcional) — função (m) => cor calculada em runtime
//
// A função compute recebe um objeto `m` com TODAS as métricas pré-calculadas
// (ver Dashboard.jsx). Assim cada métrica é só uma "view" de m.

import { compactCurrency } from './format'

export const METRIC_DEFS = [
  // ===== FINANCEIRO =====
  {
    id: 'saldoTotal',
    label: 'Saldo total da conta',
    group: 'financeiro',
    icon: 'Scale',
    accent: '#00FF85',
    compute: (m) => compactCurrency(m.saldoTotal),
    dynamicAccent: (m) => (m.saldoTotal >= 0 ? '#00FF85' : '#EF4444'),
  },
  {
    id: 'saldoPrevistoMes',
    label: 'Saldo previsto do mês',
    group: 'financeiro',
    icon: 'Hourglass',
    accent: '#38BDF8',
    compute: (m) => compactCurrency(m.saldoPrevistoMes),
    dynamicAccent: (m) => (m.saldoPrevistoMes >= 0 ? '#38BDF8' : '#EF4444'),
  },
  {
    id: 'receitasRecebidas',
    label: 'Receitas recebidas',
    group: 'financeiro',
    icon: 'ArrowUpCircle',
    accent: '#00FF85',
    compute: (m) => compactCurrency(m.receitasRecebidas),
  },
  {
    id: 'receitasPendentes',
    label: 'Receitas pendentes',
    group: 'financeiro',
    icon: 'Clock',
    accent: '#FACC15',
    compute: (m) => compactCurrency(m.receitasPendentes),
  },
  {
    id: 'receitasPrevistas',
    label: 'Receitas previstas',
    group: 'financeiro',
    icon: 'Hourglass',
    accent: '#38BDF8',
    compute: (m) => compactCurrency(m.receitasPrevistas),
  },
  {
    id: 'despesasPagas',
    label: 'Despesas pagas',
    group: 'financeiro',
    icon: 'ArrowDownCircle',
    accent: '#EF4444',
    compute: (m) => compactCurrency(m.despesasPagas),
  },
  {
    id: 'despesasPendentes',
    label: 'Despesas pendentes',
    group: 'financeiro',
    icon: 'Clock',
    accent: '#FACC15',
    compute: (m) => compactCurrency(m.despesasPendentes),
  },
  {
    id: 'despesasPrevistas',
    label: 'Despesas previstas',
    group: 'financeiro',
    icon: 'Hourglass',
    accent: '#A78BFA',
    compute: (m) => compactCurrency(m.despesasPrevistas),
  },
  {
    id: 'lucroRealizado',
    label: 'Lucro realizado',
    group: 'financeiro',
    icon: 'TrendingUp',
    accent: '#00FF85',
    compute: (m) => compactCurrency(m.lucroRealizado),
    dynamicAccent: (m) => (m.lucroRealizado >= 0 ? '#00FF85' : '#EF4444'),
  },
  {
    id: 'lucroEstimado',
    label: 'Lucro estimado',
    group: 'financeiro',
    icon: 'TrendingUp',
    accent: '#00FF85',
    compute: (m) => compactCurrency(m.lucroEstimado),
    dynamicAccent: (m) => (m.lucroEstimado >= 0 ? '#00FF85' : '#EF4444'),
  },
  {
    id: 'contasVencidas',
    label: 'Contas vencidas',
    group: 'financeiro',
    icon: 'AlertTriangle',
    accent: '#EF4444',
    compute: (m) => `${m.contasVencidasCount} • ${compactCurrency(m.contasVencidasValor)}`,
  },
  {
    id: 'contasAVencer',
    label: 'Contas a vencer (30d)',
    group: 'financeiro',
    icon: 'CalendarClock',
    accent: '#FACC15',
    compute: (m) => `${m.contasAVencerCount} • ${compactCurrency(m.contasAVencerValor)}`,
  },

  // ===== DEMANDAS / PROPOSTAS =====
  {
    id: 'demandasAbertas',
    label: 'Demandas abertas',
    group: 'demandas',
    icon: 'KanbanSquare',
    accent: '#38BDF8',
    compute: (m) => m.demandasAbertas,
  },
  {
    id: 'demandasAndamento',
    label: 'Em andamento',
    group: 'demandas',
    icon: 'Loader',
    accent: '#00FF85',
    compute: (m) => m.demandasAndamento,
  },
  {
    id: 'demandasConcluidasMes',
    label: 'Concluídas no mês',
    group: 'demandas',
    icon: 'CheckCircle2',
    accent: '#22C55E',
    compute: (m) => m.demandasConcluidasMes,
  },
  {
    id: 'demandasAtrasadas',
    label: 'Demandas atrasadas',
    group: 'demandas',
    icon: 'AlertTriangle',
    accent: '#EF4444',
    compute: (m) => m.demandasAtrasadas,
  },
  {
    id: 'demandasAguardandoCliente',
    label: 'Aguardando cliente',
    group: 'demandas',
    icon: 'Clock',
    accent: '#FB923C',
    compute: (m) => m.demandasAguardandoCliente,
  },
  {
    id: 'demandasTotal',
    label: 'Total de demandas',
    group: 'demandas',
    icon: 'KanbanSquare',
    accent: '#A78BFA',
    compute: (m) => m.demandasTotal,
  },
  {
    id: 'propostasEnviadas',
    label: 'Propostas enviadas',
    group: 'demandas',
    icon: 'FileText',
    accent: '#A78BFA',
    compute: (m) => m.propostasEnviadas,
  },
  {
    id: 'propostasAprovadas',
    label: 'Propostas aprovadas',
    group: 'demandas',
    icon: 'CheckCircle2',
    accent: '#00FF85',
    compute: (m) => m.propostasAprovadas,
  },
  {
    id: 'propostasRecusadas',
    label: 'Propostas recusadas',
    group: 'demandas',
    icon: 'AlertTriangle',
    accent: '#EF4444',
    compute: (m) => m.propostasRecusadas,
  },
  {
    id: 'taxaAprovacaoPropostas',
    label: 'Taxa de aprovação',
    group: 'demandas',
    icon: 'Target',
    accent: '#00FF85',
    compute: (m) =>
      m.propostasFinalizadas === 0
        ? '—'
        : `${Math.round((m.propostasAprovadas / m.propostasFinalizadas) * 100)}%`,
  },
]

export const METRIC_MAP = Object.fromEntries(METRIC_DEFS.map((m) => [m.id, m]))

// Layout padrão para usuários novos / reset.
export const DEFAULT_DASHBOARD_METRICS = [
  'saldoTotal',
  'saldoPrevistoMes',
  'receitasRecebidas',
  'receitasPendentes',
  'despesasPagas',
  'lucroEstimado',
  'demandasAbertas',
  'demandasAndamento',
  'demandasConcluidasMes',
  'propostasEnviadas',
]

export const METRIC_GROUPS = [
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'demandas', label: 'Demandas e propostas' },
]
