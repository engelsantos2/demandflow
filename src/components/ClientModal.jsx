import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import { useDB, insert, update } from '../data/store'
import { useUI } from './UIProvider'
import { CLIENT_STATUS, BR_STATES } from '../lib/constants'

const BLANK = {
  name: '',
  responsibleName: '',
  email: '',
  phone: '',
  whatsapp: '',
  document: '',
  address: '',
  city: '',
  state: '',
  status: 'lead',
  notes: '',
}

export default function ClientModal({ open, clientId, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const client = clientId ? db.clients.find((c) => c.id === clientId) : null
  const isEdit = !!client

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(client ? { ...BLANK, ...client } : BLANK)
  }, [open, clientId]) // eslint-disable-line

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Informe o nome ou empresa.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      err.email = 'E-mail inválido.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    if (isEdit) {
      update('clients', client.id, form)
      toast('Cliente atualizado com sucesso')
    } else {
      insert('clients', form)
      toast('Cliente cadastrado com sucesso')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> {isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}
          </button>
        </>
      }
    >
      <div className="form-row cols-2">
        <Field label="Nome ou empresa" required error={errors.name}>
          <input
            className={`input ${errors.name ? 'error' : ''}`}
            value={form.name}
            onChange={set('name')}
            placeholder="Ex.: Studio Aurora"
          />
        </Field>
        <Field label="Nome do responsável">
          <input
            className="input"
            value={form.responsibleName}
            onChange={set('responsibleName')}
            placeholder="Ex.: Camila Aurora"
          />
        </Field>
      </div>

      <div className="form-row cols-3">
        <Field label="E-mail" error={errors.email}>
          <input
            className={`input ${errors.email ? 'error' : ''}`}
            value={form.email}
            onChange={set('email')}
            placeholder="contato@empresa.com"
          />
        </Field>
        <Field label="Telefone">
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="(00) 0000-0000" />
        </Field>
        <Field label="WhatsApp">
          <input className="input" value={form.whatsapp} onChange={set('whatsapp')} placeholder="(00) 00000-0000" />
        </Field>
      </div>

      <div className="form-row cols-2">
        <Field label="Documento (CNPJ / CPF)">
          <input className="input" value={form.document} onChange={set('document')} />
        </Field>
        <Field label="Endereço">
          <input className="input" value={form.address} onChange={set('address')} />
        </Field>
      </div>

      <div className="form-row cols-3">
        <Field label="Cidade">
          <input className="input" value={form.city} onChange={set('city')} />
        </Field>
        <Field label="Estado">
          <select className="select" value={form.state} onChange={set('state')}>
            <option value="">UF</option>
            {BR_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className="select" value={form.status} onChange={set('status')}>
            {CLIENT_STATUS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Observações internas">
        <textarea
          className="textarea"
          rows={3}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Notas sobre o cliente..."
        />
      </Field>
    </Modal>
  )
}
