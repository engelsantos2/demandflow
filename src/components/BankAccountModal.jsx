import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, Star } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import { useDB, insert, update } from '../data/store'
import { useUI } from './UIProvider'
import { ACCOUNT_TYPES } from '../lib/bankAccounts'

const ACCENT_COLORS = ['#00FF85', '#38BDF8', '#FACC15', '#A78BFA', '#FB923C', '#EF4444', '#22C55E']

const BLANK = {
  name: '',
  bank: '',
  agency: '',
  accountNumber: '',
  type: 'corrente',
  initialBalance: '',
  color: '#00FF85',
  includeInTotal: true,
  isPrimary: false,
  notes: '',
}

export default function BankAccountModal({ open, accountId, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const account = accountId ? db.bankAccounts.find((a) => a.id === accountId) : null
  const isEdit = !!account

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(account ? { ...BLANK, ...account } : BLANK)
  }, [open, accountId]) // eslint-disable-line

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Informe o nome da conta.'
    if (form.initialBalance !== '' && Number.isNaN(Number(form.initialBalance)))
      err.initialBalance = 'Valor inválido.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      ...form,
      initialBalance: Number(form.initialBalance) || 0,
      includeInTotal: !!form.includeInTotal,
      isPrimary: !!form.isPrimary,
    }
    // Se marcou como principal, desmarca todas as outras (só pode existir 1)
    if (payload.isPrimary) {
      for (const a of db.bankAccounts) {
        if (a.isPrimary && a.id !== accountId) {
          update('bankAccounts', a.id, { isPrimary: false })
        }
      }
    }
    if (isEdit) {
      update('bankAccounts', account.id, payload)
      toast('Conta atualizada')
    } else {
      insert('bankAccounts', payload)
      toast('Conta cadastrada')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar conta bancária' : 'Nova conta bancária'}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> {isEdit ? 'Salvar alterações' : 'Cadastrar conta'}
          </button>
        </>
      }
    >
      <Field label="Nome da conta" required error={errors.name}>
        <input
          className={`input ${errors.name ? 'error' : ''}`}
          value={form.name}
          onChange={set('name')}
          placeholder="Ex.: Conta principal"
        />
      </Field>

      <div className="form-row cols-2">
        <Field label="Banco">
          <input className="input" value={form.bank} onChange={set('bank')} />
        </Field>
        <Field label="Tipo">
          <select className="select" value={form.type} onChange={set('type')}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="form-row cols-2">
        <Field label="Agência">
          <input className="input" value={form.agency} onChange={set('agency')} />
        </Field>
        <Field label="Número da conta">
          <input
            className="input"
            value={form.accountNumber}
            onChange={set('accountNumber')}
          />
        </Field>
      </div>

      <Field
        label="Saldo inicial (R$)"
        error={errors.initialBalance}
        hint="Saldo da conta no momento do cadastro. O saldo atual é calculado a partir dos lançamentos."
      >
        <input
          type="number"
          step="0.01"
          className={`input ${errors.initialBalance ? 'error' : ''}`}
          value={form.initialBalance}
          onChange={set('initialBalance')}
        />
      </Field>

      <Field label="Cor de identificação">
        <div className="flex gap-8 wrap">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: c,
                border: form.color === c ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer',
              }}
              title={c}
            />
          ))}
        </div>
      </Field>

      <div className="muted-box">
        <label className="checkbox" style={{ alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={!!form.isPrimary}
            onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
          />
          <div>
            <div className="flex items-center gap-6">
              <Star
                size={14}
                className={form.isPrimary ? 'text-neon' : 'text-2'}
                style={form.isPrimary ? { fill: '#00FF85' } : undefined}
              />
              <strong>Conta principal</strong>
            </div>
            <div className="text-xs text-2 mt-8">
              Esta conta será pré-selecionada em todos os lançamentos de
              receita e despesa. Apenas uma conta pode ser principal por vez —
              ao marcar esta, qualquer outra anterior é desmarcada.
            </div>
          </div>
        </label>
      </div>

      <div className="muted-box">
        <label className="checkbox" style={{ alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={!!form.includeInTotal}
            onChange={(e) => setForm((f) => ({ ...f, includeInTotal: e.target.checked }))}
          />
          <div>
            <div className="flex items-center gap-6">
              {form.includeInTotal ? (
                <Eye size={14} className="text-neon" />
              ) : (
                <EyeOff size={14} className="text-2" />
              )}
              <strong>Incluir no saldo total previsto</strong>
            </div>
            <div className="text-xs text-2 mt-8">
              Quando desativado, o saldo desta conta fica "invisível" no saldo
              total previsto do Dashboard e do Financeiro. Útil para reservas
              ou contas que não devem entrar no caixa operacional.
            </div>
          </div>
        </label>
      </div>

      <Field label="Observações">
        <textarea
          className="textarea"
          rows={2}
          value={form.notes}
          onChange={set('notes')}
        />
      </Field>
    </Modal>
  )
}
