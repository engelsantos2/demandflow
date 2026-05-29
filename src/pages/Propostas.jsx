import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  FileText,
  Send,
  CheckCircle2,
  DollarSign,
  Eye,
  Pencil,
  Link2,
  Trash2,
  Mail,
  MessageCircle,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import ProposalWizard from '../components/ProposalWizard'
import Pagination, { usePaginated } from '../components/Pagination'
import { useDB, update, remove } from '../data/store'
import { useUI } from '../components/UIProvider'
import { currency, compactCurrency, formatDate } from '../lib/format'
import { PROPOSAL_STATUS } from '../lib/constants'
import { approveProposal, proposalCode } from '../lib/proposalActions'
import { sendByEmail, sendByWhatsapp } from '../lib/send'

const STATUS_MAP = Object.fromEntries(PROPOSAL_STATUS.map((s) => [s.id, s]))

export default function Propostas() {
  const db = useDB()
  const navigate = useNavigate()
  const { toast, confirm } = useUI()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [text, setText] = useState('')
  const [fStatus, setFStatus] = useState('')

  const clientName = (id) => db.clients.find((c) => c.id === id)?.name || '—'

  const stats = useMemo(() => {
    const enviadas = db.proposals.filter((p) => ['enviada', 'visualizada'].includes(p.status))
    const aprovadas = db.proposals.filter((p) => p.status === 'aprovada')
    return {
      total: db.proposals.length,
      enviadas: enviadas.length,
      aprovadas: aprovadas.length,
      valorAprovado: aprovadas.reduce((s, p) => s + (p.totalValue || 0), 0),
    }
  }, [db.proposals])

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    return db.proposals
      .filter((p) => {
        if (fStatus && p.status !== fStatus) return false
        if (q && !`${p.title} ${proposalCode(p.number)} ${clientName(p.clientId)}`.toLowerCase().includes(q))
          return false
        return true
      })
      .sort((a, b) => (b.number || 0) - (a.number || 0))
  }, [db.proposals, text, fStatus]) // eslint-disable-line

  const pag = usePaginated(filtered, 10)

  const openNew = () => {
    setEditingId(null)
    setModalOpen(true)
  }
  const openEdit = (id) => {
    setEditingId(id)
    setModalOpen(true)
  }

  const changeStatus = async (proposal, status) => {
    if (status === proposal.status) return
    if (status === 'aprovada') {
      const ok = await confirm({
        title: 'Aprovar proposta',
        message:
          'Ao aprovar, o sistema vai criar automaticamente uma demanda e uma receita no financeiro vinculadas a esta proposta. Deseja continuar?',
        confirmLabel: 'Aprovar',
      })
      if (!ok) return
      approveProposal(proposal)
      toast('Proposta aprovada — demanda e receita criadas', 'success')
    } else {
      update('proposals', proposal.id, { status })
      toast('Status da proposta atualizado')
    }
  }

  const sendEmail = (proposal) => {
    const client = db.clients.find((c) => c.id === proposal.clientId)
    sendByEmail(proposal, db.settings, client)
  }
  const sendWhats = (proposal) => {
    const client = db.clients.find((c) => c.id === proposal.clientId)
    sendByWhatsapp(proposal, db.settings, client)
  }

  const copyLink = (proposal) => {
    const url = `${window.location.origin}/proposta/${proposal.publicToken}`
    navigator.clipboard?.writeText(url).then(
      () => toast('Link da proposta copiado'),
      () => toast('Não foi possível copiar o link', 'error'),
    )
  }

  const handleDelete = async (proposal) => {
    const ok = await confirm({
      title: 'Excluir proposta',
      message: `A proposta ${proposalCode(proposal.number)} será removida permanentemente. Deseja continuar?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    db.proposalItems
      .filter((i) => i.proposalId === proposal.id)
      .forEach((i) => remove('proposalItems', i.id))
    remove('proposals', proposal.id)
    toast('Proposta excluída', 'info')
  }

  return (
    <>
      <PageHeader
        title="Propostas comerciais"
        subtitle={`${db.proposals.length} propostas`}
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={15} /> Nova proposta
          </button>
        }
      />

      <div className="grid cols-4">
        <StatCard icon={FileText} label="Total de propostas" value={stats.total} accent="#38BDF8" />
        <StatCard icon={Send} label="Enviadas / em análise" value={stats.enviadas} accent="#A78BFA" />
        <StatCard icon={CheckCircle2} label="Aprovadas" value={stats.aprovadas} accent="#00FF85" />
        <StatCard icon={DollarSign} label="Valor aprovado" value={compactCurrency(stats.valorAprovado)} accent="#FACC15" />
      </div>

      <div className="toolbar mt-24">
        <div className="search" style={{ maxWidth: 300 }}>
          <Search />
          <input
            placeholder="Buscar por título, número ou cliente..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <button className={`pill ${fStatus === '' ? 'active' : ''}`} onClick={() => setFStatus('')}>
          Todas
        </button>
        {PROPOSAL_STATUS.map((s) => (
          <button
            key={s.id}
            className={`pill ${fStatus === s.id ? 'active' : ''}`}
            onClick={() => setFStatus(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma proposta encontrada"
            text={
              db.proposals.length === 0
                ? 'Crie sua primeira proposta comercial.'
                : 'Tente ajustar a busca ou os filtros.'
            }
            action={
              db.proposals.length === 0 && (
                <button className="btn btn-primary" onClick={openNew}>
                  <Plus size={15} /> Nova proposta
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente / Título</th>
                  <th className="text-right">Valor</th>
                  <th>Criação</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pag.paged.map((p) => {
                  const st = STATUS_MAP[p.status]
                  return (
                    <tr key={p.id}>
                      <td className="font-bold">{proposalCode(p.number)}</td>
                      <td>
                        <div className="font-bold">{p.title}</div>
                        <div className="text-xs text-2">{clientName(p.clientId)}</div>
                      </td>
                      <td className="text-right font-bold text-neon">{currency(p.totalValue)}</td>
                      <td className="text-sm">{formatDate(p.createdAt)}</td>
                      <td className="text-sm">{formatDate(p.expirationDate)}</td>
                      <td>
                        <select
                          className="select"
                          style={{
                            width: 'auto',
                            padding: '5px 8px',
                            fontSize: 12,
                            color: st.color,
                            borderColor: st.color + '55',
                          }}
                          value={p.status}
                          onChange={(e) => changeStatus(p, e.target.value)}
                        >
                          {PROPOSAL_STATUS.map((s) => (
                            <option key={s.id} value={s.id} style={{ color: 'var(--text)' }}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="flex gap-6">
                          <button
                            className="btn btn-sm btn-icon"
                            title="Visualizar proposta"
                            onClick={() => navigate(`/proposta/${p.publicToken}`)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-icon"
                            title="Enviar por e-mail"
                            onClick={() => sendEmail(p)}
                          >
                            <Mail size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-icon"
                            title="Enviar por WhatsApp"
                            onClick={() => sendWhats(p)}
                          >
                            <MessageCircle size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-icon"
                            title="Editar"
                            onClick={() => openEdit(p.id)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-icon"
                            title="Copiar link"
                            onClick={() => copyLink(p)}
                          >
                            <Link2 size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-icon"
                            title="Excluir"
                            onClick={() => handleDelete(p)}
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

      <ProposalWizard open={modalOpen} proposalId={editingId} onClose={() => setModalOpen(false)} />
    </>
  )
}
