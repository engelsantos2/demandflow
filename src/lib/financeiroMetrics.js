// Catálogo de métricas disponíveis para a tela Financeiro.
//
// Estrutura igual à de dashboardMetrics.js — cada item tem um id estável,
// um label, um grupo, um ícone (resolvido em runtime na página), accent fixo
// e/ou dinâmico, e uma função compute(m) que recebe TODAS as métricas
// pré-calculadas pela página e devolve o valor já formatado.
//
// O id é persistido em settings.financeiroMetrics.

import { compactCurrency } from './format'

export const FIN_METRIC_DEFS = [
  // ===== Saldos =====
  {
    id: 'saldoTotal',
    label: 'Saldo total da conta',
    group: 'saldos',
    icon: 'Scale',
    accent: '#00FF85',
    compute: (m) => compactCurrency(m.saldoTotal),
    dynamicAccent: (m) => (m.saldoTotal >= 0 ? '#00FF85' : '#EF4444'),
  },
  {
    id: 'saldoPrevistoMes',
    label: 'Saldo previsto do mês',
    group: 'saldos',
    icon: 'TrendingUp',
    accent: '#00FF85',
    compute: (m) => compactCurrency(m.saldoPrevistoMes),
    dynamicAccent: (m) => (m.saldoPrevistoMes >= 0 ? '#00FF85' : '#EF4444'),
  },

  // ===== Receitas =====
  {
    id: 'receitaTotalMes',
    label: 'Receita total do mês',
    group: 'receitas',
    icon: 'ArrowUpCircle',
    accent: '#00FF85',
    compute: (m) => compactCurrency(m.receitaTotalMes),
  },
  {
    id: 'receitasRecebidas',
    label: 'Receitas recebidas',
    group: 'receitas',
    icon: 'ArrowUpCircle',
    accent: '#00FF85',
    compute: (m) => compactCurrency(m.receitasRecebidas),
  },
  {
    id: 'receitasPendentes',
    label: 'Receitas pendentes',
    group: 'receitas',
    icon: 'Clock',
    accent: '#FACC15',
    compute: (m) => compactCurrency(m.receitasPendentes),
  },
  {
    id: 'totalAReceber',
    label: 'Total a receber',
    group: 'receitas',
    icon: 'Wallet',
    accent: '#FACC15',
    compute: (m) => compactCurrency(m.totalAReceber),
  },

  // ===== Despesas =====
  {
    id: 'despesasMes',
    label: 'Despesas do mês',
    group: 'despesas',
    icon: 'ArrowDownCircle',
    accent: '#EF4444',
    compute: (m) => compactCurrency(m.despesasMes),
  },
  {
    id: 'despesasPagas',
    label: 'Despesas pagas',
    group: 'despesas',
    icon: 'ArrowDownCircle',
    accent: '#EF4444',
    compute: (m) => compactCurrency(m.despesasPagas),
  },
  {
    id: 'despesasPendentes',
    label: 'Despesas pendentes',
    group: 'despesas',
    icon: 'Clock',
    accent: '#FACC15',
    compute: (m) => compactCurrency(m.despesasPendentes),
  },
  {
    id: 'totalAPagar',
    label: 'Total a pagar',
    group: 'despesas',
    icon: 'Wallet',
    accent: '#FB923C',
    compute: (m) => compactCurrency(m.totalAPagar),
  },

  // ===== Alertas =====
  {
    id: 'contasVencidas',
    label: 'Contas vencidas',
    group: 'alertas',
    icon: 'AlertTriangle',
    accent: '#EF4444',
    compute: (m) => `${m.contasVencidasCount} • ${compactCurrency(m.contasVencidasValor)}`,
  },
  {
    id: 'contasAVencer',
    label: 'Contas a vencer (30d)',
    group: 'alertas',
    icon: 'CalendarClock',
    accent: '#FACC15',
    compute: (m) => `${m.contasAVencerCount} • ${compactCurrency(m.contasAVencerValor)}`,
  },
]

export const FIN_METRIC_MAP = Object.fromEntries(
  FIN_METRIC_DEFS.map((d) => [d.id, d]),
)

// Layout padrão (5 cards): Saldo total | Receita total do mês | Receitas
// pendentes | Despesas do mês | Saldo previsto do mês.
export const DEFAULT_FINANCEIRO_METRICS = [
  'saldoTotal',
  'receitaTotalMes',
  'receitasPendentes',
  'despesasMes',
  'saldoPrevistoMes',
]

export const FIN_METRIC_GROUPS = [
  { id: 'saldos', label: 'Saldos' },
  { id: 'receitas', label: 'Receitas' },
  { id: 'despesas', label: 'Despesas' },
  { id: 'alertas', label: 'Alertas' },
]
