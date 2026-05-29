import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Users,
  UserCheck,
  Sparkles,
  UserX,
  Pencil,
  Trash2,
  ChevronRight,
  Mail,
  Phone,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import ClientModal from '../components/ClientModal'
import Pagination, { usePaginated } from '../components/Pagination'
import { useDB, remove } from '../data/store'
import { useUI } from '../components/UIProvider'
import { CLIENT_STATUS } from '../lib/constants'

const STATUS_MAP = Object.fromEntries(CLIENT_STATUS.map((s) => [s.id, s]))

export default function Clientes() {
  const db = useDB()
  const navigate = useNavigate()
  const { toast, confirm } = useUI()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [text, setText] = useState('')
  const [fStatus, setFStatus] = useState('')

  const counts = useMemo(
    () => ({
      total: db.clients.length,
      ativo: db.clients.filter((c) => c.status === 'ativo').length,
      lead: db.clients.filter((c) => c.status === 'lead').length,
      inativo: db.clients.filter((c) => c.status === 'inativo').length,
    }),
    [db.clients],
  )

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    return db.clients.filter((c) => {
      if (fStatus && c.status !== fStatus) return false
      if (q && !`${c.name} ${c.responsibleName} ${c.city}`.toLowerCase().includes(q))
        return false
      return true
    })
  }, [db.clients, text, fStatus])

  const pag = usePaginated(filtered, 10)

  const demandCount = (id) => db.demands.filter((d) => d.clientId === id).length

  const openNew = () => {
    setEditingId(null)
    setModalOpen(true)
  }
  const openEdit = (id) => {
    setEditingId(id)
    setModalOpen(true)
  }

  const handleDelete = async (client) => {
    const linked = demandCount(client.id)
    const ok = await confirm({
      title: 'Excluir cliente',
      message: linked
        ? `O cliente "${client.name}" possui ${linked} demanda(s) vinculada(s). As demandas não serão apagadas, mas ficarão sem cliente. Deseja continuar?`
        : `O cliente "${client.name}" será removido permanentemente. Deseja continuar?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    remove('clients', client.id)
    toast('Cliente excluído', 'info')
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${db.clients.length} clientes cadastrados`}
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={15} /> Novo cliente
          </button>
        }
      />

      <div className="grid cols-4">
        <StatCard icon={Users} label="Total" value={counts.total} accent="#38BDF8" />
        <StatCard icon={UserCheck} label="Ativos" value={counts.ativo} accent="#00FF85" />
        <StatCard icon={Sparkles} label="Leads" value={counts.lead} accent="#FACC15" />
        <StatCard icon={UserX} label="Inativos" value={counts.inativo} accent="#A3A3A3" />
      </div>

      <div className="toolbar mt-24">
        <div className="search" style={{ maxWidth: 300 }}>
          <Search />
          <input
            placeholder="Buscar por nome, responsável ou cidade..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <button
          className={`pill ${fStatus === '' ? 'active' : ''}`}
          onClick={() => setFStatus('')}
        >
          Todos
        </button>
        {CLIENT_STATUS.map((s) => (
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
            icon={Users}
            title="Nenhum cliente encontrado"
            text={
              db.clients.length === 0
                ? 'Cadastre seu primeiro cliente para começar.'
                : 'Tente ajustar a busca ou os filtros.'
            }
            action={
              db.clients.length === 0 && (
                <button className="btn btn-primary" onClick={openNew}>
                  <Plus size={15} /> Novo cliente
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Localização</th>
                  <th>Demandas</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pag.paged.map((c) => {
                  const st = STATUS_MAP[c.status]
                  return (
                    <tr
                      key={c.id}
                      className="row-action"
                      onClick={() => navigate(`/clientes/${c.id}`)}
                    >
                      <td>
                        <div className="avatar-row">
                          <Avatar name={c.name} size={38} />
                          <div>
                            <div className="font-bold">{c.name}</div>
                            <div className="text-xs text-2">{c.responsibleName || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-2 flex items-center gap-6">
                          <Mail size={12} /> {c.email || '—'}
                        </div>
                        <div className="text-xs text-2 flex items-center gap-6" style={{ marginTop: 3 }}>
                          <Phone size={12} /> {c.whatsapp || c.phone || '—'}
                        </div>
                      </td>
                      <td className="text-sm">
                        {c.city ? `${c.city}${c.state ? ' / ' + c.state : ''}` : '—'}
                      </td>
                      <td>
                        <span className="tag">{demandCount(c.id)} demanda(s)</span>
                      </td>
                      <td>
                        <Badge label={st.label} color={st.color} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-6 justify-between">
                          <button
                            className="btn btn-sm btn-icon"
                            title="Editar"
                            onClick={() => openEdit(c.id)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-icon"
                            title="Excluir"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-icon"
                            title="Ver detalhes"
                            onClick={() => navigate(`/clientes/${c.id}`)}
                          >
                            <ChevronRight size={14} />
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

      <ClientModal open={modalOpen} clientId={editingId} onClose={() => setModalOpen(false)} />
    </>
  )
}
