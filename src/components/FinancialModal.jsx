import { useEffect, useMemo, useState } from 'react'
import { Check, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import DateInput from './DateInput'
import ClientSelect from './ClientSelect'
import { useDB, insert, update } from '../data/store'
import { useUI } from './UIProvider'
import { todayISO, addMonths, uid, currency } from '../lib/format'
import { PAYMENT_METHODS } from '../lib/constants'
import { categoriesForForm } from '../lib/categories'
import { processRecurring } from '../lib/recurring'

const BLANK = {
  type: 'receita',
  description: '',
  value: '',
  category: 'Serviços prestados',
  clientId: '',
  demandId: '',
  proposalId: '',
  accountId: '',
  dueDate: todayISO(),
  paymentDate: '',
  status: 'pendente',
  paymentMethod: 'PIX',
  isRecurring: false,
  notes: '',
}

export default function FinancialModal({ open, entryId, defaultType, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const entry = entryId ? db.financialEntries.find((e) => e.id === entryId) : null
  const isEdit = !!entry

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [mode, setMode] = useState('unico')
  const [count, setCount] = useState(2)
  // Cada parcela: { date: 'YYYY-MM-DD', value: number, customized: boolean }
  const [installments, setInstallments] = useState([])

  useEffect(() => {
    if (!open) return
    setErrors({})
    setMode('unico')
    setCount(2)
    setInstallments([])
    if (entry) {
      setForm({ ...BLANK, ...entry })
    } else {
      // Prefere a conta marcada como principal; cai pra primeira se não houver.
      const primary = db.bankAccounts.find((a) => a.isPrimary)
      const defaultAccount = primary?.id || db.bankAccounts[0]?.id || ''
      const type = defaultType || 'receita'
      const opts = categoriesForForm(db, type, '')
      setForm({
        ...BLANK,
        type,
        accountId: defaultAccount,
        category: opts[0] || '',
      })
    }
  }, [open, entryId, defaultType]) // eslint-disable-line

  // Gera parcelas default (mensais, valor dividido igual) quando o modo é "parcelado"
  // e os parâmetros relevantes mudam — preservando parcelas já customizadas.
  useEffect(() => {
    if (mode !== 'parcelado') return
    const n = Math.max(2, Math.min(36, Number(count) || 2))
    const baseValue = Number(form.value) || 0
    const baseDate = form.dueDate
    const cents = Math.round(baseValue * 100)
    const per = Math.floor(cents / n)
    setInstallments((prev) => {
      const next = []
      for (let i = 0; i < n; i++) {
        const existing = prev[i]
        const defaultValue = i === n - 1 ? (cents - per * (n - 1)) / 100 : per / 100
        const defaultDate = baseDate ? addMonths(baseDate, i) : ''
        if (existing?.customized) {
          next.push(existing)
        } else {
          next.push({ date: defaultDate, value: defaultValue, customized: false })
        }
      }
      return next
    })
  }, [mode, count, form.value, form.dueDate])

  const installmentTotal = useMemo(
    () => installments.reduce((s, i) => s + (Number(i.value) || 0), 0),
    [installments],
  )
  const installmentDiff = Math.round(
    ((Number(form.value) || 0) - installmentTotal) * 100,
  )

  const updateInstallment = (idx, patch) => {
    setInstallments((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, ...patch, customized: true } : it,
      ),
    )
  }

  const resetInstallments = () => {
    setInstallments([])
    // O useEffect acima vai recalcular default ao re-render
    setCount((c) => c)
  }

  // Divide o "resto" (form.value - soma) na última parcela
  const balanceLastParcel = () => {
    const baseCents = Math.round((Number(form.value) || 0) * 100)
    const sumExceptLast = installments
      .slice(0, -1)
      .reduce((s, i) => s + Math.round((Number(i.value) || 0) * 100), 0)
    const lastValue = (baseCents - sumExceptLast) / 100
    setInstallments((prev) =>
      prev.map((it, i) =>
        i === prev.length - 1 ? { ...it, value: lastValue, customized: true } : it,
      ),
    )
  }

  const set = (key) => (e) => {
    const v = e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
    setForm((f) => ({ ...f, [key]: v }))
  }

  const settledLabel = form.type === 'receita' ? 'Recebido' : 'Pago'
  const settledValue = form.type === 'receita' ? 'recebido' : 'pago'

  const validate = () => {
    const err = {}
    if (!form.description.trim()) err.description = 'Informe a descrição.'
    if (form.value === '' || Number(form.value) <= 0) err.value = 'Informe um valor válido.'
    if (!form.dueDate) err.dueDate = 'Informe a data de vencimento.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const value = Number(form.value)
    const base = {
      ...form,
      value,
      status: form.status === 'atrasado' ? 'pendente' : form.status,
    }
    // garante data de pagamento quando quitado
    if ((base.status === 'recebido' || base.status === 'pago') && !base.paymentDate) {
      base.paymentDate = todayISO()
    }

    if (isEdit) {
      if (base.isRecurring && !base.recurrenceGroupId) {
        base.recurrenceGroupId = uid('rg')
      }
      update('financialEntries', entry.id, base)
      toast('Lançamento atualizado com sucesso')
    } else if (mode === 'unico') {
      if (base.isRecurring && !base.recurrenceGroupId) {
        base.recurrenceGroupId = uid('rg')
      }
      insert('financialEntries', base)
      toast('Lançamento criado com sucesso')
    } else if (mode === 'parcelado') {
      // Valida que cada parcela tem data e valor > 0
      const errs = {}
      installments.forEach((it, i) => {
        if (!it.date) errs[`p${i}_date`] = 'Data obrigatória.'
        if (!(Number(it.value) > 0)) errs[`p${i}_value`] = 'Valor > 0.'
      })
      if (Math.abs(installmentDiff) > 1) {
        errs.parcelas = `A soma das parcelas (${currency(installmentTotal)}) precisa bater com o valor total (${currency(value)}).`
      }
      if (Object.keys(errs).length > 0) {
        setErrors((e) => ({ ...e, ...errs }))
        toast('Revise as parcelas antes de salvar', 'error')
        return
      }
      const n = installments.length
      installments.forEach((it, i) => {
        insert('financialEntries', {
          ...base,
          value: Number(it.value),
          dueDate: it.date,
          paymentDate: '',
          status: 'pendente',
          description: `${form.description} (${i + 1}/${n})`,
          isRecurring: false,
        })
      })
      toast(`${n} parcelas criadas com sucesso`)
    } else {
      // mode === 'mensal' — cria um contrato recorrente CONTÍNUO.
      // Não pede mais "quantidade de meses": o sistema gera todo mês até o
      // usuário editar/remover o contrato.
      const dayOfMonth = Number((form.dueDate || todayISO()).slice(8, 10)) || 1
      insert('recurringContracts', {
        type: base.type,
        clientId: base.clientId || '',
        description: form.description,
        category: base.category,
        value,
        dayOfMonth,
        startDate: form.dueDate,
        endDate: '',
        status: 'ativo',
        paymentMethod: base.paymentMethod || 'PIX',
        accountId: base.accountId || '',
        notes: base.notes || '',
      })
      // Gera lançamentos imediatamente (do mês inicial até o atual).
      try {
        processRecurring()
      } catch (err) {
        console.warn('processRecurring após criação de contrato:', err)
      }
      toast('Lançamento mensal recorrente criado — será gerado todo mês')
    }
    onClose()
  }

  const title = isEdit
    ? 'Editar lançamento'
    : form.type === 'receita'
      ? 'Nova receita'
      : 'Nova despesa'

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
            <Check size={15} /> {isEdit ? 'Salvar alterações' : 'Criar lançamento'}
          </button>
        </>
      }
    >
      <Field label="Tipo de lançamento">
        <div className="segmented">
          <button
            type="button"
            className={form.type === 'receita' ? 'active' : ''}
            onClick={() => {
              const opts = categoriesForForm(db, 'receita', '')
              setForm((f) => ({
                ...f,
                type: 'receita',
                status: 'pendente',
                category: opts.includes(f.category) ? f.category : opts[0] || '',
              }))
            }}
          >
            <ArrowUpCircle size={13} style={{ verticalAlign: -2 }} /> Receita
          </button>
          <button
            type="button"
            className={form.type === 'despesa' ? 'active' : ''}
            onClick={() => {
              const opts = categoriesForForm(db, 'despesa', '')
              setForm((f) => ({
                ...f,
                type: 'despesa',
                status: 'pendente',
                category: opts.includes(f.category) ? f.category : opts[0] || '',
              }))
            }}
          >
            <ArrowDownCircle size={13} style={{ verticalAlign: -2 }} /> Despesa
          </button>
        </div>
      </Field>

      <Field label="Descrição" required error={errors.description}>
        <input
          className={`input ${errors.description ? 'error' : ''}`}
          value={form.description}
          onChange={set('description')}
          placeholder={form.type === 'receita' ? 'Ex.: Projeto site institucional' : 'Ex.: Assinatura de ferramenta'}
        />
      </Field>

      <div className="form-row cols-2">
        <Field label="Valor (R$)" required error={errors.value}>
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

      <div className="form-row cols-2">
        <Field label="Data de vencimento" required error={errors.dueDate}>
          <DateInput
            className={`input ${errors.dueDate ? 'error' : ''}`}
            value={form.dueDate}
            onChange={set('dueDate')}
          />
        </Field>
        <Field label="Data de pagamento" hint="Preenchida ao marcar como quitado.">
          <DateInput value={form.paymentDate} onChange={set('paymentDate')} />
        </Field>
      </div>

      <div className="form-row cols-3">
        <Field label="Status">
          <select className="select" value={form.status} onChange={set('status')}>
            <option value="pendente">Pendente</option>
            <option value={settledValue}>{settledLabel}</option>
            <option value="cancelado">Cancelado</option>
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

      <div className="form-row cols-3">
        <Field label="Cliente">
          <ClientSelect
            value={form.clientId}
            emptyLabel="— Nenhum —"
            onChange={(id) => setForm((f) => ({ ...f, clientId: id }))}
          />
        </Field>
        <Field label="Demanda vinculada">
          <select className="select" value={form.demandId} onChange={set('demandId')}>
            <option value="">— Nenhuma —</option>
            {db.demands.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Proposta vinculada">
          <select className="select" value={form.proposalId} onChange={set('proposalId')}>
            <option value="">— Nenhuma —</option>
            {db.proposals.map((p) => (
              <option key={p.id} value={p.id}>
                #{String(p.number).padStart(3, '0')} — {p.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!isEdit && (
        <div className="muted-box">
          <span className="label" style={{ marginBottom: 8, display: 'block' }}>
            Repetição
          </span>
          <div className="segmented" style={{ marginBottom: mode === 'unico' ? 0 : 12 }}>
            <button type="button" className={mode === 'unico' ? 'active' : ''} onClick={() => setMode('unico')}>
              Único
            </button>
            <button type="button" className={mode === 'parcelado' ? 'active' : ''} onClick={() => setMode('parcelado')}>
              Parcelado
            </button>
            <button type="button" className={mode === 'mensal' ? 'active' : ''} onClick={() => setMode('mensal')}>
              Mensal recorrente
            </button>
          </div>
          {mode === 'parcelado' && (
            <>
              <div className="form-row cols-2" style={{ alignItems: 'end' }}>
                <Field
                  label="Número de parcelas"
                  hint="Default: divide o valor igualmente e distribui um mês entre cada parcela."
                >
                  <input
                    type="number"
                    min="2"
                    max="36"
                    className="input"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                </Field>
                <div className="flex gap-8 wrap" style={{ paddingBottom: 14 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={resetInstallments}
                    title="Redistribuir igualmente e mês a mês"
                  >
                    <RefreshCw size={13} /> Redefinir
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={balanceLastParcel}
                    title="Coloca o restante na última parcela"
                  >
                    Ajustar última
                  </button>
                </div>
              </div>

              <div
                className="muted-box"
                style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}
              >
                <table
                  className="table"
                  style={{ fontSize: 13, marginBottom: 0 }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: 50, paddingLeft: 16 }}>#</th>
                      <th>Data</th>
                      <th className="text-right" style={{ paddingRight: 16 }}>
                        Valor (R$)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((it, i) => (
                      <tr key={i}>
                        <td style={{ paddingLeft: 16, color: 'var(--body-muted)' }}>
                          {i + 1}/{installments.length}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <DateInput
                            value={it.date}
                            onChange={(e) =>
                              updateInstallment(i, { date: e.target.value })
                            }
                          />
                          {errors[`p${i}_date`] && (
                            <div className="field-error">{errors[`p${i}_date`]}</div>
                          )}
                        </td>
                        <td style={{ padding: '6px 16px 6px 8px' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input text-right"
                            value={it.value}
                            onChange={(e) =>
                              updateInstallment(i, { value: e.target.value })
                            }
                            style={{ textAlign: 'right' }}
                          />
                          {errors[`p${i}_value`] && (
                            <div className="field-error">{errors[`p${i}_value`]}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid var(--hairline)' }}>
                      <td style={{ paddingLeft: 16 }} colSpan={2}>
                        <div className="flex items-center gap-8">
                          <span className="text-2 text-xs">Soma das parcelas:</span>
                          <strong>{currency(installmentTotal)}</strong>
                          {Math.abs(installmentDiff) > 1 && (
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#fca5a5',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                              }}
                              title="A soma precisa bater com o valor total"
                            >
                              <AlertTriangle size={11} /> Diferença{' '}
                              {currency((installmentDiff / 100) * 1)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right" style={{ paddingRight: 16 }}>
                        <span className="text-2 text-xs">Total esperado:</span>{' '}
                        <strong className="text-neon">{currency(Number(form.value) || 0)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {errors.parcelas && (
                <div className="field-error mt-8">{errors.parcelas}</div>
              )}
              <p className="text-xs text-2 mt-8">
                Dica: para "50% no início e 50% no final", use 2 parcelas e ajuste as
                datas conforme combinado com o cliente.
              </p>
            </>
          )}
          {mode === 'mensal' && (
            <div
              className="muted-box"
              style={{
                background: 'rgba(0,255,133,0.06)',
                borderColor: 'rgba(0,255,133,0.2)',
              }}
            >
              <div className="text-sm font-bold mb-8">Lançamento mensal contínuo</div>
              <div className="text-xs text-2">
                Será gerado automaticamente todos os meses no mesmo dia do vencimento
                informado, sem prazo definido. Para interromper, edite ou remova
                o lançamento e escolha "Toda a recorrência".
              </div>
            </div>
          )}
        </div>
      )}

      {isEdit && (
        <label className="checkbox mt-8">
          <input type="checkbox" checked={!!form.isRecurring} onChange={set('isRecurring')} />
          Lançamento recorrente
        </label>
      )}

      <Field label="Observações">
        <textarea className="textarea" rows={2} value={form.notes} onChange={set('notes')} />
      </Field>
    </Modal>
  )
}
