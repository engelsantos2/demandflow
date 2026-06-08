import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Copy,
  FileDown,
  PauseCircle,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Target,
  Trash2,
  Trophy,
  WalletCards,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'
import FinancialChallengeModal from '../components/FinancialChallengeModal'
import { useDB, insert, remove, update } from '../data/store'
import { useUI } from '../components/UIProvider'
import { currency, formatDate } from '../lib/format'
import { downloadCSV, exportPDF } from '../lib/export'
import { challengeStats } from '../lib/financialChallenges'

const STATUS = {
  andamento: { label: 'Em andamento', color: '#38BDF8' },
  concluido: { label: 'Concluído', color: '#00FF85' },
  pausado: { label: 'Pausado', color: '#FACC15' },
}

const TYPE_LABEL = {
  crescente: 'Crescente',
  decrescente: 'Decrescente',
  espelhado: 'Espelhado',
  personalizado: 'Personalizado',
}

const FREQUENCY_LABEL = {
  diario: 'Diário',
  semanal: 'Semanal',
  livre: 'Livre',
}

export default function Desafios() {
  const db = useDB()
  const { toast, confirm } = useUI()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')

  const challenges = db.financialChallenges || []

  useEffect(() => {
    if (!selectedId && challenges.length) setSelectedId(challenges[0].id)
    if (selectedId && challenges.length && !challenges.some((item) => item.id === selectedId)) {
      setSelectedId(challenges[0]?.id || '')
    }
  }, [selectedId, challenges])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return challenges
    return challenges.filter((item) =>
      `${item.title} ${item.generationType} ${item.frequency}`.toLowerCase().includes(q),
    )
  }, [challenges, query])

  const selected = challenges.find((item) => item.id === selectedId) || filtered[0] || null
  const selectedStats = challengeStats(selected)

  const totals = useMemo(() => {
    return challenges.reduce(
      (acc, item) => {
        const stats = challengeStats(item)
        acc.goal += stats.goal
        acc.deposited += stats.deposited
        if (stats.status === 'concluido') acc.done += 1
        if (stats.status === 'pausado') acc.paused += 1
        return acc
      },
      { goal: 0, deposited: 0, done: 0, paused: 0 },
    )
  }, [challenges])

  const openNew = () => {
    setEditingId(null)
    setModalOpen(true)
  }

  const openEdit = (challenge) => {
    setEditingId(challenge.id)
    setModalOpen(true)
  }

  const toggleDeposit = (challenge, depositId) => {
    const nextDeposits = (challenge.deposits || []).map((deposit) => {
      if (deposit.id !== depositId) return deposit
      const paid = !deposit.paid
      return {
        ...deposit,
        paid,
        paidAt: paid ? new Date().toISOString() : null,
      }
    })
    const nextStats = challengeStats({ ...challenge, deposits: nextDeposits })
    update('financialChallenges', challenge.id, {
      deposits: nextDeposits,
      status: challenge.status === 'pausado' ? 'pausado' : nextStats.status,
      updatedAt: new Date().toISOString(),
    })
    if (nextStats.percentage >= 100 && selectedStats.percentage < 100) {
      toast(`Parabéns! Você concluiu seu desafio e atingiu sua meta de ${currency(nextStats.goal)}.`)
    }
  }

  const resetProgress = async (challenge) => {
    const ok = await confirm({
      title: 'Resetar progresso',
      message: `Todos os depósitos marcados em "${challenge.title}" serão desmarcados. Deseja continuar?`,
      confirmLabel: 'Resetar',
      danger: true,
    })
    if (!ok) return
    update('financialChallenges', challenge.id, {
      deposits: (challenge.deposits || []).map((deposit) => ({
        ...deposit,
        paid: false,
        paidAt: null,
      })),
      status: 'andamento',
      updatedAt: new Date().toISOString(),
    })
    toast('Progresso resetado', 'info')
  }

  const deleteChallenge = async (challenge) => {
    const ok = await confirm({
      title: 'Excluir desafio',
      message: `O desafio "${challenge.title}" será removido permanentemente.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    remove('financialChallenges', challenge.id)
    toast('Desafio excluído', 'info')
  }

  const duplicateChallenge = (challenge) => {
    const copy = {
      ...challenge,
      title: `${challenge.title} (cópia)`,
      deposits: (challenge.deposits || []).map((deposit, index) => ({
        ...deposit,
        id: `dep_${index + 1}_${Math.random().toString(36).slice(2, 8)}`,
        paid: false,
        paidAt: null,
      })),
      status: 'andamento',
      updatedAt: new Date().toISOString(),
    }
    delete copy.id
    delete copy.createdAt
    insert('financialChallenges', copy)
    toast('Desafio duplicado com progresso zerado')
  }

  const exportChallenge = (challenge) => {
    const stats = challengeStats(challenge)
    downloadCSV(`desafio-${challenge.title}.csv`, [
      ['Desafio', challenge.title],
      ['Meta', stats.goal],
      ['Depositado', stats.deposited],
      ['Restante', stats.remaining],
      [],
      ['#', 'Valor', 'Status', 'Pago em'],
      ...(challenge.deposits || []).map((deposit, index) => [
        index + 1,
        deposit.amount,
        deposit.paid ? 'Pago' : 'Pendente',
        deposit.paidAt ? formatDate(deposit.paidAt) : '',
      ]),
    ])
  }

  return (
    <>
      <PageHeader
        title="Desafios financeiros"
        subtitle="Crie tabelas de economia, marque depósitos e acompanhe sua meta."
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={15} /> Novo desafio
          </button>
        }
      />

      <div className="grid cols-4 no-print">
        <StatCard icon={Trophy} label="Desafios criados" value={challenges.length} accent="#00FF85" />
        <StatCard icon={Target} label="Meta total" value={currency(totals.goal)} accent="#38BDF8" />
        <StatCard icon={WalletCards} label="Já depositado" value={currency(totals.deposited)} accent="#FACC15" />
        <StatCard icon={CheckCircle2} label="Concluídos" value={totals.done} accent="#A78BFA" />
      </div>

      {challenges.length === 0 ? (
        <div className="card mt-24">
          <EmptyState
            icon={Trophy}
            title="Nenhum desafio financeiro criado"
            text="Crie sua primeira tabela de depósitos para acompanhar uma meta de economia."
            action={
              <button className="btn btn-primary" onClick={openNew}>
                <Plus size={15} /> Criar desafio
              </button>
            }
          />
        </div>
      ) : (
        <div className="challenge-layout mt-24">
          <aside className="panel challenge-sidebar no-print">
            <div className="panel-head">
              <div>
                <div className="panel-title">Minhas tabelas</div>
                <div className="panel-sub">{filtered.length} desafio(s)</div>
              </div>
            </div>
            <div className="search challenge-search">
              <Search />
              <input
                placeholder="Buscar desafio..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="challenge-list">
              {filtered.map((challenge) => {
                const stats = challengeStats(challenge)
                const st = STATUS[stats.status] || STATUS.andamento
                return (
                  <button
                    key={challenge.id}
                    className={`challenge-list-item ${selected?.id === challenge.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(challenge.id)}
                  >
                    <span className="challenge-list-title">{challenge.title}</span>
                    <span className="challenge-list-meta">
                      {currency(stats.deposited)} de {currency(stats.goal)}
                    </span>
                    <span className="progress">
                      <span className="progress-fill" style={{ width: `${stats.percentage}%` }} />
                    </span>
                    <span className="challenge-list-footer">
                      <span>{stats.percentage}%</span>
                      <span style={{ color: st.color }}>{st.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          {selected && (
            <section className="challenge-detail">
              <div className="panel challenge-hero">
                <div className="challenge-hero-main">
                  <div className="flex gap-8 wrap items-center">
                    <h2>{selected.title}</h2>
                    <Badge
                      label={(STATUS[selectedStats.status] || STATUS.andamento).label}
                      color={(STATUS[selectedStats.status] || STATUS.andamento).color}
                    />
                  </div>
                  <div className="challenge-hero-meta">
                    <span>{TYPE_LABEL[selected.generationType] || 'Crescente'}</span>
                    <span>{FREQUENCY_LABEL[selected.frequency] || 'Livre'}</span>
                    {selected.startDate && <span>Início {formatDate(selected.startDate)}</span>}
                    {selected.endDate && <span>Final {formatDate(selected.endDate)}</span>}
                  </div>
                  <div className="progress challenge-main-progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${selectedStats.percentage}%` }}
                    />
                  </div>
                  <div className="challenge-percent">{selectedStats.percentage}% concluído</div>
                </div>
                <div className="challenge-actions no-print">
                  <button className="btn btn-sm" onClick={() => openEdit(selected)}>
                    <Pencil size={14} /> Editar
                  </button>
                  <button className="btn btn-sm" onClick={() => duplicateChallenge(selected)}>
                    <Copy size={14} /> Duplicar
                  </button>
                  <button className="btn btn-sm" onClick={() => resetProgress(selected)}>
                    <RefreshCcw size={14} /> Resetar
                  </button>
                  <button className="btn btn-sm" onClick={() => exportChallenge(selected)}>
                    <FileDown size={14} /> CSV
                  </button>
                  <button className="btn btn-sm" onClick={exportPDF}>
                    <Printer size={14} /> Imprimir
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteChallenge(selected)}>
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>

              <div className="challenge-summary-grid">
                <div className="panel challenge-summary">
                  <span>Meta final</span>
                  <strong>{currency(selectedStats.goal)}</strong>
                </div>
                <div className="panel challenge-summary">
                  <span>Total depositado</span>
                  <strong className="text-neon">{currency(selectedStats.deposited)}</strong>
                </div>
                <div className="panel challenge-summary">
                  <span>Total restante</span>
                  <strong>{currency(selectedStats.remaining)}</strong>
                </div>
                <div className="panel challenge-summary">
                  <span>Depósitos concluídos</span>
                  <strong>
                    {selectedStats.completed}/{selected.deposits?.length || 0}
                  </strong>
                </div>
                <div className="panel challenge-summary">
                  <span>Pendentes</span>
                  <strong>{selectedStats.pending}</strong>
                </div>
              </div>

              {selectedStats.status === 'concluido' && (
                <div className="panel challenge-complete">
                  <Trophy size={22} />
                  <div>
                    <strong>Parabéns! Você concluiu seu desafio.</strong>
                    <p>Meta atingida: {currency(selectedStats.goal)}.</p>
                  </div>
                </div>
              )}

              {selected.status === 'pausado' && selectedStats.status !== 'concluido' && (
                <div className="panel challenge-paused">
                  <PauseCircle size={20} />
                  <span>Este desafio está pausado. Você ainda pode marcar depósitos manualmente.</span>
                </div>
              )}

              <div className="panel challenge-table-panel">
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Tabela de depósitos</div>
                    <div className="panel-sub">
                      Clique em uma célula para marcar ou desmarcar como depositada.
                    </div>
                  </div>
                </div>
                <div className="challenge-grid">
                  {(selected.deposits || []).map((deposit) => (
                    <button
                      key={deposit.id}
                      className={`challenge-cell ${deposit.paid ? 'paid' : ''}`}
                      onClick={() => toggleDeposit(selected, deposit.id)}
                      title={deposit.paid ? `Pago em ${formatDate(deposit.paidAt)}` : 'Pendente'}
                    >
                      {deposit.paid && <CheckCircle2 size={14} />}
                      <span>{currency(deposit.amount)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      <FinancialChallengeModal
        open={modalOpen}
        challengeId={editingId}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
