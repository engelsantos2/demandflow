const toCents = (value) => Math.round((Number(value) || 0) * 100)
const fromCents = (value) => Math.round(value) / 100

export function dailyDepositCount(startDate, endDate) {
  if (!endDate) return 0
  const start = new Date(`${startDate || new Date().toISOString().slice(0, 10)}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.floor((end - start) / 86400000)
  return diff >= 0 ? diff + 1 : 0
}

function weightsFor(count, type, zeroEdges = false) {
  const n = Math.max(1, Number(count) || 1)
  if (type === 'decrescente') {
    return Array.from({ length: n }, (_x, i) => Math.max(zeroEdges ? 0 : 1, n - i - (zeroEdges ? 1 : 0)))
  }
  if (type === 'espelhado') {
    const mid = (n + 1) / 2
    return Array.from({ length: n }, (_x, i) => {
      const pos = i + 1
      return Math.max(zeroEdges ? 0 : 1, Math.round(mid - Math.abs(pos - mid)) - (zeroEdges ? 1 : 0))
    })
  }
  return Array.from({ length: n }, (_x, i) => (zeroEdges ? i : i + 1))
}

export function generateChallengeAmounts(
  goalAmount,
  depositCount,
  generationType = 'crescente',
  minimumAmount = 0,
) {
  const totalCents = Math.max(0, toCents(goalAmount))
  const count = Math.max(1, Math.min(1000, Number(depositCount) || 1))
  const minCents = Math.max(0, toCents(minimumAmount))
  const minimumTotal = minCents * count

  if (generationType === 'personalizado') {
    const base = Math.max(minCents, Math.floor(totalCents / count))
    const amounts = Array.from({ length: count }, () => base)
    amounts[count - 1] += totalCents - amounts.reduce((sum, value) => sum + value, 0)
    return amounts.map(fromCents)
  }

  if (minimumTotal > totalCents) {
    return Array.from({ length: count }, () => fromCents(minCents))
  }

  const baseline = Array.from({ length: count }, () => minCents)
  const remainder = totalCents - minimumTotal
  const weights = weightsFor(count, generationType, minCents > 0)
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  const amounts =
    weightTotal > 0
      ? weights.map((weight, index) => baseline[index] + Math.round((remainder * weight) / weightTotal))
      : baseline
  const diff = totalCents - amounts.reduce((sum, value) => sum + value, 0)
  amounts[amounts.length - 1] = Math.max(minCents, amounts[amounts.length - 1] + diff)
  return amounts.map(fromCents)
}

export function buildDeposits(goalAmount, depositCount, generationType, existing = [], minimumAmount = 0) {
  const amounts =
    generationType === 'personalizado' && existing.length
      ? normalizeCustomAmounts(existing.map((d) => d.amount), goalAmount, minimumAmount)
      : generateChallengeAmounts(goalAmount, depositCount, generationType, minimumAmount)

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

export function normalizeCustomAmounts(values, goalAmount, minimumAmount = 0) {
  const totalCents = Math.max(0, toCents(goalAmount))
  const minCents = Math.max(0, toCents(minimumAmount))
  const cents = (values.length ? values : [goalAmount]).map((value) => Math.max(minCents, toCents(value)))
  const minimumTotal = minCents * cents.length
  if (minimumTotal > totalCents) return cents.map(fromCents)

  let diff = totalCents - cents.reduce((sum, value) => sum + value, 0)
  if (diff >= 0) {
    cents[cents.length - 1] += diff
  } else {
    diff = Math.abs(diff)
    for (let i = cents.length - 1; i >= 0 && diff > 0; i--) {
      const removable = Math.max(0, cents[i] - minCents)
      const take = Math.min(removable, diff)
      cents[i] -= take
      diff -= take
    }
  }
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
