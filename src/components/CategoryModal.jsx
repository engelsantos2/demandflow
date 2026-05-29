import { useEffect, useState } from 'react'
import { Check, ArrowUpCircle, ArrowDownCircle, Tag } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import { useDB, insert, update } from '../data/store'
import { useUI } from './UIProvider'

const BLANK = {
  name: '',
  scope: 'receita',
  active: true,
}

/**
 * Modal de cadastro/edição de uma categoria financeira.
 *
 * Props:
 *  - open: boolean
 *  - categoryId: id da categoria (edição) ou null (criação)
 *  - defaultScope: 'receita' | 'despesa' | 'ambos' (sugestão inicial)
 *  - onClose: () => void
 */
export default function CategoryModal({ open, categoryId, defaultScope, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const category = categoryId
    ? (db.financialCategories || []).find((c) => c.id === categoryId)
    : null
  const isEdit = !!category

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (category) {
      setForm({ ...BLANK, ...category })
    } else {
      setForm({ ...BLANK, scope: defaultScope || 'receita' })
    }
  }, [open, categoryId, defaultScope]) // eslint-disable-line

  const set = (key) => (e) => {
    const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
    setForm((f) => ({ ...f, [key]: v }))
  }

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Informe um nome.'
    // Nome único (case-insensitive)
    const exists = (db.financialCategories || []).some(
      (c) =>
        c.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        c.id !== category?.id,
    )
    if (exists) err.name = 'Já existe uma categoria com esse nome.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      scope: form.scope,
      active: !!form.active,
    }
    if (isEdit) {
      update('financialCategories', category.id, payload)
      toast('Categoria atualizada')
    } else {
      insert('financialCategories', payload)
      toast('Categoria criada')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar categoria' : 'Nova categoria'}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> {isEdit ? 'Salvar' : 'Criar categoria'}
          </button>
        </>
      }
    >
      <div className="muted-box mb-16 flex items-center gap-12">
        <Tag size={18} className="text-neon" />
        <div className="text-xs text-2">
          Categorias organizam suas receitas e despesas. Defina o escopo para
          controlar onde a categoria aparece nos formulários.
        </div>
      </div>

      <Field label="Nome da categoria" required error={errors.name}>
        <input
          className={`input ${errors.name ? 'error' : ''}`}
          value={form.name}
          onChange={set('name')}
          placeholder="Ex.: Manutenção mensal"
          autoFocus
        />
      </Field>

      <Field label="Tipo">
        <div className="segmented">
          <button
            type="button"
            className={form.scope === 'receita' ? 'active' : ''}
            onClick={() => setForm((f) => ({ ...f, scope: 'receita' }))}
          >
            <ArrowUpCircle size={13} style={{ verticalAlign: -2 }} /> Receita
          </button>
          <button
            type="button"
            className={form.scope === 'despesa' ? 'active' : ''}
            onClick={() => setForm((f) => ({ ...f, scope: 'despesa' }))}
          >
            <ArrowDownCircle size={13} style={{ verticalAlign: -2 }} /> Despesa
          </button>
          <button
            type="button"
            className={form.scope === 'ambos' ? 'active' : ''}
            onClick={() => setForm((f) => ({ ...f, scope: 'ambos' }))}
          >
            Ambos
          </button>
        </div>
      </Field>

      <label className="checkbox mt-8">
        <input type="checkbox" checked={!!form.active} onChange={set('active')} />
        Categoria ativa (aparece nos formulários de receita e despesa)
      </label>
    </Modal>
  )
}
