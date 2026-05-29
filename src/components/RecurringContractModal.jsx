import { useEffect, useState } from 'react'
import { Check, ArrowUpCircle, ArrowDownCircle, Repeat } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import DateInput from './DateInput'
import ClientSelect from './ClientSelect'
import { useDB, insert, update, getDB } from '../data/store'
import { useUI } from './UIProvider'
import { todayISO, lastDayOfMonth, monthKey } from '../lib/format'
import { PAYMENT_METHODS, CONTRACT_STATUS } from '../lib/constants'
import { categoriesForForm } from '../lib/categories'
import { processRecurring } from '../lib/recurring'

// Calcula o dueDate de um entry para um mês 'YYYY-MM' usando o dayOfMonth.
function dayInMonth(mk, dayOfMonth) {
  const lastDay = Number(lastDayOfMonth(mk).slice(8, 10))
  const d = Math.min(Math.max(1, Number(dayOfMonth) || 1), lastDay)
  return `${mk}-${String(d).padStart(2, '0')}`
}

const BLANK = {
  type: 'receita',
  clientId: '',
  description: '',
  category: 'Serviços prestados',
  value: '',
  dayOfMonth: 5,
  startDate: todayISO(),
  endDate: '',
  status: 'ativo',
  paymentMethod: 'PIX',
  accountId: '',
  notes: '',
}

