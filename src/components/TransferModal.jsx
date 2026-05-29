import { useEffect, useState } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import DateInput from './DateInput'
import { useDB, insert, update } from '../data/store'
import { useUI } from './UIProvider'
import { todayISO, currency } from '../lib/format'
import { accountBalance } from '../lib/bankAccounts'

const BLANK = {
  accountId: '',
  destAccountId: '',
  value: '',
  dueDate: todayISO(),
  description: 'Transferência entre contas',
  notes: '',
}

export default function TransferModal({ open, entryId, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const entry = entryId ? db.financialEntries.find((e) => e.id === entryId) : null
  const isEdit = !!entry

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (entry) {
      setForm({
        accountId: entry.accountId || '',
        destAccountId: entry.destAccountId || '',
        value: entry.value,
        dueDate: entry.dueDate || todayISO(),
        description: entry.description || '',
        notes: entry.notes || '',
      })
    } else {
      const first = db.bankAccounts[0]?.id || ''
      const second = db.bankAccounts[1]?.id || ''
      setForm({ ...BLANK, accountId: first, destAccountId: second })
    }
  }, [open, entryId]) // eslint-disable-line

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const err = {}
    if (!form.accountId) err.accountId = 'Selecione a conta de origem.'
    if (!form.destAccountId) err.destAccountId = 'Selecione a conta de destino.'
    if (form.accountId && form.accountId === form.destAccountId)
      err.destAccountId = 'A conta de destino deve ser diferente da origem.'
    if (!form.value || Number(form.value) <= 0) err.value = 'Informe um valor válido.'
    if (!form.dueDate) err.dueDate = 'Informe a data da transferência.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const value = Number(form.value)
    const payload = {
      type: 'transferencia',
      accountId: form.accountId,
      destAccountId: form.destAccountId,
      value,
      dueDate: form.dueDate,
      paymentDate: form.dueDate,
      status: 'pago',
      paymentMethod: 'Transferência',
      isRecurring: false,
      category: 'Transferência',
      description: form.description || 'Transferência entre contas',
      notes: form.notes,
      clientId: '',
      demandId: '',
      proposalId: '',
    }
    if (isEdit) {
      update('financialEntries', entry.id, payload)
      toast('Transferência atualizada')
    } else {
      insert('financialEntries', payload)
      toast('Transferência registrada')
    }
    onClose()
  }

  const origin = db.bankAccounts.find((a) => a.id === form.accountId)
  const dest = db.bankAccounts.find((a) => a.id === form.destAccountId)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar transferência' : 'Nova transferência entre contas'}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> {isEdit ? 'Salvar alterações' : 'Registrar transferência'}
          </button>
        </>
      }
    >
      {db.bankAccounts.length < 2 ? (
        <p className="text-sm text-2">
          Cadastre ao menos duas contas bancárias para registrar uma transferência.
        </p>
      ) : (
        <>
          <div className="form-row cols-2">
            <Field label="Conta de origem" required error={errors.accountId}>
              <select
                className={`select ${errors.accountId ? 'error' : ''}`}
                value={form.accountId}
                onChange={set('accountId')}
              >
                <option value="">Selecione...</option>
                {db.bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Conta de destino" required error={errors.destAccountId}>
              <select
                className={`select ${errors.destAccountId ? 'error' : ''}`}
                value={form.destAccountId}
                onChange={set('destAccountId')}
              >
                <option value="">Selecione...</option>
                {db.bankAccounts
                  .filter((a) => a.id !== form.accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          {origin && dest && (
            <div className="muted-box mb-16 flex justify-between items-center wrap gap-12">
              <div>
                <div className="text-xs text-2">De</div>
                <div className="font-bold">{origin.name}</div>
                <div className="text-xs text-2">
                  Saldo atual: {currency(accountBalance(origin, db.financialEntries))}
                </div>
              </div>
              <ArrowRight className="text-neon" />
              <div className="text-right">
                <div className="text-xs text-2">Para</div>
                <div className="font-bold">{dest.name}</div>
                <div className="text-xs text-2">
                  Saldo atual: {currency(accountBalance(dest, db.financialEntries))}
                </div>
              </div>
            </div>
          )}

          <div className="form-row cols-2">
            <Field label="Valor (R$)" required error={errors.value}>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`input ${errors.value ? 'error' : ''}`}
                value={form.value}
                onChange={set('value')}
              />
            </Field>
            <Field label="Data" required error={errors.dueDate}>
              <DateInput value={form.dueDate} onChange={set('dueDate')} />
            </Field>
          </div>

          <Field label="Descrição">
            <input className="input" value={form.description} onChange={set('description')} />
          </Field>
          <Field label="Observações">
            <textarea
              className="textarea"
              rows={2}
              value={form.notes}
              onChange={set('notes')}
            />
          </Field>
        </>
      )}
    </Modal>
  )
}
