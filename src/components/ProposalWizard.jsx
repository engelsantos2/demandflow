import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import DateInput from './DateInput'
import ClientSelect from './ClientSelect'
import { useDB, insert, update, remove, nextProposalNumber } from '../data/store'
import { useUI } from './UIProvider'
import { uid, currency, addDays } from '../lib/format'

const STEPS = ['Cliente', 'Escopo', 'Itens e valores', 'Pagamento', 'Revisão']

const blankForm = (settings) => ({
  clientId: '',
  title: '',
  description: '',
  scope: '',
  includedItems: '',
  excludedItems: '',
  deliveryTime: '',
  paymentTerms: '50% na aprovação, 50% na entrega',
  installments: 2,
  expirationDate: addDays(null, 15),
  status: 'rascunho',
  terms: settings?.defaultTerms || '',
})

const blankItem = () => ({
  id: uid('pi'),
  name: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
})

export default function ProposalWizard({ open, proposalId, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const proposal = proposalId ? db.proposals.find((p) => p.id === proposalId) : null
  const isEdit = !!proposal

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(blankForm(db.settings))
  const [items, setItems] = useState([blankItem()])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setStep(0)
    setErrors({})
    if (proposal) {
      setForm({
        clientId: proposal.clientId,
        title: proposal.title,
        description: proposal.description || '',
        scope: proposal.scope || '',
        includedItems: proposal.includedItems || '',
        excludedItems: proposal.excludedItems || '',
        deliveryTime: proposal.deliveryTime || '',
        paymentTerms: proposal.paymentTerms || '',
        installments: proposal.installments || 1,
        expirationDate: proposal.expirationDate || '',
        status: proposal.status,
        terms: proposal.terms || db.settings.defaultTerms || '',
      })
      const its = db.proposalItems.filter((i) => i.proposalId === proposal.id)
      setItems(its.length ? its.map((i) => ({ ...i })) : [blankItem()])
    } else {
      setForm(blankForm(db.settings))
      setItems([blankItem()])
    }
  }, [open, proposalId]) // eslint-disable-line

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }))

  const total = useMemo(
    () => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0),
    [items],
  )

  const setItem = (id, key, value) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, [key]: value } : i)))
  const addItem = () => setItems((list) => [...list, blankItem()])
  const removeItem = (id) =>
    setItems((list) => (list.length > 1 ? list.filter((i) => i.id !== id) : list))

  const clientName = db.clients.find((c) => c.id === form.clientId)?.name || '—'

  const validateStep = (s) => {
    const err = {}
    if (s === 0) {
      if (!form.clientId) err.clientId = 'Selecione o cliente.'
      if (!form.title.trim()) err.title = 'Informe o título da proposta.'
    }
    if (s === 2) {
      if (items.some((i) => !i.name.trim())) err.items = 'Todos os itens precisam de um nome.'
      if (total <= 0) err.items = 'A proposta precisa ter ao menos um item com valor.'
    }
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const next = () => {
    if (!validateStep(step)) return
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }
  const back = () => setStep((s) => Math.max(0, s - 1))

  const handleSave = () => {
    for (let s = 0; s <= 2; s++) {
      if (!validateStep(s)) {
        setStep(s)
        return
      }
    }
    const cleanItems = items.map((i) => ({
      name: i.name,
      description: i.description,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      totalPrice: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    }))
    const payload = {
      clientId: form.clientId,
      title: form.title,
      description: form.description,
      scope: form.scope,
      includedItems: form.includedItems,
      excludedItems: form.excludedItems,
      deliveryTime: form.deliveryTime,
      paymentTerms: form.paymentTerms,
      installments: Number(form.installments) || 1,
      expirationDate: form.expirationDate,
      status: form.status,
      terms: form.terms,
      totalValue: total,
    }

    if (isEdit) {
      update('proposals', proposal.id, payload)
      db.proposalItems
        .filter((i) => i.proposalId === proposal.id)
        .forEach((i) => remove('proposalItems', i.id))
      cleanItems.forEach((i) => insert('proposalItems', { ...i, proposalId: proposal.id }))
      toast('Proposta atualizada com sucesso')
    } else {
      const created = insert('proposals', {
        ...payload,
        number: nextProposalNumber(),
        publicToken: uid('pf'),
      })
      cleanItems.forEach((i) => insert('proposalItems', { ...i, proposalId: created.id }))
      toast('Proposta criada com sucesso')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Editar proposta` : 'Nova proposta'}
      footer={
        <>
          {step > 0 && (
            <button className="btn" style={{ marginRight: 'auto' }} onClick={back}>
              <ArrowLeft size={15} /> Voltar
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={next}>
              Próximo <ArrowRight size={15} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave}>
              <Check size={15} /> {isEdit ? 'Salvar proposta' : 'Criar proposta'}
            </button>
          )}
        </>
      }
    >
      <div className="steps">
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: 'contents' }}>
            <div className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="step-num">{i < step ? <Check size={13} /> : i + 1}</span>
              <span className="step-label">{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="step-line" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <Field label="Cliente" required error={errors.clientId}>
            <ClientSelect
              value={form.clientId}
              error={errors.clientId}
              onChange={(id) => setForm((f) => ({ ...f, clientId: id }))}
            />
          </Field>
          <Field label="Título da proposta" required error={errors.title}>
            <input
              className={`input ${errors.title ? 'error' : ''}`}
              value={form.title}
              onChange={set('title')}
              placeholder="Ex.: Desenvolvimento de site institucional"
            />
          </Field>
          <Field label="Descrição geral">
            <textarea
              className="textarea"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Resumo do que será entregue..."
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div>
          <Field label="Escopo do projeto">
            <textarea className="textarea" rows={3} value={form.scope} onChange={set('scope')}
              placeholder="Descreva o escopo do trabalho..." />
          </Field>
          <div className="form-row cols-2">
            <Field label="Itens inclusos">
              <textarea className="textarea" rows={3} value={form.includedItems} onChange={set('includedItems')}
                placeholder="O que está incluso..." />
            </Field>
            <Field label="Itens não inclusos">
              <textarea className="textarea" rows={3} value={form.excludedItems} onChange={set('excludedItems')}
                placeholder="O que não está incluso..." />
            </Field>
          </div>
          <Field label="Prazo de entrega">
            <input className="input" value={form.deliveryTime} onChange={set('deliveryTime')}
              placeholder="Ex.: 21 dias úteis" />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div>
          {errors.items && <div className="field-error mb-16">{errors.items}</div>}
          {items.map((it, idx) => {
            const itTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)
            return (
              <div key={it.id} className="muted-box" style={{ marginBottom: 10 }}>
                <div className="flex justify-between items-center mb-16">
                  <span className="text-sm font-bold">Item {idx + 1}</span>
                  <button
                    className="btn btn-sm btn-icon"
                    onClick={() => removeItem(it.id)}
                    disabled={items.length === 1}
                    title="Remover item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="form-row cols-2">
                  <Field label="Nome do item">
                    <input className="input" value={it.name}
                      onChange={(e) => setItem(it.id, 'name', e.target.value)}
                      placeholder="Ex.: Desenvolvimento" />
                  </Field>
                  <Field label="Descrição">
                    <input className="input" value={it.description}
                      onChange={(e) => setItem(it.id, 'description', e.target.value)}
                      placeholder="Detalhe do item" />
                  </Field>
                </div>
                <div className="form-row cols-3">
                  <Field label="Quantidade">
                    <input type="number" min="0" className="input" value={it.quantity}
                      onChange={(e) => setItem(it.id, 'quantity', e.target.value)} />
                  </Field>
                  <Field label="Valor unitário (R$)">
                    <input type="number" min="0" step="0.01" className="input" value={it.unitPrice}
                      onChange={(e) => setItem(it.id, 'unitPrice', e.target.value)} />
                  </Field>
                  <Field label="Total do item">
                    <input className="input" value={currency(itTotal)} disabled />
                  </Field>
                </div>
              </div>
            )
          })}
          <button className="btn btn-sm" onClick={addItem}>
            <Plus size={14} /> Adicionar item
          </button>
          <div className="muted-box mt-16 flex justify-between items-center">
            <span className="font-bold">Valor total da proposta</span>
            <span className="font-bold text-neon" style={{ fontSize: 20 }}>
              {currency(total)}
            </span>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <Field label="Forma de pagamento">
            <input className="input" value={form.paymentTerms} onChange={set('paymentTerms')}
              placeholder="Ex.: 50% na aprovação, 50% na entrega" />
          </Field>
          <div className="form-row cols-2">
            <Field label="Parcelamento (nº de parcelas)">
              <input type="number" min="1" max="24" className="input"
                value={form.installments} onChange={set('installments')} />
            </Field>
            <Field label="Validade da proposta" required>
              <DateInput value={form.expirationDate} onChange={set('expirationDate')} />
            </Field>
          </div>
          <Field label="Status">
            <select className="select" value={form.status} onChange={set('status')}>
              <option value="rascunho">Rascunho</option>
              <option value="enviada">Enviada</option>
            </select>
          </Field>
          <Field label="Termos e condições">
            <textarea className="textarea" rows={4} value={form.terms} onChange={set('terms')} />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="muted-box mb-16">
            <div className="grid cols-2" style={{ gap: 12 }}>
              <div className="kv">
                <span className="kv-label">Cliente</span>
                <span className="kv-value">{clientName}</span>
              </div>
              <div className="kv">
                <span className="kv-label">Título</span>
                <span className="kv-value">{form.title || '—'}</span>
              </div>
              <div className="kv">
                <span className="kv-label">Prazo</span>
                <span className="kv-value">{form.deliveryTime || '—'}</span>
              </div>
              <div className="kv">
                <span className="kv-label">Validade</span>
                <span className="kv-value">{form.expirationDate || '—'}</span>
              </div>
            </div>
          </div>
          <div className="card mb-16">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qtd.</th>
                    <th className="text-right">Unitário</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="font-bold">{it.name || '—'}</td>
                      <td>{it.quantity}</td>
                      <td className="text-right">{currency(it.unitPrice)}</td>
                      <td className="text-right font-bold">
                        {currency((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="muted-box flex justify-between items-center">
            <span className="font-bold">Valor total</span>
            <span className="font-bold text-neon" style={{ fontSize: 22 }}>
              {currency(total)}
            </span>
          </div>
          <p className="text-xs text-2 mt-16">
            Revise os dados e clique em {isEdit ? '"Salvar proposta"' : '"Criar proposta"'}.
            Você poderá visualizar, gerar PDF e compartilhar o link em seguida.
          </p>
        </div>
      )}
    </Modal>
  )
}
