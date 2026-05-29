import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  Plus,
  CalendarDays,
  ListChecks,
  MessageSquare,
  Paperclip,
  Search,
  X,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import DemandModal from '../components/DemandModal'
import Avatar from '../components/Avatar'
import { useDB, update } from '../data/store'
import { useUI } from '../components/UIProvider'
import {
  currency,
  compactCurrency,
  formatDate,
  daysUntil,
  relativeDeadline,
  uid,
} from '../lib/format'
import { KANBAN_COLUMNS, STATUS_LABEL, PRIORITIES, PRIORITY_MAP } from '../lib/constants'

function CardBody({ demand, db }) {
  const client = db.clients.find((c) => c.id === demand.clientId)
  const service = db.services.find((s) => s.id === demand.serviceId)
  const prio = PRIORITY_MAP[demand.priority]
  const done = demand.checklist.filter((c) => c.completed).length
  const dd = daysUntil(demand.dueDate)
  const late = dd !== null && dd < 0 && !['concluido', 'cancelado'].includes(demand.status)
  const responsible = db.users.find((u) => u.id === demand.responsible)

  return (
    <>
      <div className="demand-card-top">
        <span className="demand-card-title">{demand.title}</span>
        <span
          className="badge"
          style={{ background: 'transparent', color: prio.color, padding: '2px 6px' }}
          title={`Prioridade ${prio.label}`}
        >
          <span className="dot-sm" />
        </span>
      </div>
      <div className="demand-card-client">{client?.name || 'Sem cliente'}</div>

      {service && <span className="tag mb-16">{service.name}</span>}

      <div className="demand-card-meta" style={{ marginTop: 8 }}>
        <span className="meta-chip" style={{ color: late ? '#ef4444' : 'var(--text-2)' }}>
          <CalendarDays /> {formatDate(demand.dueDate)}
        </span>
        {demand.checklist.length > 0 && (
          <span className="meta-chip">
            <ListChecks /> {done}/{demand.checklist.length}
          </span>
        )}
        {demand.comments.length > 0 && (
          <span className="meta-chip">
            <MessageSquare /> {demand.comments.length}
          </span>
        )}
        {demand.files.length > 0 && (
          <span className="meta-chip">
            <Paperclip /> {demand.files.length}
          </span>
        )}
      </div>

      {demand.tags.length > 0 && (
        <div className="flex gap-6 wrap" style={{ marginTop: 8 }}>
          {demand.tags.slice(0, 3).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="demand-card-foot">
        <span className="text-sm font-bold text-neon">{currency(demand.value)}</span>
        <span className="flex items-center gap-6">
          {late && (
            <span className="text-xs" style={{ color: '#ef4444' }}>
              {relativeDeadline(demand.dueDate)}
            </span>
          )}
          {responsible && <Avatar name={responsible.name} size={24} />}
        </span>
      </div>
    </>
  )
}

function DraggableCard({ demand, db, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: demand.id,
  })
  const wasDraggingRef = useRef(false)
  useEffect(() => {
    if (isDragging) wasDraggingRef.current = true
  }, [isDragging])

  const handleClick = () => {
    if (isDragging) return
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false
      return
    }
    onOpen(demand.id)
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`demand-card ${isDragging ? 'is-dragging' : ''}`}
    >
      <CardBody demand={demand} db={db} />
    </div>
  )
}

function DroppableColumn({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`kanban-col ${isOver ? 'drop-target' : ''}`}>
      {children}
    </div>
  )
}

