import { useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import Modal from './Modal'
import Field from './Field'
import DateInput from './DateInput'
import { useDB, insert, update } from '../data/store'
import { useUI } from './UIProvider'
import { currency } from '../lib/format'
import {
  buildDeposits,
  generateChallengeAmounts,
  normalizeCustomAmounts,
} from '../lib/financialChallenges'

const BLANK = {
  title: '',
  goalAmount: '',
  depositCount: 100,
  generationType: 'espelhado',
  frequency: 'livre',
  startDate: '',
  endDate: '',
  status: 'andamento',
  deposits: [],
}

export default function FinancialChallengeModal({ open, challengeId, onClose }) {
  const db = useDB()
  const { toast } = useUI()
  const challenge = challengeId
    ? db.financialChallenges.find((item) => item.id === challengeId)
    : null
  const isEdit = !!challenge

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [customValues, setCustomValues] = useState([])

  useEffect(() => {
    if (!open) return
    setErrors({})
    const next = challenge ? { ...BLANK, ...challenge } : BLANK
    setForm(next)
    const source =
      challenge?.deposits?.length
        ? challenge.deposits.map((d) => d.amount)
        : generateChallengeAmounts(next.goalAmount || 10000, next.depositCount, next.generationType)
    setCustomValues(source)
  }, [open, challengeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (event) => {
    const value = event.target.value
    setForm((current) => ({ ...current, [key]: value }))
  }

  const previewValues = useMemo(() => {
    if (!open) return []
    if (form.generationType === 'personalizado') {
      const count = Math.max(1, Number(form.depositCount) || 1)
      const normalized = Array.from({ length: count }, (_x, i) => customValues[i] ?? 0)
      return normalizeCustomAmounts(normalized, form.goalAmount)
    }
    return generateChallengeAmounts(form.goalAmount, form.depositCount, form.generationType)
  }, [open, form.goalAmount, form.depositCount, form.generationType, customValues])

  useEffect(() => {
    if (!open || form.generationType !== 'personalizado') return
    const count = Math.max(1, Number(form.depositCount) || 1)
    setCustomValues((values) => {
      const next = [...values]
      while (next.length < count) next.push(0)
      return next.slice(0, count)
    })
  }, [open, form.generationType, form.depositCount])

  const totalPreview = previewValues.reduce((sum, value) => sum + Number(value || 0), 0)

  const validate = () => {
    const err = {}
    if (!form.title.trim()) err.title = 'Informe o nome do desafio.'
    if (Number(form.goalAmount) <= 0) err.goalAmount = 'Informe uma meta maior que zero.'
    if (Number(form.depositCount) <= 0) err.depositCount = 'Informe pelo menos 1 depósito.'
    if (Number(form.depositCount) > 1000) err.depositCount = 'Use no máximo 1000 células.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const regenerateCustom = () => {
    setCustomValues(generateChallengeAmounts(form.goalAmount, form.depositCount, 'crescente'))
  }

  const handleSave = () => {
    if (!validate()) return
    const goalAmount = Number(form.goalAmount) || 0
    const depositCount = Number(form.depositCount) || 1
    const baseValues = form.generationType === 'personalizado' ? previewValues : []
    const deposits = buildDeposits(
      goalAmount,
      depositCount,
      form.generationType,
      isEdit
        ? (challenge.deposits || []).map((deposit, index) => ({
            ...deposit,
            amount: form.generationType === 'personalizado' ? baseValues[index] : deposit.amount,
          }))
        : baseValues.map((amount, index) => ({ id: `dep_${index + 1}`, amount })),
    )

    const payload = {
      title: form.title.trim(),
      goalAmount,
      depositCount,
      generationType: form.generationType,
      frequency: form.frequency,
      startDate: form.startDate || '',
      endDate: form.endDate || '',
      status: form.status === 'pausado' ? 'pausado' : 'andamento',
      deposits,
      updatedAt: new Date().toISOString(),
    }

    if (isEdit) {
      update('financialChallenges', challenge.id, payload)
      toast('Desafio atualizado com sucesso')
    } else {
      insert('financialChallenges', payload)
      toast('Desafio criado com sucesso')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar desafio financeiro' : 'Novo desafio financeiro'}
      size="xl"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> {isEdit ? 'Salvar alterações' : 'Criar desafio'}
          </button>
        </>
      }
    >
      <div className="form-row cols-2">
        <Field label="Nome do desafio" required error={errors.title}>
          <input
            className={`input ${errors.title ? 'error' : ''}`}
            value={form.title}
            onChange={set('title')}
            placeholder="Ex.: Desafio dos R$ 10.000"
          />
        </Field>
        <Field label="Valor da meta final" required error={errors.goalAmount}>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`input ${errors.goalAmount ? 'error' : ''}`}
            value={form.goalAmount}
            onChange={set('goalAmount')}
            placeholder="10000"
          />
        </Field>
      </div>

      <div className="form-row cols-3">
        <Field label="Quantidade de células" required error={errors.depositCount}>
          <input
            type="number"
            min="1"
            max="1000"
            className={`input ${errors.depositCount ? 'error' : ''}`}
            value={form.depositCount}
            onChange={set('depositCount')}
          />
        </Field>
        <Field label="Tipo de geração">
          <select className="select" value={form.generationType} onChange={set('generationType')}>
            <option value="crescente">Crescente</option>
            <option value="decrescente">Decrescente</option>
            <option value="espelhado">Espelhado</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </Field>
        <Field label="Frequência sugerida">
          <select className="select" value={form.frequency} onChange={set('frequency')}>
            <option value="diario">Diário</option>
            <option value="semanal">Semanal</option>
            <option value="livre">Livre</option>
          </select>
        </Field>
      </div>

      <div className="form-row cols-3">
        <Field label="Data inicial">
          <DateInput value={form.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="Data final">
          <DateInput value={form.endDate} onChange={set('endDate')} />
        </Field>
        <Field label="Status">
          <select className="select" value={form.status} onChange={set('status')}>
            <option value="andamento">Em andamento</option>
            <option value="pausado">Pausado</option>
          </select>
        </Field>
      </div>

      {form.generationType === 'personalizado' && (
        <div className="panel challenge-custom-panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Valores personalizados</div>
              <div className="panel-sub">
                Edite os depósitos. O último valor é ajustado para fechar a meta.
              </div>
            </div>
            <button className="btn btn-sm" onClick={regenerateCustom}>
              <RefreshCw size={14} /> Gerar base
            </button>
          </div>
          <div className="challenge-custom-grid">
            {previewValues.map((value, index) => (
              <label key={index} className="challenge-mini-field">
                <span>#{index + 1}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={customValues[index] ?? value}
                  onChange={(event) => {
                    const amount = event.target.value
                    setCustomValues((values) => {
                      const next = [...values]
                      next[index] = amount
                      return next
                    })
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="challenge-preview panel">
        <div>
          <div className="text-xs text-2">Prévia da tabela</div>
          <strong>{previewValues.length} depósitos</strong>
        </div>
        <div>
          <div className="text-xs text-2">Soma gerada</div>
          <strong className="text-neon">{currency(totalPreview)}</strong>
        </div>
        <div>
          <div className="text-xs text-2">Meta configurada</div>
          <strong>{currency(form.goalAmount)}</strong>
        </div>
      </div>
    </Modal>
  )
}
