import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Package,
  CheckCircle2,
  Tag,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import ServiceModal from '../components/ServiceModal'
import { useDB, remove } from '../data/store'
import { useUI } from '../components/UIProvider'
import { currency } from '../lib/format'
import { SERVICE_STATUS } from '../lib/constants'

const STATUS_MAP = Object.fromEntries(SERVICE_STATUS.map((s) => [s.id, s]))

export default function Produtos() {
  const db = useDB()
  const { toast, confirm } = useUI()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [text, setText] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [fStatus, setFStatus] = useState('')

  const categories = useMemo(
    () => [...new Set(db.services.map((s) => s.category).filter(Boolean))],
    [db.services],
  )

  const stats = useMemo(() => {
    const ativos = db.services.filter((s) => s.status === 'ativo')
    const avgPrice = ativos.length
      ? ativos.reduce((s, x) => s + (x.defaultPrice || 0), 0) / ativos.length
      : 0
    const avgDays = ativos.length
      ? Math.round(
          ativos.reduce((s, x) => s + (x.averageDeliveryDays || 0), 0) / ativos.length,
        )
      : 0
    return { total: db.services.length, ativos: ativos.length, avgPrice, avgDays }
  }, [db.services])

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    return db.services.filter((s) => {
      if (fCategory && s.category !== fCategory) return false
      if (fStatus && s.status !== fStatus) return false
      if (q && !`${s.name} ${s.description}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [db.services, text, fCategory, fStatus])

  const usageCount = (id) => db.demands.filter((d) => d.serviceId === id).length

  const openNew = () => {
    setEditingId(null)
    setModalOpen(true)
  }
  const openEdit = (id) => {
    setEditingId(id)
    setModalOpen(true)
  }

  const handleDelete = async (service) => {
    const ok = await confirm({
      title: 'Excluir serviço',
      message: `O serviço "${service.name}" será removido permanentemente. Deseja continuar?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    remove('services', service.id)
    toast('Serviço excluído', 'info')
  }

  return (
    <>
      <PageHeader
        title="Produtos e serviços"
        subtitle={`${db.services.length} itens no catálogo`}
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={15} /> Novo serviço
          </button>
        }
      />

      <div className="grid cols-4">
        <StatCard icon={Package} label="Total no catálogo" value={stats.total} accent="#38BDF8" />
        <StatCard icon={CheckCircle2} label="Ativos" value={stats.ativos} accent="#00FF85" />
        <StatCard icon={Tag} label="Ticket médio" value={currency(stats.avgPrice)} accent="#FACC15" />
        <StatCard
          icon={Clock}
          label="Prazo médio"
          value={`${stats.avgDays} dias`}
          accent="#A78BFA"
        />
      </div>

      <div className="toolbar mt-24">
        <div className="search" style={{ maxWidth: 280 }}>
          <Search />
          <input
            placeholder="Buscar serviço..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={fCategory}
          onChange={(e) => setFCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <button className={`pill ${fStatus === '' ? 'active' : ''}`} onClick={() => setFStatus('')}>
          Todos
        </button>
        {SERVICE_STATUS.map((s) => (
          <button
            key={s.id}
            className={`pill ${fStatus === s.id ? 'active' : ''}`}
            onClick={() => setFStatus(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="Nenhum serviço encontrado"
            text={
              db.services.length === 0
                ? 'Cadastre seu primeiro produto ou serviço.'
                : 'Tente ajustar a busca ou os filtros.'
            }
            action={
              db.services.length === 0 && (
                <button className="btn btn-primary" onClick={openNew}>
                  <Plus size={15} /> Novo serviço
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid cols-3">
          {filtered.map((s) => {
            const st = STATUS_MAP[s.status] || STATUS_MAP.ativo
            return (
              <div key={s.id} className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="flex justify-between items-center">
                  {s.category ? <span className="tag">{s.category}</span> : <span />}
                  <Badge label={st.label} color={st.color} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>{s.name}</h3>
                <p className="text-sm text-2 mt-8" style={{ flex: 1 }}>
                  {s.description || 'Sem descrição.'}
                </p>
                <div className="divider" style={{ margin: '14px 0' }} />
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-2">Valor padrão</div>
                    <div className="font-bold text-neon" style={{ fontSize: 17 }}>
                      {currency(s.defaultPrice)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-2">Prazo médio</div>
                    <div className="font-bold">{s.averageDeliveryDays || 0} dias</div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-16">
                  <span className="text-xs text-2">{usageCount(s.id)} demanda(s)</span>
                  <div className="flex gap-6">
                    <button className="btn btn-sm btn-icon" title="Editar" onClick={() => openEdit(s.id)}>
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-icon"
                      title="Excluir"
                      onClick={() => handleDelete(s)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ServiceModal open={modalOpen} serviceId={editingId} onClose={() => setModalOpen(false)} />
    </>
  )
}
