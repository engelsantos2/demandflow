import {
  addMonths,
  monthKey,
  currentMonthKey,
  lastDayOfMonth,
} from './format'
import { getDB, insert } from '../data/store'

function sameDayInMonth(mk, refIso) {
  const day = Number(refIso.slice(8, 10))
  const lastDay = Number(lastDayOfMonth(mk).slice(8, 10))
  const d = Math.min(day, lastDay)
  return `${mk}-${String(d).padStart(2, '0')}`
}

function dayInMonth(mk, dayOfMonth) {
  const lastDay = Number(lastDayOfMonth(mk).slice(8, 10))
  const d = Math.min(Math.max(1, Number(dayOfMonth) || 1), lastDay)
  return `${mk}-${String(d).padStart(2, '0')}`
}

function stripInstallment(desc) {
  return (desc || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
}

// === 1) Legado: lançamentos agrupados por recurrenceGroupId ===
// Mantém compatibilidade com o modo "Mensal recorrente" antigo do FinancialModal.
function processLegacyGroups(db, cur) {
  const groups = new Map()
  db.financialEntries.forEach((e) => {
    if (!e.isRecurring || !e.recurrenceGroupId) return
    // Entries originadas de contratos têm contractId — não entram aqui.
    if (e.recurringContractId) return
    if (!groups.has(e.recurrenceGroupId)) groups.set(e.recurrenceGroupId, [])
    groups.get(e.recurrenceGroupId).push(e)
  })

  let created = 0
  for (const list of groups.values()) {
    list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    const last = list[list.length - 1]
    if (!last?.dueDate) continue
    let mk = monthKey(last.dueDate)
    let safety = 24
    while (mk < cur && safety-- > 0) {
      mk = addMonths(`${mk}-01`, 1).slice(0, 7)
      if (mk > cur) break
      insert('financialEntries', {
        type: last.type,
        description: stripInstallment(last.description),
        category: last.category,
        value: last.value,
        clientId: last.clientId || '',
        demandId: '',
        proposalId: '',
        accountId: last.accountId || '',
        dueDate: sameDayInMonth(mk, last.dueDate),
        paymentDate: '',
        status: 'pendente',
        paymentMethod: last.paymentMethod || 'PIX',
        isRecurring: true,
        recurrenceGroupId: last.recurrenceGroupId,
        notes: 'Gerado automaticamente (lançamento recorrente).',
      })
      created++
    }
  }
  return created
}

// === 2) Novo: contratos de Receita Fixa / Despesa Recorrente ===
// Gera 1 lançamento por mês de startDate até currentMonth (inclusive),
// para cada contrato ativo. Não cria duplicatas (verifica por contractId+mês).
function processContracts(db, cur) {
  if (!db.recurringContracts?.length) return 0

  // Indexa entries existentes por (contractId, monthKey) para evitar duplicar
  const existing = new Set()
  for (const e of db.financialEntries) {
    if (e.recurringContractId && e.dueDate) {
      existing.add(`${e.recurringContractId}:${monthKey(e.dueDate)}`)
    }
  }

  let created = 0
  for (const ct of db.recurringContracts) {
    if (ct.status !== 'ativo') continue
    if (!ct.startDate) continue

    let mk = monthKey(ct.startDate)
    const endMk = ct.endDate ? monthKey(ct.endDate) : null
    let safety = 60

    while (mk <= cur && safety-- > 0) {
      if (endMk && mk > endMk) break
      const key = `${ct.id}:${mk}`
      if (!existing.has(key)) {
        insert('financialEntries', {
          type: ct.type,
          description: ct.description,
          category: ct.category || (ct.type === 'receita' ? 'Serviços prestados' : 'Outros'),
          value: Number(ct.value) || 0,
          clientId: ct.clientId || '',
          demandId: '',
          proposalId: '',
          accountId: ct.accountId || '',
          dueDate: dayInMonth(mk, ct.dayOfMonth),
          paymentDate: '',
          status: 'pendente',
          paymentMethod: ct.paymentMethod || 'PIX',
          isRecurring: true,
          recurringContractId: ct.id,
          notes:
            ct.type === 'receita'
              ? 'Receita fixa (gerado automaticamente).'
              : 'Despesa recorrente (gerado automaticamente).',
        })
        existing.add(key)
        created++
      }
      mk = addMonths(`${mk}-01`, 1).slice(0, 7)
    }
  }
  return created
}

// Garante que cada grupo recorrente E cada contrato ativo tenham lançamentos
// até o mês atual. Roda no carregamento do app.
export function processRecurring() {
  const db = getDB()
  const cur = currentMonthKey()
  const a = processLegacyGroups(db, cur)
  const b = processContracts(db, cur)
  return a + b
}

// Helper público — calcula a próxima ocorrência de um contrato a partir de um mês.
export function nextOccurrence(contract, fromMonthKey) {
  if (!contract?.startDate) return null
  let mk = fromMonthKey || monthKey(contract.startDate)
  if (mk < monthKey(contract.startDate)) mk = monthKey(contract.startDate)
  const endMk = contract.endDate ? monthKey(contract.endDate) : null
  if (endMk && mk > endMk) return null
  return {
    monthKey: mk,
    dueDate: dayInMonth(mk, contract.dayOfMonth),
  }
}
