import { addMonths, monthKey, lastDayOfMonth } from './format'

/**
 * Calcula o "due date" de um contrato em um mês específico,
 * respeitando o último dia do mês quando dayOfMonth > 28/30/31.
 */
function dayInMonth(mk, dayOfMonth) {
  const lastDay = Number(lastDayOfMonth(mk).slice(8, 10))
  const d = Math.min(Math.max(1, Number(dayOfMonth) || 1), lastDay)
  return `${mk}-${String(d).padStart(2, '0')}`
}

/**
 * Gera lançamentos VIRTUAIS de um contrato dentro de um intervalo [startMK, endMK].
 * NÃO toca o banco — retorna apenas objetos in-memory marcados com `isProjected: true`.
 * Usado em Relatórios pra projetar meses futuros (e meses passados sem entry, por
 * segurança, caso o catch-up não tenha rodado).
 */
function virtualEntriesFor(contract, startMK, endMK) {
  if (!contract.startDate) return []
  if (contract.status !== 'ativo') return []

  const ctStart = monthKey(contract.startDate)
  const ctEnd = contract.endDate ? monthKey(contract.endDate) : null
  let mk = startMK < ctStart ? ctStart : startMK
  const stop = ctEnd && ctEnd < endMK ? ctEnd : endMK

  const out = []
  let safety = 96
  while (mk <= stop && safety-- > 0) {
    out.push({
      id: `virt_${contract.id}_${mk}`,
      type: contract.type,
      description: contract.description,
      category: contract.category || (contract.type === 'receita' ? 'Serviços prestados' : 'Outros'),
      value: Number(contract.value) || 0,
      clientId: contract.clientId || '',
      demandId: '',
      proposalId: '',
      accountId: contract.accountId || '',
      dueDate: dayInMonth(mk, contract.dayOfMonth),
      paymentDate: '',
      status: 'previsto',
      paymentMethod: contract.paymentMethod || 'PIX',
      isRecurring: true,
      recurringContractId: contract.id,
      notes: 'Projeção a partir de receita fixa.',
      isProjected: true,
    })
    mk = addMonths(`${mk}-01`, 1).slice(0, 7)
  }
  return out
}

/**
 * Retorna lançamentos REAIS + VIRTUAIS para um intervalo [start, end] (datas ISO).
 *
 *  • Reais: filtra `financialEntries` por dueDate/paymentDate no intervalo.
 *  • Virtuais: para cada contrato ativo, gera entries dos meses que NÃO têm
 *    correspondente real (mesmo contractId + mesmo mês). Útil pra prever meses
 *    futuros (onde processRecurring ainda não gerou) E preencher gaps eventuais.
 *
 *  Cada entry virtual carrega `isProjected: true` e `status: 'previsto'`.
 */
export function projectedEntries(db, start, end) {
  const startMK = monthKey(start)
  const endMK = monthKey(end)
  const real = db.financialEntries.filter((e) => {
    const d = (e.paymentDate || e.dueDate || '').slice(0, 10)
    return d && d >= start && d <= end
  })

  // Indexa entries reais que JÁ vieram de contratos por (contractId, mês)
  const covered = new Set()
  for (const e of db.financialEntries) {
    if (e.recurringContractId && e.dueDate) {
      covered.add(`${e.recurringContractId}:${monthKey(e.dueDate)}`)
    }
  }

  const virtual = []
  for (const ct of db.recurringContracts || []) {
    const candidates = virtualEntriesFor(ct, startMK, endMK)
    for (const v of candidates) {
      const key = `${ct.id}:${monthKey(v.dueDate)}`
      if (covered.has(key)) continue
      // Filtra pelo intervalo de datas (caso o dia do contrato caia fora)
      const d = v.dueDate
      if (d < start || d > end) continue
      virtual.push(v)
    }
  }

  return [...real, ...virtual].sort((a, b) => {
    const da = (a.paymentDate || a.dueDate || '').localeCompare(b.paymentDate || b.dueDate || '')
    return da
  })
}

/**
 * Conveniência: agrupa entries (reais ou virtuais) por mês,
 * separando receita projetada vs realizada.
 */
export function bucketByMonth(entries, monthsKeys) {
  return monthsKeys.map((mk) => {
    const inMonth = entries.filter((e) => {
      const d = (e.paymentDate || e.dueDate || '').slice(0, 10)
      return d.slice(0, 7) === mk && e.status !== 'cancelado'
    })
    const receitaReal = inMonth
      .filter((e) => e.type === 'receita' && !e.isProjected)
      .reduce((s, e) => s + e.value, 0)
    const receitaProj = inMonth
      .filter((e) => e.type === 'receita' && e.isProjected)
      .reduce((s, e) => s + e.value, 0)
    const despesaReal = inMonth
      .filter((e) => e.type === 'despesa' && !e.isProjected)
      .reduce((s, e) => s + e.value, 0)
    const despesaProj = inMonth
      .filter((e) => e.type === 'despesa' && e.isProjected)
      .reduce((s, e) => s + e.value, 0)
    return {
      monthKey: mk,
      receitaReal,
      receitaProj,
      despesaReal,
      despesaProj,
      receitaTotal: receitaReal + receitaProj,
      despesaTotal: despesaReal + despesaProj,
      lucro: receitaReal + receitaProj - despesaReal - despesaProj,
    }
  })
}

/**
 * Soma o MRR (Monthly Recurring Revenue) ativo no momento.
 * Receita - despesa recorrente = lucro recorrente esperado.
 */
export function mrrSummary(db) {
  const contracts = (db.recurringContracts || []).filter((c) => c.status === 'ativo')
  const mrrReceita = contracts.filter((c) => c.type === 'receita').reduce((s, c) => s + Number(c.value || 0), 0)
  const mrrDespesa = contracts.filter((c) => c.type === 'despesa').reduce((s, c) => s + Number(c.value || 0), 0)
  return {
    receita: mrrReceita,
    despesa: mrrDespesa,
    liquido: mrrReceita - mrrDespesa,
    contratos: contracts.length,
  }
}
