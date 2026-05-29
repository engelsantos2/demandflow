import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  FileText as FileIcon,
  KanbanSquare,
  Wallet,
  ArrowUpCircle,
  CalendarDays,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import ClientModal from '../components/ClientModal'
import { useDB, remove } from '../data/store'
import { useUI } from '../components/UIProvider'
import { currency, compactCurrency, formatDate } from '../lib/format'
import {
  CLIENT_STATUS,
  KANBAN_COLUMNS,
  STATUS_LABEL,
  PROPOSAL_STATUS,
} from '../lib/constants'

const CLIENT_STATUS_MAP = Object.fromEntries(CLIENT_STATUS.map((s) => [s.id, s]))
const COL_MAP = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, c]))
const PROP_MAP = Object.fromEntries(PROPOSAL_STATUS.map((s) => [s.id, s]))
const FIN_COLOR = {
  pendente: '#facc15',
  recebido: '#00ff85',
  pago: '#00ff85',
  atrasado: '#ef4444',
  cancelado: '#a3a3a3',
}

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const db = useDB()
  const { toast, confirm } = useUI()
  const [editOpen, setEditOpen] = useState(false)

  const client = db.clients.find((c) => c.id === id)

  const data = useMemo(() => {
    if (!client) return null
    const demands = db.demands.filter((d) => d.clientId === id)
    const proposals = db.proposals.filter((p) => p.clientId === id)
    const entries = db.financialEntries.filter((e) => e.clientId === id)
    const aReceber = entries
      .filter((e) => e.type === 'receita' && e.status === 'pendente')
      .reduce((s, e) => s + e.value, 0)
    const recebido = entries
      .filter((e) => e.type === 'receita' && e.status === 'recebido')
      .reduce((s, e) => s + e.value, 0)
    return { demands, proposals, entries, aReceber, recebido }
  }, [client, db, id])

  if (!client) {
    return (
      <>
        <PageHeader title="Cliente não encontrado" />
        <div className="panel">
          <EmptyState
            title="Esse cliente não existe"
            text="Ele pode ter sido removido."
            action={
              <Link to="/clientes" className="btn btn-primary">
                <ArrowLeft size={15} /> Voltar para Clientes
              </Link>
            }
          />
        </div>
      </>
    )
  }

  const st = CLIENT_STATUS_MAP[client.status]

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Excluir cliente',
      message: `O cliente "${client.name}" será removido permanentemente. Deseja continuar?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    remove('clients', client.id)
    toast('Cliente excluído', 'info')
    navigate('/clientes')
  }

  return (
    <>
      <Link to="/clientes" className="btn btn-sm btn-ghost mb-16" style={{ width: 'fit-content' }}>
        <ArrowLeft size={14} /> Voltar para Clientes
      </Link>

      <div className="panel">
        <div className="flex justify-between items-center wrap gap-16">
          <div className="avatar-row">
            <Avatar name={client.name} size={56} />
            <div>
              <div className="flex items-center gap-8 wrap">
                <h1 className="page-title" style={{ fontSize: 20 }}>
                  {client.name}
                </h1>
                <Badge label={st.label} color={st.color} />
              </div>
              <div className="text-sm text-2">
                {client.responsibleName || 'Sem responsável definido'}
              </div>
            </div>
          </div>
          <div className="flex gap-8">
            <button className="btn" onClick={() => setEditOpen(true)}>
              <Pencil size={15} /> Editar
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={15} /> Excluir
            </button>
          </div>
        </div>

        <div className="divider" />

        <div className="grid cols-4">
          <div className="kv">
            <span className="kv-label">E-mail</span>
            <span className="kv-value flex items-center gap-6">
              <Mail size={13} className="text-2" /> {client.email || '—'}
            </span>
          </div>
          <div className="kv">
            <span className="kv-label">Telefone / WhatsApp</span>
            <span className="kv-value flex items-center gap-6">
              <Phone size={13} className="text-2" /> {client.whatsapp || client.phone || '—'}
            </span>
          </div>
          <div className="kv">
            <span className="kv-label">Documento</span>
            <span className="kv-value">{client.document || '—'}</span>
          </div>
          <div className="kv">
            <span className="kv-label">Localização</span>
            <span className="kv-value flex items-center gap-6">
              <MapPin size={13} className="text-2" />
              {client.city ? `${client.city}${client.state ? ' / ' + client.state : ''}` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid cols-4 mt-24">
        <StatCard
          icon={KanbanSquare}
          label="Demandas vinculadas"
          value={data.demands.length}
          accent="#38BDF8"
        />
        <StatCard
          icon={FileIcon}
          label="Propostas enviadas"
          value={data.proposals.length}
          accent="#A78BFA"
        />
        <StatCard
          icon={Wallet}
          label="Total a receber"
          value={compactCurrency(data.aReceber)}
          accent="#FACC15"
        />
        <StatCard
          icon={ArrowUpCircle}
          label="Total recebido"
          value={compactCurrency(data.recebido)}
          accent="#00FF85"
        />
      </div>

      <div className="grid cols-2 mt-24">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Demandas vinculadas</span>
            <span className="panel-sub">{data.demands.length} no total</span>
          </div>
          {data.demands.length === 0 ? (
            <p className="text-sm text-2">Nenhuma demanda para este cliente.</p>
          ) : (
            data.demands.map((d) => {
              const col = COL_MAP[d.status]
              return (
                <div
                  key={d.id}
                  className="list-row row-action"
                  onClick={() => navigate(`/demandas?d=${d.id}`)}
                >
                  <span className="dot-sm" style={{ background: col.accent, width: 8, height: 8 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm font-bold">{d.title}</div>
                    <div className="text-xs text-2 flex items-center gap-6">
                      <CalendarDays size={11} /> {formatDate(d.dueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-neon">{currency(d.value)}</div>
                    <Badge label={STATUS_LABEL[d.status]} color={col.accent} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="grid">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Propostas</span>
              <span className="panel-sub">{data.proposals.length} no total</span>
            </div>
            {data.proposals.length === 0 ? (
              <p className="text-sm text-2">Nenhuma proposta para este cliente.</p>
            ) : (
              data.proposals.map((p) => {
                const ps = PROP_MAP[p.status]
                return (
                  <div key={p.id} className="list-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-sm font-bold">
                        #{String(p.number).padStart(3, '0')} — {p.title}
                      </div>
                      <div className="text-xs text-2">
                        Validade {formatDate(p.expirationDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{currency(p.totalValue)}</div>
                      <Badge label={ps.label} color={ps.color} />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Histórico financeiro</span>
              <span className="panel-sub">{data.entries.length} lançamento(s)</span>
            </div>
            {data.entries.length === 0 ? (
              <p className="text-sm text-2">Nenhum lançamento financeiro.</p>
            ) : (
              data.entries.map((e) => (
                <div key={e.id} className="list-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm">{e.description}</div>
                    <div className="text-xs text-2">Vence {formatDate(e.dueDate)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{currency(e.value)}</div>
                    <Badge
                      label={e.status[0].toUpperCase() + e.status.slice(1)}
                      color={FIN_COLOR[e.status] || '#a3a3a3'}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel mt-24">
        <div className="panel-head">
          <span className="panel-title">Observações internas</span>
        </div>
        <p className="text-sm text-2">
          {client.notes || 'Nenhuma observação registrada para este cliente.'}
        </p>
      </div>

      <ClientModal open={editOpen} clientId={client.id} onClose={() => setEditOpen(false)} />
    </>
  )
}
