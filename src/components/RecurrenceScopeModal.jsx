import { Repeat, Calendar, Layers } from 'lucide-react'
import Modal from './Modal'

/**
 * Modal que pergunta ao usuário se uma edição ou exclusão deve ser aplicada
 * apenas ao lançamento atual ou a toda a recorrência (contrato vinculado).
 *
 * Props:
 *  - open: boolean
 *  - action: 'edit' | 'delete'
 *  - onClose: () => void
 *  - onChoose: (scope: 'single' | 'all') => void
 */
export default function RecurrenceScopeModal({ open, action = 'edit', onClose, onChoose }) {
  const isDelete = action === 'delete'
  const title = isDelete ? 'Excluir lançamento recorrente' : 'Editar lançamento recorrente'
  const question = isDelete
    ? 'Deseja remover apenas este lançamento ou toda a recorrência?'
    : 'Deseja aplicar essa alteração apenas neste mês ou em toda a recorrência?'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="muted-box mb-16 flex items-center gap-12">
        <Repeat size={18} className="text-neon" />
        <div className="text-sm">{question}</div>
      </div>

      <div className="grid" style={{ gap: 10 }}>
        <button
          type="button"
          className="scope-option"
          onClick={() => onChoose('single')}
        >
          <div className="dot-icon" style={{ background: 'rgba(56,189,248,0.14)', color: '#38BDF8' }}>
            <Calendar size={16} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div className="font-bold text-sm">
              {isDelete ? 'Remover apenas este lançamento' : 'Apenas este lançamento'}
            </div>
            <div className="text-xs text-2">
              {isDelete
                ? 'Remove somente o lançamento deste mês. Os próximos continuam sendo gerados.'
                : 'Altera somente a receita deste mês. Meses anteriores e futuros não são afetados.'}
            </div>
          </div>
        </button>

        <button
          type="button"
          className="scope-option danger"
          onClick={() => onChoose('all')}
        >
          <div
            className="dot-icon"
            style={{
              background: isDelete ? 'rgba(239,68,68,0.14)' : 'rgba(0,255,133,0.14)',
              color: isDelete ? '#EF4444' : '#00FF85',
            }}
          >
            <Layers size={16} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div className="font-bold text-sm">
              {isDelete ? 'Remover toda a recorrência' : 'Toda a recorrência'}
            </div>
            <div className="text-xs text-2">
              {isDelete
                ? 'Cancela a série inteira: remove os próximos meses e o contrato.'
                : 'Aplica em todos os lançamentos vinculados (anteriores e futuros).'}
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-end mt-16">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
