import { useMemo, useState } from 'react'
import {
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
  Plus,
  Search,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Scale,
  Pencil,
  Trash2,
  Check,
  FileDown,
  Printer,
  Repeat,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Landmark,
  Hourglass,
  Clock,
  AlertTriangle,
  CalendarClock,
  SlidersHorizontal,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import FinancialModal from '../components/FinancialModal'
import TransferModal from '../components/TransferModal'
import BankAccountModal from '../components/BankAccountModal'
import RecurringContractModal from '../components/RecurringContractModal'
import RecurrenceScopeModal from '../components/RecurrenceScopeModal'
import CategoryModal from '../components/CategoryModal'
import CustomizeMetricsModal from '../components/CustomizeMetricsModal'
import MonthStepper from '../components/MonthStepper'
import Pagination, { usePaginated } from '../components/Pagination'
import { useDB, update, remove, insert, updateSettings } from '../data/store'
import { useUI } from '../components/UIProvider'
import {
  currency,
  compactCurrency,
  formatDate,
  monthKey,
  currentMonthKey,
  monthLabel,
  lastMonths,
  todayISO,
  daysUntil,
  addMonths,
  lastDayOfMonth,
} from '../lib/format'
import { effectiveStatus } from '../lib/finance'
import { FIN_STATUS, CONTRACT_STATUS_MAP } from '../lib/constants'
import { downloadCSV, exportPDF } from '../lib/export'
import {
  accountBalance,
  totalRealBalance,
  ACCOUNT_TYPES,
} from '../lib/bankAccounts'
import { mrrSummary, projectedEntries } from '../lib/projection'
import { getCategories } from '../lib/categories'
import {
  FIN_METRIC_DEFS,
  FIN_METRIC_MAP,
  FIN_METRIC_GROUPS,
  DEFAULT_FINANCEIRO_METRICS,
} from '../lib/financeiroMetrics'

const ACCOUNT_TYPE_LABEL = Object.fromEntries(ACCOUNT_TYPES.map((t) => [t.id, t.label]))

const CAT_COLORS = ['#00FF85', '#38BDF8', '#FACC15', '#A78BFA', '#FB923C', '#EF4444', '#22C55E', '#F472B6']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#101613',
        border: '1px solid #1f2a24',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      {label && <div style={{ color: '#a3a3a3', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.payload?.fill, fontWeight: 600 }}>
          {p.name}: {currency(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Financeiro() {
  const db = useDB()
  const { toast, confirm } = useUI()

  const [tab, setTab] = useState('visao')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [modalType, setModalType] = useState('receita')
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferEditId, setTransferEditId] = useState(null)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState(null)
  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [editingContractId, setEditingContractId] = useState(null)
  const [contractDefaultType, setContractDefaultType] = useState('receita')
  // Modal de escopo (Apenas este / Toda a recorrência) para entries vinculadas a contrato.
  // pendingScope: { action: 'edit' | 'delete', entry }
  const [pendingScope, setPendingScope] = useState(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [categoryDefaultScope, setCategoryDefaultScope] = useState('receita')
  const [customizeOpen, setCustomizeOpen] = useState(false)

  // Métricas escolhidas pelo usuário (persistidas em settings.financeiroMetrics)
  const selectedMetrics =
    db.settings?.financeiroMetrics?.length
      ? db.settings.financeiroMetrics
      : DEFAULT_FINANCEIRO_METRICS

  const saveMetrics = (ids) => updateSettings({ financeiroMetrics: ids })

  const [period, setPeriod] = useState(currentMonthKey())
  const [fStatus, setFStatus] = useState('')
  const [fClient, setFClient] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [text, setText] = useState('')

  const clientName = (id) => db.clients.find((c) => c.id === id)?.name || '—'
  const refMonth = (e) => monthKey(e.paymentDate || e.dueDate)

  // 12 meses passados + atual + 12 meses futuros, em ordem cronológica
  // (mais antigo → mais recente). Assim ◀ vai pro passado e ▶ vai pro futuro.
  const months = useMemo(() => {
    const past = lastMonths(12) // já vem em ordem ascendente, terminando no mês atual
    const future = []
    let mk = currentMonthKey()
    for (let i = 0; i < 12; i++) {
      mk = addMonths(`${mk}-01`, 1).slice(0, 7)
      future.push(mk)
    }
    return [...past, ...future]
  }, [])

  const isFuturePeriod = period !== 'all' && period > currentMonthKey()

  // Quando o período é futuro, gera entries virtuais de contratos para esse mês
  // e mescla com as entries reais já existentes naquele mês.
  const enrichedEntries = useMemo(() => {
    if (period === 'all') return db.financialEntries
    const start = `${period}-01`
    const end = lastDayOfMonth(period)
    if (!isFuturePeriod) {
      // Mesmo no presente, podemos ter contratos que ainda não geraram
      // (raro, mas o processRecurring garante o mês atual — então só filtramos)
      return db.financialEntries
    }
    // Mês futuro: usa projectedEntries (reais + virtuais sem duplicar)
    const projected = projectedEntries(db, start, end)
    // Mantém também entries reais de outros meses (necessário pro card de "Total a receber")
    const realOtherMonths = db.financialEntries.filter((e) => refMonth(e) !== period)
    return [...realOtherMonths, ...projected]
  }, [db, period, isFuturePeriod]) // eslint-disable-line

  // ------- métricas (cards) -------
  // Regras (tudo respeita o mês selecionado, exceto valores globais como
  // "Saldo total da conta", "Total a receber", "Total a pagar" e os contadores
  // de "Contas vencidas/A vencer"):
  //
  //  • Saldo total da conta  = saldo REAL atual (recebidos + pagos + transfer.).
  //  • Receita total do mês  = receitas recebidas + pendentes do mês.
  //  • Receitas recebidas    = status 'recebido' com paymentDate/dueDate no mês.
  //  • Receitas pendentes    = receitas não recebidas com vencimento no mês.
  //                            (futuro não contamina mês anterior.)
  //  • Despesas do mês       = despesas pagas + despesas pendentes do mês.
  //  • Despesas pagas        = status 'pago' com paymentDate/dueDate no mês.
  //  • Despesas pendentes    = despesas não pagas com vencimento no mês.
  //  • Saldo previsto do mês = receita total do mês - despesas do mês.
  //                            (Resultado/balanço previsto do mês.)
  //  • Total a receber       = todas as receitas pendentes (qualquer mês).
  //  • Total a pagar         = todas as despesas pendentes (qualquer mês).
  //  • Contas vencidas       = entries pendentes com dueDate no passado.
  //  • Contas a vencer (30d) = entries pendentes vencendo nos próximos 30 dias.
  const m = useMemo(() => {
    // IMPORTANTE: usamos `enrichedEntries` (não db.financialEntries) para que
    // entries PROJETADAS de contratos recorrentes apareçam nos cards quando
    // o usuário navega para um mês futuro. Saldo total continua sendo
    // calculado a partir das entries reais (saldo de verdade na conta).
    const all = enrichedEntries
    const inPeriod = (key) => period === 'all' || key === period

    const receitas = all.filter((e) => e.type === 'receita' && e.status !== 'cancelado')
    const despesas = all.filter((e) => e.type === 'despesa' && e.status !== 'cancelado')

    // Recebido = status 'recebido' do período (entries reais — virtuais nunca
    // estão recebidas).
    const receitasRecebidas = receitas
      .filter((e) => e.status === 'recebido' && inPeriod(refMonth(e)))
      .reduce((s, e) => s + e.value, 0)

    // Pendentes = tudo que NÃO está recebido com vencimento no período.
    // Inclui entries projetadas/previstas (status 'previsto' ou 'pendente').
    const receitasPendentes = receitas
      .filter((e) => e.status !== 'recebido' && inPeriod(monthKey(e.dueDate)))
      .reduce((s, e) => s + e.value, 0)

    const despesasPagas = despesas
      .filter((e) => e.status === 'pago' && inPeriod(refMonth(e)))
      .reduce((s, e) => s + e.value, 0)

    const despesasPendentes = despesas
      .filter((e) => e.status !== 'pago' && inPeriod(monthKey(e.dueDate)))
      .reduce((s, e) => s + e.value, 0)

    const receitaTotalMes = receitasRecebidas + receitasPendentes
    const despesasMes = despesasPagas + despesasPendentes

    const saldoTotal = totalRealBalance(db.bankAccounts, db.financialEntries)
    const saldoPrevistoMes = receitaTotalMes - despesasMes

    // Totais globais usam SÓ entries reais (não soma futuros projetados, que
    // seriam infinitos).
    const realReceitas = db.financialEntries.filter(
      (e) => e.type === 'receita' && e.status !== 'cancelado',
    )
    const realDespesas = db.financialEntries.filter(
      (e) => e.type === 'despesa' && e.status !== 'cancelado',
    )
    const totalAReceber = realReceitas
      .filter((e) => e.status !== 'recebido')
      .reduce((s, e) => s + e.value, 0)
    const totalAPagar = realDespesas
      .filter((e) => e.status !== 'pago')
      .reduce((s, e) => s + e.value, 0)

    // Contas vencidas / a vencer (globais, baseadas só em entries REAIS)
    const contasVencidas = db.financialEntries.filter((e) => {
      if (e.type === 'transferencia') return false
      if (e.status === 'recebido' || e.status === 'pago' || e.status === 'cancelado')
        return false
      const dd = daysUntil(e.dueDate)
      return dd !== null && dd < 0
    })
    const contasAVencer = db.financialEntries.filter((e) => {
      if (e.type === 'transferencia') return false
      if (e.status === 'recebido' || e.status === 'pago' || e.status === 'cancelado')
        return false
      const dd = daysUntil(e.dueDate)
      return dd !== null && dd >= 0 && dd <= 30
    })

    return {
      saldoTotal,
      saldoPrevistoMes,
      receitaTotalMes,
      receitasRecebidas,
      receitasPendentes,
      despesasMes,
      despesasPagas,
      despesasPendentes,
      totalAReceber,
      totalAPagar,
      contasVencidasCount: contasVencidas.length,
      contasVencidasValor: contasVencidas.reduce((s, e) => s + e.value, 0),
      contasAVencerCount: contasAVencer.length,
      contasAVencerValor: contasAVencer.reduce((s, e) => s + e.value, 0),
    }
  }, [db.financialEntries, db.bankAccounts, enrichedEntries, period])

  // Mapa de ícones referenciados pelo catálogo (lib/financeiroMetrics.js)
  const FIN_ICONS = {
    Scale,
    TrendingUp,
    ArrowUpCircle,
    ArrowDownCircle,
    Clock,
    Wallet,
    AlertTriangle,
    CalendarClock,
    Hourglass,
  }

  const renderFinMetric = (id) => {
    const def = FIN_METRIC_MAP[id]
    if (!def) return null
    const Icon = FIN_ICONS[def.icon] || Wallet
    const accent = def.dynamicAccent ? def.dynamicAccent(m) : def.accent
    return (
      <StatCard
        key={id}
        icon={Icon}
        label={def.label}
        value={def.compute(m)}
        accent={accent}
      />
    )
  }

  // ------- filtro de tabela -------
  const applyFilters = (list) => {
    const q = text.trim().toLowerCase()
    return list
      .filter((e) => {
        if (period !== 'all' && refMonth(e) !== period) return false
        if (fStatus && effectiveStatus(e) !== fStatus) return false
        if (fClient && e.clientId !== fClient) return false
        if (fCategory && e.category !== fCategory) return false
        if (q && !e.description.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''))
  }

  const receitas = useMemo(
    () => applyFilters(enrichedEntries.filter((e) => e.type === 'receita')),
    [enrichedEntries, period, fStatus, fClient, fCategory, text],
  )
  const despesas = useMemo(
    () => applyFilters(enrichedEntries.filter((e) => e.type === 'despesa')),
    [enrichedEntries, period, fStatus, fClient, fCategory, text],
  )
  const aReceberList = useMemo(
    () =>
      db.financialEntries
        .filter((e) => e.type === 'receita' && e.status === 'pendente')
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    [db.financialEntries],
  )
  const aPagarList = useMemo(
    () =>
      db.financialEntries
        .filter((e) => e.type === 'despesa' && e.status === 'pendente')
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    [db.financialEntries],
  )

  // ------- gráficos -------
  const monthly = useMemo(() => {
    return lastMonths(6).map((key) => ({
      mes: monthLabel(key),
      Receita: db.financialEntries
        .filter((e) => e.type === 'receita' && e.status !== 'cancelado' && refMonth(e) === key)
        .reduce((s, e) => s + e.value, 0),
      Despesa: db.financialEntries
        .filter((e) => e.type === 'despesa' && e.status !== 'cancelado' && refMonth(e) === key)
        .reduce((s, e) => s + e.value, 0),
    }))
  }, [db.financialEntries])

  const byCategory = useMemo(() => {
    const map = {}
    db.financialEntries
      .filter((e) => e.type === 'despesa' && e.status !== 'cancelado')
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.value
      })
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, fill: CAT_COLORS[i % CAT_COLORS.length] }))
      .sort((a, b) => b.value - a.value)
  }, [db.financialEntries])

  // ------- ações -------
  const openNew = (type) => {
    setModalType(type)
    setEditingId(null)
    setModalOpen(true)
  }

  // Materializa uma entry projetada (vinda de contrato recorrente)
  // criando-a fisicamente no DB e retornando o id real.
  const materializeIfProjected = (entry) => {
    if (!entry?.isProjected) return entry.id
    const real = insert('financialEntries', {
      type: entry.type,
      description: entry.description,
      category: entry.category,
      value: entry.value,
      clientId: entry.clientId || '',
      demandId: '',
      proposalId: '',
      accountId: entry.accountId || '',
      dueDate: entry.dueDate,
      paymentDate: '',
      status: 'pendente',
      paymentMethod: entry.paymentMethod || 'PIX',
      isRecurring: true,
      recurringContractId: entry.recurringContractId,
      notes: entry.notes || 'Materializado a partir de receita fixa.',
    })
    toast('Lançamento materializado — agora você pode ajustar')
    return real.id
  }

  const openEdit = (entryOrId) => {
    // Aceita tanto um objeto entry (pra detectar projetado) quanto um id
    let entryObj = null
    if (typeof entryOrId === 'string') {
      entryObj = db.financialEntries.find((e) => e.id === entryOrId) || null
    } else {
      entryObj = entryOrId
    }
    // Se faz parte de um contrato recorrente, pergunta o escopo antes.
    // Entries projetadas (isProjected) ainda não são reais; a materialização e
    // ajuste só fazem sentido como "apenas este mês".
    if (entryObj?.recurringContractId && !entryObj.isProjected) {
      setPendingScope({ action: 'edit', entry: entryObj })
      return
    }
    if (typeof entryOrId === 'string') {
      setEditingId(entryOrId)
    } else {
      const id = materializeIfProjected(entryOrId)
      setEditingId(id)
    }
    setModalOpen(true)
  }
  const settle = (e) => {
    if (e.isProjected) {
      const id = materializeIfProjected(e)
      update('financialEntries', id, {
        status: e.type === 'receita' ? 'recebido' : 'pago',
        paymentDate: todayISO(),
      })
    } else {
      update('financialEntries', e.id, {
        status: e.type === 'receita' ? 'recebido' : 'pago',
        paymentDate: todayISO(),
      })
    }
    toast(e.type === 'receita' ? 'Receita marcada como recebida' : 'Despesa marcada como paga')
  }
  const handleDelete = async (e) => {
    // Entry vinculada a contrato recorrente: pergunta o escopo.
    if (e?.recurringContractId && !e.isProjected) {
      setPendingScope({ action: 'delete', entry: e })
      return
    }
    const ok = await confirm({
      title: 'Excluir lançamento',
      message: `O lançamento "${e.description}" será removido permanentemente. Deseja continuar?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    remove('financialEntries', e.id)
    toast('Lançamento excluído', 'info')
  }

  // ---------- Escopo de recorrência ----------
  // 'single': age só no entry atual (edição → abre modal normal; exclusão → remove).
  // 'all'   : age no contrato + entries vinculadas (edição → abre modal do contrato;
  //           exclusão → remove contrato + todos os entries vinculados).
  const handleScopeChoice = (scope) => {
    const { action, entry } = pendingScope || {}
    if (!entry) {
      setPendingScope(null)
      return
    }

    if (action === 'edit' && scope === 'single') {
      // Edita só o lançamento. Desvincula do contrato para que alterações futuras
      // não sobrescrevam essa parcela específica (e o processRecurring não duplique).
      // Mantemos isRecurring=false para o registro ficar isolado.
      update('financialEntries', entry.id, {
        recurringContractId: '',
        isRecurring: false,
      })
      setEditingId(entry.id)
      setModalOpen(true)
      setPendingScope(null)
      return
    }

    if (action === 'edit' && scope === 'all') {
      // Edita o contrato — propagação dos campos para entries vinculadas
      // acontece no handler de fechamento do RecurringContractModal.
      setEditingContractId(entry.recurringContractId)
      setContractModalOpen(true)
      setPendingScope(null)
      return
    }

    if (action === 'delete' && scope === 'single') {
      remove('financialEntries', entry.id)
      toast('Lançamento removido (somente este mês)', 'info')
      setPendingScope(null)
      return
    }

    if (action === 'delete' && scope === 'all') {
      const contractId = entry.recurringContractId
      // Remove o contrato + todos os entries vinculados (passados e futuros).
      const linked = db.financialEntries.filter((x) => x.recurringContractId === contractId)
      linked.forEach((x) => remove('financialEntries', x.id))
      remove('recurringContracts', contractId)
      toast(`Recorrência removida (${linked.length} lançamento(s))`, 'info')
      setPendingScope(null)
      return
    }
  }

  const exportCSV = () => {
    const list = tab === 'despesas' ? despesas : tab === 'receitas' ? receitas : [...receitas, ...despesas]
    const rows = [
      ['Tipo', 'Descrição', 'Cliente', 'Categoria', 'Vencimento', 'Pagamento', 'Valor', 'Status'],
      ...list.map((e) => [
        e.type === 'receita' ? 'Receita' : 'Despesa',
        e.description,
        clientName(e.clientId),
        e.category,
        formatDate(e.dueDate),
        e.paymentDate ? formatDate(e.paymentDate) : '',
        String(e.value).replace('.', ','),
        FIN_STATUS[effectiveStatus(e)].label,
      ]),
    ]
    downloadCSV(`financeiro-${period}.csv`, rows)
    toast('Relatório CSV exportado')
  }

  const hasFilters = fStatus || fClient || fCategory || text
  const clearFilters = () => {
    setFStatus('')
    setFClient('')
    setFCategory('')
    setText('')
  }

  const TABS = [
    { id: 'visao', label: 'Visão geral' },
    { id: 'receitas', label: 'Receitas' },
    { id: 'despesas', label: 'Despesas' },
    { id: 'fixas', label: 'Receitas fixas' },
    { id: 'contas', label: 'Contas a pagar/receber' },
    { id: 'transferencias', label: 'Transferências' },
    { id: 'bancarias', label: 'Contas bancárias' },
    { id: 'categorias', label: 'Categorias' },
  ]

  const mrr = useMemo(() => mrrSummary(db), [db.recurringContracts]) // eslint-disable-line

  // Transferências (lista completa)
  const transferList = useMemo(
    () =>
      db.financialEntries
        .filter((e) => e.type === 'transferencia')
        .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || '')),
    [db.financialEntries],
  )

  const accountById = (id) => db.bankAccounts.find((a) => a.id === id)
  const accountName = (id) => accountById(id)?.name || '—'

  const handleDeleteAccount = async (acc) => {
    const linked = db.financialEntries.filter(
      (e) => e.accountId === acc.id || e.destAccountId === acc.id,
    ).length
    const ok = await confirm({
      title: 'Excluir conta bancária',
      message: linked
        ? `A conta "${acc.name}" tem ${linked} lançamento(s) vinculado(s). Esses lançamentos ficarão sem conta. Deseja continuar?`
        : `A conta "${acc.name}" será removida permanentemente. Deseja continuar?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    remove('bankAccounts', acc.id)
    toast('Conta excluída', 'info')
  }

  const toggleAccountVisible = (acc) => {
    update('bankAccounts', acc.id, { includeInTotal: !acc.includeInTotal })
    toast(
      acc.includeInTotal
        ? `Saldo de "${acc.name}" oculto do total previsto`
        : `Saldo de "${acc.name}" incluído no total previsto`,
    )
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Receitas, despesas, contas e transferências"
        actions={
          <>
            <button
              className="btn"
              onClick={() => {
                setTransferEditId(null)
                setTransferOpen(true)
              }}
              disabled={db.bankAccounts.length < 2}
              title={
                db.bankAccounts.length < 2
                  ? 'Cadastre 2+ contas bancárias para transferir'
                  : 'Transferência entre contas'
              }
            >
              <ArrowLeftRight size={15} /> Transferência
            </button>
            <button className="btn" onClick={() => openNew('despesa')}>
              <ArrowDownCircle size={15} /> Nova despesa
            </button>
            <button className="btn btn-primary" onClick={() => openNew('receita')}>
              <Plus size={15} /> Nova receita
            </button>
          </>
        }
      />

      <div className="flex items-center justify-end wrap gap-8 mb-12">
        <button
          className="btn btn-sm"
          onClick={() => setCustomizeOpen(true)}
          title="Escolher quais cards aparecem no topo"
        >
          <SlidersHorizontal size={14} /> Personalizar métricas
        </button>
      </div>

      {selectedMetrics.length === 0 ? (
        <div className="muted-box text-sm text-2">
          Nenhuma métrica selecionada. Use <strong>Personalizar métricas</strong> para
          escolher quais cards exibir.
        </div>
      ) : (
        <div className="grid cols-5 stagger">{selectedMetrics.map(renderFinMetric)}</div>
      )}

      <div className="flex gap-6 wrap mt-24 mb-16">
        {TABS.map((t) => (
          <button key={t.id} className={`pill ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'visao' ? (
        <>
          <div className="grid cols-2">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Receitas x Despesas</div>
                  <div className="panel-sub">Últimos 6 meses</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly} margin={{ left: -18, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="fr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00FF85" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#00FF85" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#18211c" vertical={false} />
                  <XAxis dataKey="mes" stroke="#5f6b64" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5f6b64" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Receita" stroke="#00FF85" strokeWidth={2} fill="url(#fr)" />
                  <Area type="monotone" dataKey="Despesa" stroke="#EF4444" strokeWidth={2} fill="url(#fd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Despesas por categoria</div>
                  <div className="panel-sub">Total acumulado</div>
                </div>
              </div>
              {byCategory.length === 0 ? (
                <p className="text-sm text-2">Nenhuma despesa registrada.</p>
              ) : (
                <div className="flex items-center gap-16 wrap">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={3} stroke="none">
                        {byCategory.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    {byCategory.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm" style={{ padding: '3px 0' }}>
                        <span className="flex items-center gap-8">
                          <span className="dot-sm" style={{ background: d.fill }} /> {d.name}
                        </span>
                        <span className="font-bold">{currency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panel mt-24">
            <div className="panel-head">
              <span className="panel-title">Lançamentos recentes</span>
            </div>
            {[...db.financialEntries]
              .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
              .slice(0, 8)
              .map((e) => {
                const st = FIN_STATUS[effectiveStatus(e)]
                return (
                  <div key={e.id} className="list-row">
                    <div
                      className="dot-icon"
                      style={{
                        background: e.type === 'receita' ? 'rgba(0,255,133,0.12)' : 'rgba(239,68,68,0.12)',
                        color: e.type === 'receita' ? '#00FF85' : '#EF4444',
                      }}
                    >
                      {e.type === 'receita' ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-sm font-bold">{e.description}</div>
                      <div className="text-xs text-2">
                        {e.category} • vence {formatDate(e.dueDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: e.type === 'receita' ? '#00FF85' : '#EF4444' }}>
                        {e.type === 'receita' ? '+' : '-'} {currency(e.value)}
                      </div>
                      <Badge label={st.label} color={st.color} />
                    </div>
                  </div>
                )
              })}
          </div>
        </>
      ) : ['receitas', 'despesas', 'contas'].includes(tab) ? (
        <>
          {isFuturePeriod && (
            <div
              className="muted-box mb-16 flex items-center gap-12"
              style={{
                background: 'rgba(167, 139, 250, 0.08)',
                borderColor: 'rgba(167, 139, 250, 0.25)',
              }}
            >
              <Repeat size={18} style={{ color: '#A78BFA' }} />
              <div>
                <div className="font-bold text-sm">Você está vendo um mês futuro</div>
                <div className="text-xs text-2">
                  Lançamentos marcados como <span style={{ color: '#A78BFA' }}>previsto</span> vêm
                  de contratos de receita fixa. Clique em editar para ajustar valor/data — ele
                  será materializado como um lançamento real para este mês.
                </div>
              </div>
            </div>
          )}
          <div className="toolbar">
            <MonthStepper value={period} months={months} onChange={setPeriod} />
            <select className="select" style={{ width: 'auto' }} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {['pendente', 'atrasado', 'recebido', 'pago', 'cancelado'].map((s) => (
                <option key={s} value={s}>
                  {FIN_STATUS[s].label}
                </option>
              ))}
            </select>
            <select className="select" style={{ width: 'auto' }} value={fClient} onChange={(e) => setFClient(e.target.value)}>
              <option value="">Todos os clientes</option>
              {db.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className="select" style={{ width: 'auto' }} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
              <option value="">Todas as categorias</option>
              {Array.from(new Set(getCategories(db).map((c) => c.name)))
                .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
            <div className="search" style={{ maxWidth: 200 }}>
              <Search />
              <input placeholder="Buscar..." value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            {hasFilters && (
              <button className="btn btn-sm btn-ghost" onClick={clearFilters}>
                Limpar
              </button>
            )}
            <div className="spacer" />
            <button className="btn btn-sm" onClick={exportCSV}>
              <FileDown size={14} /> CSV
            </button>
            <button className="btn btn-sm" onClick={exportPDF}>
              <Printer size={14} /> PDF
            </button>
          </div>

          {tab === 'receitas' && (
            <FinTable entries={receitas} clientName={clientName} accountName={accountName} onSettle={settle} onEdit={openEdit} onDelete={handleDelete} emptyText="Nenhuma receita no período." />
          )}
          {tab === 'despesas' && (
            <FinTable entries={despesas} clientName={clientName} accountName={accountName} onSettle={settle} onEdit={openEdit} onDelete={handleDelete} emptyText="Nenhuma despesa no período." />
          )}
          {tab === 'contas' && (
            <div className="grid">
              <div>
                <div className="panel-title mb-16 flex items-center gap-8">
                  <ArrowUpCircle size={16} className="text-neon" /> Contas a receber ({aReceberList.length})
                </div>
                <FinTable entries={aReceberList} clientName={clientName} accountName={accountName} onSettle={settle} onEdit={openEdit} onDelete={handleDelete} emptyText="Nenhuma conta a receber." />
              </div>
              <div className="mt-24">
                <div className="panel-title mb-16 flex items-center gap-8">
                  <ArrowDownCircle size={16} className="text-danger" /> Contas a pagar ({aPagarList.length})
                </div>
                <FinTable entries={aPagarList} clientName={clientName} accountName={accountName} onSettle={settle} onEdit={openEdit} onDelete={handleDelete} emptyText="Nenhuma conta a pagar." />
              </div>
            </div>
          )}
        </>
      ) : tab === 'transferencias' ? (
        <TransferList
          transfers={transferList}
          accountName={accountName}
          onEdit={(id) => {
            setTransferEditId(id)
            setTransferOpen(true)
          }}
          onDelete={handleDelete}
          onNew={() => {
            setTransferEditId(null)
            setTransferOpen(true)
          }}
          canTransfer={db.bankAccounts.length >= 2}
        />
      ) : tab === 'bancarias' ? (
        <BankAccountsTab
          accounts={db.bankAccounts}
          entries={db.financialEntries}
          onNew={() => {
            setEditingAccountId(null)
            setAccountModalOpen(true)
          }}
          onEdit={(id) => {
            setEditingAccountId(id)
            setAccountModalOpen(true)
          }}
          onDelete={handleDeleteAccount}
          onToggle={toggleAccountVisible}
        />
      ) : tab === 'fixas' ? (
        <RecurringContractsTab
          contracts={db.recurringContracts || []}
          entries={db.financialEntries}
          clientNameOf={(id) => db.clients.find((c) => c.id === id)?.name || '—'}
          mrr={mrr}
          onNew={(type) => {
            setEditingContractId(null)
            setContractDefaultType(type)
            setContractModalOpen(true)
          }}
          onEdit={(id) => {
            setEditingContractId(id)
            setContractModalOpen(true)
          }}
          onToggleStatus={async (ct) => {
            const next = ct.status === 'ativo' ? 'pausado' : 'ativo'
            update('recurringContracts', ct.id, { status: next })
            toast(
              next === 'ativo'
                ? `Contrato "${ct.description}" reativado`
                : `Contrato "${ct.description}" pausado`,
            )
          }}
          onEnd={async (ct) => {
            const ok = await confirm({
              title: 'Encerrar contrato',
              message: `Deseja encerrar "${ct.description}"? Os lançamentos já gerados serão mantidos, mas novos não serão criados.`,
              confirmLabel: 'Encerrar',
              danger: true,
            })
            if (!ok) return
            update('recurringContracts', ct.id, { status: 'encerrado', endDate: todayISO() })
            toast('Contrato encerrado', 'info')
          }}
          onDelete={async (ct) => {
            const linked = db.financialEntries.filter((e) => e.recurringContractId === ct.id).length
            const ok = await confirm({
              title: 'Excluir contrato',
              message: linked
                ? `O contrato "${ct.description}" tem ${linked} lançamento(s) gerado(s). Os lançamentos permanecerão, mas o contrato será removido. Continuar?`
                : `O contrato "${ct.description}" será removido. Continuar?`,
              confirmLabel: 'Excluir',
              danger: true,
            })
            if (!ok) return
            remove('recurringContracts', ct.id)
            toast('Contrato excluído', 'info')
          }}
        />
      ) : tab === 'categorias' ? (
        <CategoriesTab
          categories={getCategories(db)}
          entries={db.financialEntries}
          contracts={db.recurringContracts || []}
          onNew={(scope) => {
            setEditingCategoryId(null)
            setCategoryDefaultScope(scope)
            setCategoryModalOpen(true)
          }}
          onEdit={(id) => {
            setEditingCategoryId(id)
            setCategoryModalOpen(true)
          }}
          onToggle={(c) => {
            update('financialCategories', c.id, { active: !c.active })
            toast(
              c.active
                ? `Categoria "${c.name}" desativada`
                : `Categoria "${c.name}" reativada`,
            )
          }}
          onDelete={async (c) => {
            const used =
              db.financialEntries.filter((e) => e.category === c.name).length +
              (db.recurringContracts || []).filter((ct) => ct.category === c.name).length
            const ok = await confirm({
              title: 'Excluir categoria',
              message: used
                ? `A categoria "${c.name}" está em uso em ${used} lançamento(s)/contrato(s). Ao remover, esses registros mantêm o nome como texto, mas a categoria não estará mais disponível nos formulários. Deseja continuar?`
                : `A categoria "${c.name}" será removida. Deseja continuar?`,
              confirmLabel: 'Excluir',
              danger: true,
            })
            if (!ok) return
            remove('financialCategories', c.id)
            toast('Categoria excluída', 'info')
          }}
        />
      ) : null}

      <FinancialModal
        open={modalOpen}
        entryId={editingId}
        defaultType={modalType}
        onClose={() => setModalOpen(false)}
      />
      <TransferModal
        open={transferOpen}
        entryId={transferEditId}
        onClose={() => setTransferOpen(false)}
      />
      <BankAccountModal
        open={accountModalOpen}
        accountId={editingAccountId}
        onClose={() => setAccountModalOpen(false)}
      />
      <RecurringContractModal
        open={contractModalOpen}
        contractId={editingContractId}
        defaultType={contractDefaultType}
        onClose={() => setContractModalOpen(false)}
      />
      <RecurrenceScopeModal
        open={!!pendingScope}
        action={pendingScope?.action || 'edit'}
        onClose={() => setPendingScope(null)}
        onChoose={handleScopeChoice}
      />
      <CategoryModal
        open={categoryModalOpen}
        categoryId={editingCategoryId}
        defaultScope={categoryDefaultScope}
        onClose={() => setCategoryModalOpen(false)}
      />
      <CustomizeMetricsModal
        open={customizeOpen}
        title="Personalizar métricas do Financeiro"
        hint="Marque/desmarque cards, reordene a lista e salve. As métricas mensais respeitam o mês selecionado no filtro. As preferências ficam salvas neste navegador."
        catalog={FIN_METRIC_DEFS}
        groups={FIN_METRIC_GROUPS}
        defaults={DEFAULT_FINANCEIRO_METRICS}
        selected={selectedMetrics}
        onClose={() => setCustomizeOpen(false)}
        onSave={saveMetrics}
      />
    </>
  )
}

function FinTable({ entries, clientName, accountName, onSettle, onEdit, onDelete, emptyText }) {
  const pag = usePaginated(entries, 10)
  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={Wallet} title="Sem lançamentos" text={emptyText} />
      </div>
    )
  }
  return (
    <div className="card">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Cliente</th>
              <th>Conta</th>
              <th>Categoria</th>
              <th>Vencimento</th>
              <th>Pagamento</th>
              <th className="text-right">Valor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pag.paged.map((e) => {
              const st = FIN_STATUS[effectiveStatus(e)]
              const settled = e.status === 'recebido' || e.status === 'pago'
              const isProj = !!e.isProjected
              return (
                <tr
                  key={e.id}
                  className="row-action"
                  onClick={() => onEdit(e)}
                  style={isProj ? { opacity: 0.78, fontStyle: 'italic' } : undefined}
                  title={isProj ? 'Lançamento previsto — clique para ajustar (vai virar real)' : undefined}
                >
                  <td>
                    <div className="font-bold flex items-center gap-6" style={{ fontStyle: 'normal' }}>
                      {e.description}
                      {e.isRecurring && <Repeat size={12} className="text-2" />}
                      {isProj && (
                        <span
                          className="tag"
                          style={{
                            background: 'rgba(167, 139, 250, 0.14)',
                            color: '#A78BFA',
                            borderColor: 'rgba(167, 139, 250, 0.3)',
                            fontSize: 10,
                            padding: '1px 7px',
                          }}
                          title="Receita prevista (não cadastrada ainda — vinda de contrato)"
                        >
                          previsto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-sm text-2">{clientName(e.clientId)}</td>
                  <td className="text-sm text-2">{accountName ? accountName(e.accountId) : '—'}</td>
                  <td>
                    <span className="tag">{e.category}</span>
                  </td>
                  <td className="text-sm">{formatDate(e.dueDate)}</td>
                  <td className="text-sm text-2">{e.paymentDate ? formatDate(e.paymentDate) : '—'}</td>
                  <td className="text-right font-bold" style={{ color: e.type === 'receita' ? '#00FF85' : '#EF4444' }}>
                    {e.type === 'receita' ? '+' : '-'} {currency(e.value)}
                  </td>
                  <td>
                    <Badge label={st.label} color={st.color} />
                  </td>
                  <td onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex gap-6">
                      {!settled && e.status !== 'cancelado' && !isProj && (
                        <button
                          className="btn btn-sm btn-icon"
                          title={e.type === 'receita' ? 'Marcar recebido' : 'Marcar pago'}
                          onClick={() => onSettle(e)}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button className="btn btn-sm btn-icon" title={isProj ? 'Ajustar (vai criar real)' : 'Editar'} onClick={() => onEdit(e)}>
                        <Pencil size={14} />
                      </button>
                      {!isProj && (
                        <button className="btn btn-sm btn-icon" title="Excluir" onClick={() => onDelete(e)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Pagination
          page={pag.page}
          pages={pag.pages}
          from={pag.from}
          to={pag.to}
          total={pag.total}
          pageSize={pag.pageSize}
          onPage={pag.setPage}
          onPageSize={pag.setPageSize}
        />
      </div>
    </div>
  )
}

function TransferList({ transfers, accountName, onEdit, onDelete, onNew, canTransfer }) {
  const pag = usePaginated(transfers, 10)
  return (
    <div className="card">
      <div className="panel-head" style={{ padding: '18px 20px 0' }}>
        <div>
          <span className="panel-title">Transferências entre contas</span>
          <div className="panel-sub">
            {transfers.length} transferência(s). Transferências não entram no cálculo de receitas ou despesas.
          </div>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={onNew}
          disabled={!canTransfer}
          title={canTransfer ? '' : 'Cadastre 2+ contas bancárias'}
        >
          <ArrowLeftRight size={14} /> Nova transferência
        </button>
      </div>
      {transfers.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhuma transferência registrada"
          text={
            canTransfer
              ? 'Use o botão acima para registrar uma transferência entre contas.'
              : 'Cadastre ao menos duas contas bancárias para começar.'
          }
        />
      ) : (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Origem</th>
                <th></th>
                <th>Destino</th>
                <th className="text-right">Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pag.paged.map((t) => (
                <tr key={t.id} className="row-action" onClick={() => onEdit(t.id)}>
                  <td className="text-sm">{formatDate(t.dueDate)}</td>
                  <td className="font-bold">{t.description}</td>
                  <td className="text-sm">{accountName(t.accountId)}</td>
                  <td>
                    <ArrowLeftRight size={14} className="text-2" />
                  </td>
                  <td className="text-sm">{accountName(t.destAccountId)}</td>
                  <td className="text-right font-bold text-neon">{currency(t.value)}</td>
                  <td onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex gap-6">
                      <button className="btn btn-sm btn-icon" title="Editar" onClick={() => onEdit(t.id)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-icon" title="Excluir" onClick={() => onDelete(t)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={pag.page}
            pages={pag.pages}
            from={pag.from}
            to={pag.to}
            total={pag.total}
            pageSize={pag.pageSize}
            onPage={pag.setPage}
            onPageSize={pag.setPageSize}
          />
        </div>
      )}
    </div>
  )
}

function BankAccountsTab({ accounts, entries, onNew, onEdit, onDelete, onToggle }) {
  const included = accounts.filter((a) => a.includeInTotal)
  const totalVisible = included.reduce((s, a) => s + accountBalance(a, entries), 0)
  const totalAll = accounts.reduce((s, a) => s + accountBalance(a, entries), 0)

  return (
    <>
      <div className="grid cols-3">
        <div className="panel">
          <div className="kv-label">Saldo total previsto</div>
          <div className="font-bold text-neon" style={{ fontSize: 24 }}>
            {currency(totalVisible)}
          </div>
          <div className="text-xs text-2 mt-8">
            Soma das contas marcadas para aparecer no saldo.
          </div>
        </div>
        <div className="panel">
          <div className="kv-label">Saldo de todas as contas</div>
          <div className="font-bold" style={{ fontSize: 24 }}>
            {currency(totalAll)}
          </div>
          <div className="text-xs text-2 mt-8">
            Incluindo contas ocultas do saldo previsto.
          </div>
        </div>
        <div className="panel flex items-center justify-between">
          <div>
            <div className="kv-label">Contas cadastradas</div>
            <div className="font-bold" style={{ fontSize: 24 }}>
              {accounts.length}
            </div>
          </div>
          <button className="btn btn-primary" onClick={onNew}>
            <Plus size={15} /> Nova conta
          </button>
        </div>
      </div>

      <div className="grid cols-2 mt-24">
        {accounts.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              icon={Landmark}
              title="Nenhuma conta bancária cadastrada"
              text="Cadastre suas contas para acompanhar saldo e movimentações."
              action={
                <button className="btn btn-primary" onClick={onNew}>
                  <Plus size={15} /> Nova conta
                </button>
              }
            />
          </div>
        )}
        {accounts.map((a) => {
          const saldo = accountBalance(a, entries)
          const typeLabel = ACCOUNT_TYPE_LABEL[a.type] || a.type
          return (
            <div
              key={a.id}
              className="panel"
              style={{ borderLeft: `4px solid ${a.color || '#00FF85'}` }}
            >
              <div className="flex justify-between items-center wrap gap-12">
                <div>
                  <div className="flex items-center gap-8">
                    <Landmark size={16} style={{ color: a.color || 'var(--neon)' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{a.name}</h3>
                  </div>
                  <div className="text-xs text-2">
                    {typeLabel} • {a.bank || '—'} • Ag {a.agency || '—'} • CC {a.accountNumber || '—'}
                  </div>
                </div>
                <button
                  className={`pill ${a.includeInTotal ? 'active' : ''}`}
                  onClick={() => onToggle(a)}
                  title={
                    a.includeInTotal
                      ? 'Clique para ocultar do saldo previsto'
                      : 'Clique para incluir no saldo previsto'
                  }
                >
                  {a.includeInTotal ? <Eye size={13} /> : <EyeOff size={13} />}
                  {a.includeInTotal ? 'No saldo' : 'Oculto'}
                </button>
              </div>

              <div className="divider" />

              <div className="flex justify-between items-end">
                <div>
                  <div className="kv-label">Saldo atual</div>
                  <div
                    className="font-bold"
                    style={{ fontSize: 24, color: saldo >= 0 ? '#00FF85' : '#EF4444' }}
                  >
                    {currency(saldo)}
                  </div>
                  <div className="text-xs text-2">
                    Saldo inicial: {currency(a.initialBalance || 0)}
                  </div>
                </div>
                <div className="flex gap-6">
                  <button
                    className="btn btn-sm btn-icon"
                    title="Editar conta"
                    onClick={() => onEdit(a.id)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn btn-sm btn-icon"
                    title="Excluir conta"
                    onClick={() => onDelete(a)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {a.notes && (
                <p className="text-xs text-2 mt-16">{a.notes}</p>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function RecurringContractsTab({
  contracts,
  entries,
  clientNameOf,
  mrr,
  onNew,
  onEdit,
  onToggleStatus,
  onEnd,
  onDelete,
}) {
  const receitas = contracts.filter((c) => c.type === 'receita')
  const despesas = contracts.filter((c) => c.type === 'despesa')

  const occurrencesOf = (ct) =>
    entries.filter((e) => e.recurringContractId === ct.id).length

  return (
    <>
      <div className="grid cols-3 mb-16 stagger">
        <StatCard
          icon={ArrowUpCircle}
          label="MRR — Receita recorrente"
          value={compactCurrency(mrr.receita)}
          accent="#00FF85"
        />
        <StatCard
          icon={ArrowDownCircle}
          label="Despesa recorrente"
          value={compactCurrency(mrr.despesa)}
          accent="#EF4444"
        />
        <StatCard
          icon={TrendingUp}
          label="Líquido recorrente / mês"
          value={compactCurrency(mrr.liquido)}
          accent={mrr.liquido >= 0 ? '#00FF85' : '#EF4444'}
          trend={{
            dir: 'flat',
            text: `${mrr.contratos} contrato(s) ativo(s)`,
          }}
        />
      </div>

      <div className="card">
        <div className="panel-head" style={{ padding: '18px 20px 0' }}>
          <div>
            <span className="panel-title">Receitas fixas</span>
            <div className="panel-sub">
              {receitas.length} contrato(s). Lançamentos gerados automaticamente todo mês.
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => onNew('receita')}>
            <Plus size={14} /> Nova receita fixa
          </button>
        </div>

        {receitas.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nenhuma receita fixa cadastrada"
            text="Crie contratos de mensalidade para clientes que pagam todo mês. Os lançamentos aparecem automaticamente no Financeiro e nos Relatórios."
          />
        ) : (
          <ContractsTable
            contracts={receitas}
            clientNameOf={clientNameOf}
            occurrencesOf={occurrencesOf}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onEnd={onEnd}
            onDelete={onDelete}
          />
        )}
      </div>

      <div className="card mt-24">
        <div className="panel-head" style={{ padding: '18px 20px 0' }}>
          <div>
            <span className="panel-title">Despesas recorrentes</span>
            <div className="panel-sub">
              {despesas.length} contrato(s). Assinaturas, ferramentas, custos mensais.
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => onNew('despesa')}>
            <Plus size={14} /> Nova despesa recorrente
          </button>
        </div>

        {despesas.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nenhuma despesa recorrente cadastrada"
            text="Cadastre assinaturas, hospedagem e custos que se repetem todo mês para ter visibilidade total no fluxo de caixa."
          />
        ) : (
          <ContractsTable
            contracts={despesas}
            clientNameOf={clientNameOf}
            occurrencesOf={occurrencesOf}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onEnd={onEnd}
            onDelete={onDelete}
          />
        )}
      </div>
    </>
  )
}

function ContractsTable({
  contracts,
  clientNameOf,
  occurrencesOf,
  onEdit,
  onToggleStatus,
  onEnd,
  onDelete,
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Cliente</th>
            <th>Categoria</th>
            <th>Dia</th>
            <th>Início</th>
            <th>Fim</th>
            <th className="text-right">Valor</th>
            <th>Gerados</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((ct) => {
            const st = CONTRACT_STATUS_MAP[ct.status] || CONTRACT_STATUS_MAP.ativo
            const isReceita = ct.type === 'receita'
            const isEncerrado = ct.status === 'encerrado'
            return (
              <tr key={ct.id} className="row-action" onClick={() => onEdit(ct.id)}>
                <td>
                  <div className="font-bold flex items-center gap-6">
                    <Repeat size={12} className="text-2" />
                    {ct.description}
                  </div>
                </td>
                <td className="text-sm text-2">{clientNameOf(ct.clientId) || '—'}</td>
                <td>
                  <span className="tag">{ct.category}</span>
                </td>
                <td className="text-sm text-2">Dia {ct.dayOfMonth}</td>
                <td className="text-sm">{formatDate(ct.startDate)}</td>
                <td className="text-sm text-2">{ct.endDate ? formatDate(ct.endDate) : '—'}</td>
                <td
                  className="text-right font-bold"
                  style={{ color: isReceita ? '#00FF85' : '#EF4444' }}
                >
                  {isReceita ? '+' : '-'} {currency(ct.value)}
                </td>
                <td className="text-sm text-2">{occurrencesOf(ct)}x</td>
                <td>
                  <Badge label={st.label} color={st.color} />
                </td>
                <td onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex gap-6">
                    {!isEncerrado && (
                      <button
                        className="btn btn-sm btn-icon"
                        title={ct.status === 'ativo' ? 'Pausar' : 'Reativar'}
                        onClick={() => onToggleStatus(ct)}
                      >
                        {ct.status === 'ativo' ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-icon"
                      title="Editar"
                      onClick={() => onEdit(ct.id)}
                    >
                      <Pencil size={14} />
                    </button>
                    {!isEncerrado && (
                      <button
                        className="btn btn-sm btn-icon"
                        title="Encerrar contrato"
                        onClick={() => onEnd(ct)}
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-icon"
                      title="Excluir contrato"
                      onClick={() => onDelete(ct)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CategoriesTab({ categories, entries, contracts, onNew, onEdit, onToggle, onDelete }) {
  const usageOf = (name) =>
    entries.filter((e) => e.category === name).length +
    contracts.filter((c) => c.category === name).length

  const receita = categories.filter((c) => c.scope === 'receita')
  const despesa = categories.filter((c) => c.scope === 'despesa')
  const ambos = categories.filter((c) => c.scope === 'ambos')

  return (
    <>
      <div className="grid cols-3 mb-16 stagger">
        <StatCard
          icon={ArrowUpCircle}
          label="Categorias de receita"
          value={receita.length}
          accent="#00FF85"
        />
        <StatCard
          icon={ArrowDownCircle}
          label="Categorias de despesa"
          value={despesa.length}
          accent="#EF4444"
        />
        <StatCard
          icon={Repeat}
          label="Categorias compartilhadas"
          value={ambos.length}
          accent="#A78BFA"
        />
      </div>

      <CategoryGroup
        title="Categorias de receita"
        subtitle={`${receita.length} categoria(s). Aparecem apenas no formulário de receita.`}
        scope="receita"
        items={receita}
        usageOf={usageOf}
        onNew={onNew}
        onEdit={onEdit}
        onToggle={onToggle}
        onDelete={onDelete}
      />

      <CategoryGroup
        title="Categorias de despesa"
        subtitle={`${despesa.length} categoria(s). Aparecem apenas no formulário de despesa.`}
        scope="despesa"
        items={despesa}
        usageOf={usageOf}
        onNew={onNew}
        onEdit={onEdit}
        onToggle={onToggle}
        onDelete={onDelete}
      />

      <CategoryGroup
        title="Categorias compartilhadas"
        subtitle={`${ambos.length} categoria(s). Aparecem nos dois formulários.`}
        scope="ambos"
        items={ambos}
        usageOf={usageOf}
        onNew={onNew}
        onEdit={onEdit}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    </>
  )
}

function CategoryGroup({ title, subtitle, scope, items, usageOf, onNew, onEdit, onToggle, onDelete }) {
  return (
    <div className="card mt-24">
      <div className="panel-head" style={{ padding: '18px 20px 0' }}>
        <div>
          <span className="panel-title">{title}</span>
          <div className="panel-sub">{subtitle}</div>
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => onNew(scope)}>
          <Plus size={14} /> Nova categoria
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhuma categoria neste grupo"
          text="Crie categorias para organizar seus lançamentos. Você pode ativar, editar ou remover a qualquer momento."
        />
      ) : (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Escopo</th>
                <th>Uso</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const usage = usageOf(c.name)
                return (
                  <tr key={c.id} className="row-action" onClick={() => onEdit(c.id)}>
                    <td>
                      <div className="font-bold">{c.name}</div>
                    </td>
                    <td>
                      <span className="tag">
                        {c.scope === 'receita'
                          ? 'Receita'
                          : c.scope === 'despesa'
                            ? 'Despesa'
                            : 'Ambos'}
                      </span>
                    </td>
                    <td className="text-sm text-2">
                      {usage > 0 ? `${usage}x` : '—'}
                    </td>
                    <td>
                      <Badge
                        label={c.active ? 'Ativa' : 'Desativada'}
                        color={c.active ? '#00FF85' : '#A3A3A3'}
                      />
                    </td>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex gap-6">
                        <button
                          className="btn btn-sm btn-icon"
                          title={c.active ? 'Desativar' : 'Reativar'}
                          onClick={() => onToggle(c)}
                        >
                          {c.active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          className="btn btn-sm btn-icon"
                          title="Editar"
                          onClick={() => onEdit(c.id)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-icon"
                          title="Excluir"
                          onClick={() => onDelete(c)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
