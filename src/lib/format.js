export function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function currency(value) {
  const n = Number(value) || 0
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function compactCurrency(value) {
  const n = Number(value) || 0
  if (Math.abs(n) >= 1000) {
    return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  }
  return currency(n)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return '—'
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function daysUntil(iso) {
  if (!iso) return null
  const target = new Date(iso.slice(0, 10) + 'T00:00:00')
  const now = new Date(todayISO() + 'T00:00:00')
  return Math.round((target - now) / 86400000)
}

export function relativeDeadline(iso) {
  const d = daysUntil(iso)
  if (d === null) return '—'
  if (d < 0) return `${Math.abs(d)}d atrasada`
  if (d === 0) return 'Hoje'
  if (d === 1) return 'Amanhã'
  return `em ${d}d`
}

export function addDays(iso, n) {
  const d = new Date((iso || todayISO()) + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function addMonths(iso, n) {
  const d = new Date((iso || todayISO()) + 'T00:00:00')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(a, b) {
  if (!a || !b) return 0
  const d1 = new Date(a.slice(0, 10) + 'T00:00:00')
  const d2 = new Date(b.slice(0, 10) + 'T00:00:00')
  return Math.round((d2 - d1) / 86400000)
}

export function formatDayShort(iso) {
  if (!iso) return ''
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

export function lastDayOfMonth(monthK) {
  return addDays(addMonths(monthK + '-01', 1), -1)
}

export function monthKey(iso) {
  return (iso || '').slice(0, 7)
}

export function currentMonthKey() {
  return todayISO().slice(0, 7)
}

export function monthLabel(key) {
  const [y, m] = key.split('-')
  const names = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ]
  return `${names[Number(m) - 1] || '?'}/${(y || '').slice(2)}`
}

export function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function lastMonths(count) {
  const out = []
  const now = new Date(todayISO() + 'T00:00:00')
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}
