import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Plus,
  X,
} from 'lucide-react'
import Modal from './Modal'

/**
 * Modal genérico de personalização de cards de métricas.
 *
 * Funciona tanto para o Dashboard quanto para o Financeiro — cada tela passa
 * seu próprio catálogo de métricas, agrupamentos e layout padrão.
 *
 * Props:
 *  - open: boolean
 *  - title: string (cabeçalho do modal e da seção esquerda)
 *  - hint: string (texto curto explicando como funciona)
 *  - catalog: array de definições de métrica { id, label, group, ... }
 *  - groups: array de grupos { id, label } usado na coluna de adicionar
 *  - defaults: ids do layout padrão (botão "Restaurar padrão")
 *  - selected: ids atualmente exibidos (vem das settings)
 *  - onClose: () => void
 *  - onSave: (ids: string[]) => void
 */
export default function CustomizeMetricsModal({
  open,
  title = 'Personalizar métricas',
  hint,
  catalog,
  groups,
  defaults,
  selected,
  onClose,
  onSave,
}) {
  const map = useMemo(
    () => Object.fromEntries(catalog.map((d) => [d.id, d])),
    [catalog],
  )
  const groupLabel = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.id, g.label])),
    [groups],
  )

  const [draft, setDraft] = useState(selected?.length ? selected : defaults)

  useEffect(() => {
    if (open) setDraft(selected?.length ? selected : defaults)
  }, [open, selected, defaults])

  const available = useMemo(
    () => catalog.filter((d) => !draft.includes(d.id)),
    [catalog, draft],
  )

  const move = (idx, dir) => {
    const next = [...draft]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setDraft(next)
  }
  const remove = (id) => setDraft((d) => d.filter((x) => x !== id))
  const add = (id) => setDraft((d) => [...d, id])
  const reset = () => setDraft([...defaults])

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      footer={
        <>
          <button className="btn" onClick={reset} title="Restaurar layout padrão">
            <RotateCcw size={14} /> Restaurar padrão
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> Salvar
          </button>
        </>
      }
    >
      {hint && (
        <div className="muted-box mb-16">
          <div className="font-bold text-sm mb-4">Como funciona</div>
          <div className="text-xs text-2">{hint}</div>
        </div>
      )}

      <div className="dashcust-grid">
        {/* Coluna 1: métricas selecionadas (ordenadas) */}
        <div>
          <div className="dashcust-section-title">
            <span>Cards exibidos</span>
            <span className="text-2 text-xs">{draft.length} selecionado(s)</span>
          </div>
          {draft.length === 0 ? (
            <div className="muted-box text-xs text-2">
              Nenhuma métrica selecionada. Use a lista ao lado para adicionar.
            </div>
          ) : (
            <div className="dashcust-list">
              {draft.map((id, idx) => {
                const def = map[id]
                if (!def) return null
                return (
                  <div key={id} className="dashcust-item">
                    <GripVertical size={14} className="text-2" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-bold text-sm">{def.label}</div>
                      <div className="text-xs text-2">
                        {groupLabel[def.group] || def.group}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        className="btn btn-sm btn-icon"
                        title="Mover para cima"
                        disabled={idx === 0}
                        onClick={() => move(idx, -1)}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-icon"
                        title="Mover para baixo"
                        disabled={idx === draft.length - 1}
                        onClick={() => move(idx, +1)}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-icon"
                        title="Remover"
                        onClick={() => remove(id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Coluna 2: catálogo agrupado */}
        <div>
          <div className="dashcust-section-title">
            <span>Adicionar métrica</span>
          </div>
          {groups.map((g) => {
            const items = available.filter((d) => d.group === g.id)
            if (items.length === 0) return null
            return (
              <div key={g.id} className="dashcust-group">
                <div className="dashcust-group-title">{g.label}</div>
                <div className="dashcust-list">
                  {items.map((def) => (
                    <button
                      key={def.id}
                      type="button"
                      className="dashcust-add"
                      onClick={() => add(def.id)}
                      title="Adicionar"
                    >
                      <span className="font-bold text-sm">{def.label}</span>
                      <Plus size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
