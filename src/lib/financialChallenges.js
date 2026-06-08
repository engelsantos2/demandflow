const toCents = (value) => Math.round((Number(value) || 0) * 100)
const fromCents = (value) => Math.round(value) / 100

function weightsFor(count, type) {
  const n = Math.max(1, Number(count) || 1)
  if (type === 'decrescente') {
    return Array.from({ length: n }, (_x, i) => n - i)
  }
  if (type === 'espelhado') {
    const mid = (n + 1) / 2
    return Array.from({ length: n }, (_x, i) => {
      const pos = i + 1
      return Math.max(1, Math.round(mid - Math.abs(pos - mid)))
    })
  }
  return Array.from({ length: n }, (_x, i) => i + 1)
}

export function generateChallengeAmounts(goalAmount, depositCount, generationType = 'crescente') {
  const totalCents = Math.max(0, toCents(goalAmount))
  const count = Math.max(1, Math.min(1000, Number(depositCount) || 1))

  if (generationType === 'personalizado') {
    const base = Math.floor(totalCents / count)
    const amounts = Array.from({ length: count }, () => base)
    amounts[count - 1] += totalCents - amounts.reduce((sum, value) => sum + value, 0)
    return amounts.map(fromCents)
  }

  const weights = weightsFor(count, generationType)
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  const amounts = weights.map((weight) => Math.max(1, Math.round((totalCents * weight) / weightTotal)))
  const diff = totalCents - amounts.reduce((sum, value) => sum + value, 0)
  amounts[amounts.length - 1] = Math.max(0, amounts[amounts.length - 1] + diff)
  return amounts.map(fromCents)
}

export function buildDeposits(goalAmount, depositCount, generationType, existing = []) {
  const amounts =
    generationType === 'personalizado' && existing.length
      ? normalizeCustomAmounts(existing.map((d) => d.amount), goalAmount)
      : generateChallengeAmounts(goalAmount, depositCount, generationType)

  return amounts.map((amount, index) => {
    const old = existing[index]
    return {
      id: old?.id || `dep_${index + 1}_${Math.random().toString(36).slice(2, 8)}`,
      amount,
      paid: !!old?.paid,
      paidAt: old?.paidAt || null,
    }
  })
}

export function normalizeCustomAmounts(values, goalAmount) {
  const totalCents = Math.max(0, toCents(goalAmount))
  const cents = (values.length ? values : [goalAmount]).map((value) => Math.max(0, toCents(value)))
  const diff = totalCents - cents.reduce((sum, value) => sum + value, 0)
  cents[cents.length - 1] = Math.max(0, cents[cents.length - 1] + diff)
  return cents.map(fromCents)
}

export function challengeStats(challenge) {
  const deposits = challenge?.deposits || []
  const goal = Number(challenge?.goalAmount) || deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0)
  const deposited = deposits
    .filter((d) => d.paid)
    .reduce((sum, d) => sum + Number(d.amount || 0), 0)
  const completed = deposits.filter((d) => d.paid).length
  const pending = Math.max(0, deposits.length - completed)
  const remaining = Math.max(0, goal - deposited)
  const percentage = goal > 0 ? Math.min(100, Math.round((deposited / goal) * 100)) : 0
  const status = challenge?.status === 'pausado' ? 'pausado' : percentage >= 100 ? 'concluido' : 'andamento'

  return {
    goal,
    deposited,
    remaining,
    completed,
    pending,
    percentage,
    status,
  }
}