export default function RecurringContractModal({ open, contractId, defaultType, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const contract = contractId
    ? db.recurringContracts.find((c) => c.id === contractId)
    : null
  const isEdit = !!contract

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (contract) {
      setForm({ ...BLANK, ...contract })
    } else {
      const firstAccount = db.bankAccounts[0]?.id || ''
      const type = defaultType || 'receita'
      const opts = categoriesForForm(db, type, '')
      setForm({
        ...BLANK,
        type,
        accountId: firstAccount,
        category: opts[0] || '',
      })
    }
  }, [open, contractId, defaultType]) // eslint-disable-line

  const set = (key) => (e) => {
    const v = e.target ? e.target.value : e
    setForm((f) => ({ ...f, [key]: v }))
  }

  const validate = () => {
    const err = {}
    if (!form.description.trim()) err.description = 'Informe a descrição.'
    if (form.value === '' || Number(form.value) <= 0) err.value = 'Informe um valor válido.'
    if (!form.startDate) err.startDate = 'Informe a data inicial.'
    const day = Number(form.dayOfMonth)
    if (!day || day < 1 || day > 31) err.dayOfMonth = 'Dia entre 1 e 31.'
    if (form.endDate && form.endDate < form.startDate)
      err.endDate = 'A data final deve ser posterior à inicial.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      ...form,
      value: Number(form.value),
      dayOfMonth: Number(form.dayOfMonth),
    }

    if (isEdit) {
      update('recurringContracts', contract.id, payload)
      // Propaga alteração para TODOS os lançamentos vinculados (anteriores e futuros).
      // Preserva status e paymentDate de cada um — só atualiza os campos editáveis.
      const linked = getDB().financialEntries.filter(
        (e) => e.recurringContractId === contract.id,
      )
      let touched = 0
      for (const e of linked) {
        const isSettled = e.status === 'recebido' || e.status === 'pago'
        // Para entries futuros (não quitados) ajusta dueDate ao novo dayOfMonth.
        // Para quitados, mantém o dueDate original (provavelmente já está quitado naquele dia).
        const mk = monthKey(e.dueDate)
        const newDue = isSettled ? e.dueDate : dayInMonth(mk, payload.dayOfMonth)
        update('financialEntries', e.id, {
          type: payload.type,
          description: payload.description,
          category: payload.category,
          value: payload.value,
          clientId: payload.clientId || '',
          accountId: payload.accountId || '',
          paymentMethod: payload.paymentMethod || 'PIX',
          dueDate: newDue,
        })
        touched++
      }
      toast(
        touched > 0
          ? `Contrato atualizado e propagado para ${touched} lançamento(s)`
          : 'Contrato atualizado',
      )
    } else {
      insert('recurringContracts', payload)
      toast('Contrato criado — lançamentos serão gerados automaticamente')
    }

    // Roda o processador para gerar/atualizar entries imediatamente
    try {
      processRecurring()
    } catch (err) {
      console.warn('processRecurring falhou após salvar contrato:', err)
    }

    onClose()
  }

  const title = isEdit
    ? 'Editar contrato recorrente'
    : form.type === 'receita'
      ? 'Nova receita fixa'
      : 'Nova despesa recorrente'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> {isEdit ? 'Salvar alterações' : 'Criar contrato'}
          </button>
        </>
      }
    >
      <div className="muted-box mb-16 flex items-center gap-12">
        <Repeat size={18} className="text-neon" />
        <div>
          <div className="font-bold text-sm">Contrato recorrente</div>
          <div className="text-xs text-2">
            Um lançamento será gerado automaticamente todo mês a partir da data inicial.
            Você pode pausar a qualquer momento para interromper a geração.
          </div>
        </div>
      </div>

      <Field label="Tipo">
        <div className="segmented">
          <button
            type="button"
            className={form.type === 'receita' ? 'active' : ''}
            onClick={() => {
              const opts = categoriesForForm(db, 'receita', '')
              setForm((f) => ({
                ...f,
                type: 'receita',
                category: opts.includes(f.category) ? f.category : opts[0] || '',
              }))
            }}
          >
            <ArrowUpCircle size={13} style={{ verticalAlign: -2 }} /> Receita fixa
          </button>
          <button
            type="button"
            className={form.type === 'despesa' ? 'active' : ''}
            onClick={() => {
              const opts = categoriesForForm(db, 'despesa', '')
              setForm((f) => ({
                ...f,
                type: 'despesa',
                category: opts.includes(f.category) ? f.category : opts[0] || '',
              }))
            }}
          >
            <ArrowDownCircle size={13} style={{ verticalAlign: -2 }} /> Despesa recorrente
          </button>
        </div>
      </Field>

      <Field label="Descrição" required error={errors.description}>
        <input
          className={`input ${errors.description ? 'error' : ''}`}
          value={form.description}
          onChange={set('description')}
          placeholder={
            form.type === 'receita'
              ? 'Ex.: Mensalidade gestão de tráfego'
              : 'Ex.: Assinatura ferramenta'
          }
        />
      </Field>

      <div className="form-row cols-2">
        <Field label="Valor mensal (R$)" required error={errors.value}>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`input ${errors.value ? 'error' : ''}`}
            value={form.value}
            onChange={set('value')}
            placeholder="0,00"
          />
        </Field>
        <Field label="Categoria">
          <select className="select" value={form.category} onChange={set('category')}>
            {categoriesForForm(db, form.type, form.category).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="form-row cols-3">
        <Field
          label="Dia do vencimento"
          required
          error={errors.dayOfMonth}
          hint="Dia do mês em que o lançamento é criado."
        >
          <input
            type="number"
            min="1"
            max="31"
            className={`input ${errors.dayOfMonth ? 'error' : ''}`}
            value={form.dayOfMonth}
            onChange={set('dayOfMonth')}
          />
        </Field>
        <Field label="Data inicial" required error={errors.startDate}>
          <DateInput
            className={`input ${errors.startDate ? 'error' : ''}`}
            value={form.startDate}
            onChange={set('startDate')}
          />
        </Field>
        <Field
          label="Data final (opcional)"
          error={errors.endDate}
          hint="Deixe em branco para contrato sem prazo."
        >
          <DateInput
            className={`input ${errors.endDate ? 'error' : ''}`}
            value={form.endDate}
            onChange={set('endDate')}
          />
        </Field>
      </div>

      <div className="form-row cols-3">
        <Field label="Status">
          <select className="select" value={form.status} onChange={set('status')}>
            {CONTRACT_STATUS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Forma de pagamento">
          <select className="select" value={form.paymentMethod} onChange={set('paymentMethod')}>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Conta bancária">
          <select className="select" value={form.accountId} onChange={set('accountId')}>
            <option value="">— Nenhuma —</option>
            {db.bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Cliente">
        <ClientSelect
          value={form.clientId}
          emptyLabel="— Nenhum —"
          onChange={(id) => setForm((f) => ({ ...f, clientId: id }))}
        />
      </Field>

      <Field label="Observações">
        <textarea className="textarea" rows={2} value={form.notes} onChange={set('notes')} />
      </Field>
    </Modal>
  )
}
