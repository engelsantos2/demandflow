import { useState } from 'react'
import { UserPlus, Check, X } from 'lucide-react'
import { useDB, insert } from '../data/store'
import { useUI } from './UIProvider'

// Seletor de cliente com cadastro rápido inline — evita sair da tela atual.
export default function ClientSelect({ value, onChange, error, emptyLabel = 'Selecione...' }) {
  const db = useDB()
  const { toast } = useUI()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')

  const reset = () => {
    setName('')
    setWhatsapp('')
    setEmail('')
    setAdding(false)
  }

  const save = () => {
    if (!name.trim()) {
      toast('Informe o nome do cliente', 'error')
      return
    }
    const client = insert('clients', {
      name: name.trim(),
      responsibleName: '',
      email: email.trim(),
      phone: '',
      whatsapp: whatsapp.trim(),
      document: '',
      address: '',
      city: '',
      state: '',
      status: 'lead',
      notes: '',
    })
    onChange(client.id)
    toast('Cliente cadastrado e selecionado')
    reset()
  }

  return (
    <div>
      <div className="flex gap-8">
        <select
          className={`select ${error ? 'error' : ''}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{emptyLabel}</option>
          {db.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`btn btn-icon ${adding ? 'btn-primary' : ''}`}
          title="Cadastro rápido de cliente"
          onClick={() => setAdding((a) => !a)}
        >
          <UserPlus size={16} />
        </button>
      </div>

      {adding && (
        <div className="muted-box mt-8">
          <div className="text-xs text-2" style={{ marginBottom: 10 }}>
            Cadastro rápido — você pode completar os demais dados depois em Clientes.
          </div>
          <input
            className="input"
            placeholder="Nome ou empresa *"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            style={{ marginBottom: 8 }}
          />
          <div className="form-row cols-2" style={{ marginBottom: 10 }}>
            <input
              className="input"
              placeholder="WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <input
              className="input"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex gap-8 justify-between">
            <button type="button" className="btn btn-sm btn-ghost" onClick={reset}>
              <X size={13} /> Cancelar
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={save}>
              <Check size={13} /> Cadastrar cliente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
