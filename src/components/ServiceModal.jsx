import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import { useDB, insert, update } from '../data/store'
import { useUI } from './UIProvider'
import { SERVICE_STATUS } from '../lib/constants'

const BLANK = {
  name: '',
  category: '',
  description: '',
  defaultPrice: '',
  averageDeliveryDays: '',
  status: 'ativo',
}

export default function ServiceModal({ open, serviceId, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const service = serviceId ? db.services.find((s) => s.id === serviceId) : null
  const isEdit = !!service

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})

  const categories = useMemo(
    () => [...new Set(db.services.map((s) => s.category).filter(Boolean))],
    [db.services],
  )

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(service ? { ...BLANK, ...service } : BLANK)
  }, [open, serviceId]) // eslint-disable-line

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Informe o nome do produto ou serviço.'
    if (form.defaultPrice !== '' && Number(form.defaultPrice) < 0)
      err.defaultPrice = 'Valor inválido.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      ...form,
      defaultPrice: Number(form.defaultPrice) || 0,
      averageDeliveryDays: Number(form.averageDeliveryDays) || 0,
    }
    if (isEdit) {
      update('services', service.id, payload)
      toast('Serviço atualizado com sucesso')
    } else {
      insert('services', payload)
      toast('Serviço cadastrado com sucesso')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar produto / serviço' : 'Novo produto / serviço'}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> {isEdit ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </>
      }
    >
      <Field label="Nome do produto / serviço" required error={errors.name}>
        <input
          className={`input ${errors.name ? 'error' : ''}`}
          value={form.name}
          onChange={set('name')}
          placeholder="Ex.: Landing Page"
        />
      </Field>

      <Field label="Categoria">
        <input
          className="input"
          list="service-categories"
          value={form.category}
          onChange={set('category')}
          placeholder="Ex.: Web, Design, Marketing..."
        />
        <datalist id="service-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <Field label="Descrição">
        <textarea
          className="textarea"
          rows={3}
          value={form.description}
          onChange={set('description')}
          placeholder="O que está incluso neste serviço..."
        />
      </Field>

      <div className="form-row cols-3">
        <Field label="Valor padrão (R$)" error={errors.defaultPrice}>
          <input
            type="number"
            min="0"
            className={`input ${errors.defaultPrice ? 'error' : ''}`}
            value={form.defaultPrice}
            onChange={set('defaultPrice')}
            placeholder="0,00"
          />
        </Field>
        <Field label="Prazo médio (dias)">
          <input
            type="number"
            min="0"
            className="input"
            value={form.averageDeliveryDays}
            onChange={set('averageDeliveryDays')}
            placeholder="0"
          />
        </Field>
        <Field label="Status">
          <select className="select" value={form.status} onChange={set('status')}>
            {SERVICE_STATUS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  )
}