export default function Demandas() {
  const db = useDB()
  const { toast } = useUI()
  const [params, setParams] = useSearchParams()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newStatus, setNewStatus] = useState('entrada')

  const [activeId, setActiveId] = useState(null)

  const [fClient, setFClient] = useState('')
  const [fPriority, setFPriority] = useState('')
  const [fResponsible, setFResponsible] = useState('')
  const [fText, setFText] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  useEffect(() => {
    const d = params.get('d')
    if (d && db.demands.some((x) => x.id === d)) {
      setEditingId(d)
      setModalOpen(true)
    }
  }, [params]) // eslint-disable-line

  const filtered = useMemo(() => {
    const q = fText.trim().toLowerCase()
    return db.demands.filter((d) => {
      if (fClient && d.clientId !== fClient) return false
      if (fPriority && d.priority !== fPriority) return false
      if (fResponsible && d.responsible !== fResponsible) return false
      if (q && !d.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [db.demands, fClient, fPriority, fResponsible, fText])

  const openNew = (status = 'entrada') => {
    setEditingId(null)
    setNewStatus(status)
    setModalOpen(true)
  }
  const openEdit = (id) => {
    setEditingId(id)
    setModalOpen(true)
  }
  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    if (params.get('d')) {
      params.delete('d')
      setParams(params, { replace: true })
    }
  }

  const handleDragStart = (e) => setActiveId(e.active.id)
  const handleDragEnd = (e) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const colId = over.id
    const demand = db.demands.find((x) => x.id === active.id)
    if (demand && demand.status !== colId) {
      update('demands', active.id, (dd) => ({
        status: colId,
        history: [
          ...dd.history,
          {
            id: uid('h'),
            date: new Date().toISOString(),
            text: `Movida para "${STATUS_LABEL[colId]}"`,
          },
        ],
      }))
      toast(`Demanda movida para "${STATUS_LABEL[colId]}"`)
    }
  }

  const activeDemand = activeId ? db.demands.find((d) => d.id === activeId) : null

  const hasFilters = fClient || fPriority || fResponsible || fText
  const clearFilters = () => {
    setFClient('')
    setFPriority('')
    setFResponsible('')
    setFText('')
  }

  return (
    <>
      <PageHeader
        title="Demandas"
        subtitle={`${filtered.length} de ${db.demands.length} demandas • quadro Kanban`}
        actions={
          <button className="btn btn-primary" onClick={() => openNew()}>
            <Plus size={15} /> Nova demanda
          </button>
        }
      />

      <div className="toolbar">
        <div className="search" style={{ maxWidth: 260 }}>
          <Search />
          <input
            placeholder="Buscar demanda..."
            value={fText}
            onChange={(e) => setFText(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={fClient}
          onChange={(e) => setFClient(e.target.value)}
        >
          <option value="">Todos os clientes</option>
          {db.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={fPriority}
          onChange={(e) => setFPriority(e.target.value)}
        >
          <option value="">Todas as prioridades</option>
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={fResponsible}
          onChange={(e) => setFResponsible(e.target.value)}
        >
          <option value="">Todos os responsáveis</option>
          {db.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button className="btn btn-sm btn-ghost" onClick={clearFilters}>
            <X size={13} /> Limpar filtros
          </button>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban">
          {KANBAN_COLUMNS.map((col) => {
            const cards = filtered.filter((d) => d.status === col.id)
            const total = cards.reduce((s, d) => s + (d.value || 0), 0)
            return (
              <DroppableColumn key={col.id} id={col.id}>
                <div className="kanban-col-header">
                  <span className="col-dot" style={{ background: col.accent }} />
                  <span className="kanban-col-title">{col.label}</span>
                  <span className="kanban-count">{cards.length}</span>
                </div>
                <div className="kanban-cards">
                  {cards.map((d) => (
                    <DraggableCard key={d.id} demand={d} db={db} onOpen={openEdit} />
                  ))}
                  <button
                    className="btn btn-sm btn-ghost full"
                    style={{ justifyContent: 'flex-start', color: 'var(--text-2)' }}
                    onClick={() => openNew(col.id)}
                  >
                    <Plus size={13} /> Adicionar
                  </button>
                </div>
                <div className="kanban-col-sum">
                  <span>{cards.length} demanda(s)</span>
                  <span className="text-neon font-bold">{compactCurrency(total)}</span>
                </div>
              </DroppableColumn>
            )
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDemand ? (
            <div className="demand-card-overlay">
              <CardBody demand={activeDemand} db={db} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DemandModal
        open={modalOpen}
        demandId={editingId}
        defaultStatus={newStatus}
        onClose={closeModal}
      />
    </>
  )
}
