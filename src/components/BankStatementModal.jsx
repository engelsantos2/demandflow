import { useMemo, useState } from 'react'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Landmark,
  FileDown,
  Search,
  Calendar,
} from 'lucide-react'
import Modal from './Modal'
import Badge from './Badge'
import EmptyState from './EmptyState'
import { useDB } from '../data/store'
import { currency, formatDate, monthKey, todayISO } from '../lib/format'
import { downloadCSV } from '../lib/export'
import { FIN_STATUS } from '../lib/constants'

/**
 * Modal de extrato bancário detalhado por conta.
 *
 * Mostra TODAS as movimentações que afetam o saldo dessa conta:
 *  • Receitas recebidas (entrada)
 *  • Despesas pagas (saída)
 *  • Transferências de entrada (destAccountId === conta)
 *  • Transferências de saída (accountId === conta + type transferencia)
 *
 * Cada linha tem data, descrição, contraparte, valor com sinal e saldo
 * progressivo. Saldo final do extrato bate com o saldo real da conta.
 *
 * Filtros: tipo (todas/entradas/saídas/transferências), mês, busca.
 *
 * Props:
 *  - open: boolean
 *  - accountId: id da conta
 *  - onClose: () => void
 */
export default function BankStatementModal({ open, accountId, onClose }) {
  const db = useDB()
  const [typeFilter, setTypeFilter] = useState('all') // all | in | out | transfer
  const [periodFilter, setPeriodFilter] = useState('all') // all | YYYY-MM
  const [text, setText] = useState('')

  const account = useMemo(
    () => db.bankAccounts.find((a) => a.id === accountId),
    [db.bankAccounts, accountId],
  )
  const accountName = (id) => db.bankAccounts.find((a) => a.id === id)?.name || '—'
  const clientName = (id) => db.clients.find((c) => c.id === id)?.name || ''

  // Coleta TODAS as movimentações que afetam essa conta, com sinal.
  // Para cada entry retorna: { id, date, kind, description, amount, signed, status, counterpart, original }
  // kind: 'receita' | 'despesa' | 'transfer_in' | 'transfer_out'
  const movements = useMemo(() => {
    if (!account) return []
    const out = []
    for (const e of db.financialEntries) {
      if (e.status === 'cancelado') continue
      const baseDate = e.paymentDate || e.dueDate
      if (e.type === 'receita' && e.accountId === account.id && e.status === 'recebido') {
        out.push({
          id: e.id,
          date: baseDate,
          kind: 'receita',
          description: e.description,
          amount: Number(e.value) || 0,
          signed: +Number(e.value) || 0,
          status: e.status,
          counterpart: clientName(e.clientId),
          original: e,
        })
      } else if (e.type === 'despesa' && e.accountId === account.id && e.status === 'pago') {
        out.push({
          id: e.id,
          date: baseDate,
          kind: 'despesa',
          description: e.description,
          amount: Number(e.value) || 0,
          signed: -(Number(e.value) || 0),
          status: e.status,
          counterpart: clientName(e.clientId),
          original: e,
        })
      } else if (e.type === 'transferencia') {
        if (e.destAccountId === account.id) {
          out.push({
            id: e.id + '_in',
            date: baseDate,
            kind: 'transfer_in',
            description: e.description || 'Transferência recebida',
            amount: Number(e.value) || 0,
            signed: +Number(e.value) || 0,
            status: 'pago',
            counterpart: 'de ' + accountName(e.accountId),
            original: e,
          })
        }
        if (e.accountId === account.id) {
          out.push({
            id: e.id + '_out',
            date: baseDate,
            kind: 'transfer_out',
            description: e.description || 'Transferência enviada',
            amount: Number(e.value) || 0,
            signed: -(Number(e.value) || 0),
            status: 'pago',
            counterpart: 'para ' + accountName(e.destAccountId),
            original: e,
          })
        }
      }
    }
    // Ordena por data DECRESCENTE (mais recente primeiro)
    return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [account, db.financialEntries, db.bankAccounts, db.clients])

  // Aplica filtros de UI
  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    return movements.filter((m) => {
      if (typeFilter === 'in' && !(m.kind === 'receita' || m.kind === 'transfer_in')) return false
      if (typeFilter === 'out' && !(m.kind === 'despesa' || m.kind === 'transfer_out')) return false
      if (typeFilter === 'transfer' && !(m.kind === 'transfer_in' || m.kind === 'transfer_out')) return false
      if (periodFilter !== 'all' && monthKey(m.date) !== periodFilter) return false
      if (q && !m.description.toLowerCase().includes(q) && !m.counterpart.toLowerCase().includes(q)) return false
      return true
    })
  }, [movements, typeFilter, periodFilter, text])

  // Saldo progressivo: começa do saldo inicial e soma cronologicamente.
  // Para mostrar saldo após cada movimento, calculamos a soma cumulativa
  // a partir do início. Iteramos em ordem ASC, depois invertemos pra exibir
  // do mais recente pro mais antigo.
  const withRunning = useMemo(() => {
    const initial = Number(account?.initialBalance) || 0
    // Ordena ASC (cronológico)
    const asc = [...filtered].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    let running = initial
    // Se há filtros aplicados, o saldo "inicial" desse extrato filtrado é o
    // saldo da conta antes do primeiro movimento exibido — não dá pra calcular
    // sem reprocessar tudo. Pra simplicidade, mostramos saldo progressivo só
    // quando NÃO há filtros (extrato completo). Com filtros, oculta a coluna.
    return asc
      .map((m) => {
        running += m.signed
        return { ...m, running }
      })
      .reverse()
  }, [filtered, account])

  const showRunning = typeFilter === 'all' && periodFilter === 'all' && !text.trim()

  // Totais dos movimentos exibidos
  const totals = useMemo(() => {
    let entradas = 0
    let saidas = 0
    for (const m of filtered) {
      if (m.signed > 0) entradas += m.signed
      else saidas += Math.abs(m.signed)
    }
    return { entradas, saidas, liquido: entradas - saidas }
  }, [filtered])

  const months = useMemo(() => {
    const set = new Set()
    for (const m of movements) {
      if (m.date) set.add(monthKey(m.date))
    }
    return Array.from(set).sort().reverse()
  }, [movements])

  // Saldo atual real da conta (igual ao do card principal)
  const saldoAtual = useMemo(() => {
    if (!account) return 0
    let total = Number(account.initialBalance) || 0
    for (const e of db.financialEntries) {
      if (e.status === 'cancelado') continue
      if (e.type === 'receita' && e.accountId === account.id && e.status === 'recebido')
        total += Number(e.value) || 0
      else if (e.type === 'despesa' && e.accountId === account.id && e.status === 'pago')
        total -= Number(e.value) || 0
      else if (e.type === 'transferencia') {
        if (e.destAccountId === account.id) total += Number(e.value) || 0
        if (e.accountId === account.id) total -= Number(e.value) || 0
      }
    }
    return total
  }, [account, db.financialEntries])

  const exportCSV = () => {
    if (!account) return
    const rows = [
      ['Data', 'Tipo', 'Descrição', 'Contraparte', 'Valor', 'Status'],
      ...filtered.map((m) => [
        formatDate(m.date),
        kindLabel(m.kind),
        m.description,
        m.counterpart || '',
        (m.signed >= 0 ? '+' : '-') + String(Math.abs(m.signed)).replace('.', ','),
        FIN_STATUS[m.status]?.label || m.status,
      ]),
    ]
    downloadCSV(`extrato-${account.name}-${todayISO()}.csv`, rows)
  }

  if (!account) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-center gap-8">
          <Landmark size={16} style={{ color: account.color || 'var(--neon)' }} />
          Extrato — {account.name}
        </span>
      }
      footer={
        <>
          <button className="btn" onClick={exportCSV} disabled={filtered.length === 0}>
            <FileDown size={14} /> Exportar CSV
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </>
      }
    >
      <div className="grid cols-3">
        <div className="muted-box">
          <div className="kv-label">Saldo atual</div>
          <div
            className="font-bold"
            style={{ fontSize: 22, color: saldoAtual >= 0 ? '#00FF85' : '#EF4444' }}
          >
            {currency(saldoAtual)}
          </div>
          <div className="text-xs text-2 mt-4">
            Inicial: {currency(account.initialBalance || 0)}
          </div>
        </div>
        <div className="muted-box">
          <div className="kv-label">Entradas</div>
          <div className="font-bold text-neon" style={{ fontSize: 22 }}>
            +{currency(totals.entradas)}
          </div>
          <div className="text-xs text-2 mt-4">no filtro atual</div>
        </div>
        <div className="muted-box">
          <div className="kv-label">Saídas</div>
          <div className="font-bold" style={{ fontSize: 22, color: '#EF4444' }}>
            -{currency(totals.saidas)}
          </div>
          <div className="text-xs text-2 mt-4">no filtro atual</div>
        </div>
      </div>

      <div className="toolbar mt-16">
        <div className="flex gap-6 wrap">
          <button
            className={`pill ${typeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            Tudo
          </button>
          <button
            className={`pill ${typeFilter === 'in' ? 'active' : ''}`}
            onClick={() => setTypeFilter('in')}
          >
            <ArrowUpCircle size={13} /> Entradas
          </button>
          <button
            className={`pill ${typeFilter === 'out' ? 'active' : ''}`}
            onClick={() => setTypeFilter('out')}
          >
            <ArrowDownCircle size={13} /> Saídas
          </button>
          <button
            className={`pill ${typeFilter === 'transfer' ? 'active' : ''}`}
            onClick={() => setTypeFilter('transfer')}
          >
            <ArrowLeftRight size={13} /> Transferências
          </button>
        </div>
        <div className="spacer" />
        <select
          className="select"
          style={{ width: 'auto' }}
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
        >
          <option value="all">Todos os meses</option>
          {months.map((mk) => (
            <option key={mk} value={mk}>
              {mk}
            </option>
          ))}
        </select>
        <div className="search" style={{ maxWidth: 200 }}>
          <Search />
          <input
            placeholder="Buscar..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>

      {withRunning.length === 0 ? (
        <div className="card mt-16">
          <EmptyState
            icon={Calendar}
            title="Sem movimentações"
            text="Nada para mostrar com os filtros selecionados."
          />
        </div>
      ) : (
        <div className="table-wrap mt-16">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Data</th>
                <th>Descrição</th>
                <th>Contraparte</th>
                <th>Tipo</th>
                <th className="text-right">Valor</th>
                {showRunning && <th className="text-right">Saldo</th>}
              </tr>
            </thead>
            <tbody>
              {withRunning.map((m) => {
                const isIn = m.signed > 0
                return (
                  <tr key={m.id}>
                    <td className="text-sm">{formatDate(m.date)}</td>
                    <td>
                      <div className="font-bold flex items-center gap-6">
                        {kindIcon(m.kind)}
                        {m.description}
                      </div>
                    </td>
                    <td className="text-sm text-2">{m.counterpart || '—'}</td>
                    <td>
                      <Badge label={kindLabel(m.kind)} color={kindColor(m.kind)} />
                    </td>
                    <td
                      className="text-right font-bold"
                      style={{ color: isIn ? '#00FF85' : '#EF4444' }}
                    >
                      {isIn ? '+' : '-'} {currency(Math.abs(m.signed))}
                    </td>
                    {showRunning && (
                      <td
                        className="text-right text-sm"
                        style={{ color: m.running >= 0 ? 'var(--text)' : '#EF4444' }}
                      >
                        {currency(m.running)}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

function kindLabel(kind) {
  switch (kind) {
    case 'receita':
      return 'Receita'
    case 'despesa':
      return 'Despesa'
    case 'transfer_in':
      return 'Transf. entrada'
    case 'transfer_out':
      return 'Transf. saída'
    default:
      return kind
  }
}

function kindColor(kind) {
  switch (kind) {
    case 'receita':
      return '#00FF85'
    case 'despesa':
      return '#EF4444'
    case 'transfer_in':
      return '#38BDF8'
    case 'transfer_out':
      return '#FB923C'
    default:
      return '#A3A3A3'
  }
}

function kindIcon(kind) {
  const size = 13
  switch (kind) {
    case 'receita':
      return <ArrowUpCircle size={size} style={{ color: '#00FF85' }} />
    case 'despesa':
      return <ArrowDownCircle size={size} style={{ color: '#EF4444' }} />
    case 'transfer_in':
      return <ArrowLeftRight size={size} style={{ color: '#38BDF8' }} />
    case 'transfer_out':
      return <ArrowLeftRight size={size} style={{ color: '#FB923C' }} />
    default:
      return null
  }
}
