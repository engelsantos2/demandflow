import { daysUntil } from './format'

// Status efetivo: lançamentos pendentes vencidos viram "atrasado".
export function effectiveStatus(entry) {
  if (entry.status === 'pendente') {
    const dd = daysUntil(entry.dueDate)
    if (dd !== null && dd < 0) return 'atrasado'
  }
  return entry.status
}

export function isSettled(entry) {
  return entry.status === 'recebido' || entry.status === 'pago'
}

export function isOpen(entry) {
  return entry.status === 'pendente'
}
