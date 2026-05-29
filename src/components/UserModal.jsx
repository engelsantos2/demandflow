import { useEffect, useState } from 'react'
import { Check, Shield } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import { useDB, insert, update } from '../data/store'
import { useUI } from './UIProvider'
import { PERMISSION_MODULES } from '../lib/permissions'

const BLANK = {
  name: '',
  email: '',
  position: '',
  password: '',
  isAdmin: false,
  permissions: ['dashboard'],
}

export default function UserModal({ open, userId, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const user = userId ? db.users.find((u) => u.id === userId) : null
  const isEdit = !!user

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      user
        ? {
            ...BLANK,
            ...user,
            password: '',
            isAdmin: !!user.isAdmin,
            permissions: user.permissions || [],
          }
        : BLANK,
    )
  }, [open, userId]) // eslint-disable-line

  const setField = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }))

  const togglePerm = (id) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter((p) => p !== id)
        : [...f.permissions, id],
    }))

  const toggleAdmin = (e) =>
    setForm((f) => ({ ...f, isAdmin: e.target.checked }))

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Informe o nome.'
    if (!form.email.trim()) err.email = 'Informe o e-mail.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = 'E-mail inválido.'
    if (!isEdit && !form.password.trim()) err.password = 'Defina uma senha.'
    const dup = db.users.find(
      (u) =>
        (u.email || '').toLowerCase() === form.email.trim().toLowerCase() && u.id !== userId,
    )
    if (dup) err.email = 'Já existe um usuário com este e-mail.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      name: form.name,
      email: form.email,
      position: form.position,
      isAdmin: !!form.isAdmin,
      permissions: form.permissions,
    }
    if (isEdit) {
      if (form.password.trim()) payload.password = form.password
      update('users', user.id, payload)
      toast('Usuário atualizado')
    } else {
      insert('users', { ...payload, password: form.password })
      toast('Usuário cadastrado')
    }
    onClose()
  }

  const allChecked = form.permissions.length === PERMISSION_MODULES.length

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar usuário' : 'Novo usuário'}
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
      <div className="form-row cols-2">
        <Field label="Nome" required error={errors.name}>
          <input
            className={`input ${errors.name ? 'error' : ''}`}
            value={form.name}
            onChange={setField('name')}
          />
        </Field>
        <Field label="Cargo" hint="Texto livre, ex.: Designer Sênior, Atendimento, Sócio">
          <input className="input" value={form.position} onChange={setField('position')} />
        </Field>
      </div>

      <div className="form-row cols-2">
        <Field label="E-mail" required error={errors.email}>
          <input
            className={`input ${errors.email ? 'error' : ''}`}
            type="email"
            value={form.email}
            onChange={setField('email')}
          />
        </Field>
        <Field
          label={isEdit ? 'Nova senha (opcional)' : 'Senha'}
          required={!isEdit}
          error={errors.password}
        >
          <input
            className={`input ${errors.password ? 'error' : ''}`}
            value={form.password}
            onChange={setField('password')}
            placeholder={isEdit ? 'Deixe em branco para manter' : ''}
          />
        </Field>
      </div>

      <div className="muted-box">
        <label className="checkbox" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={form.isAdmin} onChange={toggleAdmin} />
          <div>
            <div className="flex items-center gap-6">
              <Shield size={14} className="text-neon" />
              <strong>Administrador</strong>
            </div>
            <div className="text-xs text-2 mt-8">
              Acesso total a todos os módulos e à gestão de usuários.
              Quando marcado, as permissões individuais abaixo são ignoradas.
            </div>
          </div>
        </label>
      </div>

      <div className="muted-box mt-16">
        <div className="flex justify-between items-center mb-16">
          <strong className="text-sm">Permissões individuais</strong>
          {!form.isAdmin && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  permissions: allChecked
                    ? []
                    : PERMISSION_MODULES.map((m) => m.id),
                }))
              }
            >
              {allChecked ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          )}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 8,
            opacity: form.isAdmin ? 0.45 : 1,
            pointerEvents: form.isAdmin ? 'none' : 'auto',
          }}
        >
          {PERMISSION_MODULES.map((m) => (
            <label
              key={m.id}
              className="checkbox"
              style={{
                background: '#0d1310',
                border: '1px solid var(--border-soft)',
                borderRadius: 8,
                padding: '8px 10px',
              }}
            >
              <input
                type="checkbox"
                checked={form.permissions.includes(m.id)}
                onChange={() => togglePerm(m.id)}
              />
              {m.label}
            </label>
          ))}
        </div>
        {!form.isAdmin && form.permissions.length === 0 && (
          <div className="text-xs text-warn mt-8">
            ⚠ Sem nenhuma permissão marcada, o usuário não verá nenhum módulo após o login.
          </div>
        )}
      </div>
    </Modal>
  )
}
