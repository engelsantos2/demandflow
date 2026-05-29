export const ACCOUNT_TYPES = [
  { id: 'corrente', label: 'Conta corrente' },
  { id: 'poupanca', label: 'Conta poupança' },
  { id: 'caixa', label: 'Caixa / Dinheiro' },
  { id: 'cartao', label: 'Cartão de crédito' },
  { id: 'outros', label: 'Outros' },
]

// Saldo previsto da conta:
//   saldo inicial
// + receitas (não canceladas) vinculadas
// - despesas (não canceladas) vinculadas
// + transferências recebidas
// - transferências enviadas
export function accountBalance(account, entries) {
  if (!account) return 0
  let total = Number(account.initialBalance) || 0
  for (const e of entries) {
    if (e.status === 'cancelado') continue
    if (e.type === 'receita' && e.accountId === account.id) {
      total += e.value
    } else if (e.type === 'despesa' && e.accountId === account.id) {
      total -= e.value
    } else if (e.type === 'transferencia') {
      if (e.destAccountId === account.id) total += e.value
      if (e.accountId === account.id) total -= e.value
    }
  }
  return total
}

// Saldo total previsto: soma dos saldos das contas marcadas como
// "incluir no saldo total previsto".
export function totalForecast(accounts, entries) {
  return accounts
    .filter((a) => a.includeInTotal)
    .reduce((s, a) => s + accountBalance(a, entries), 0)
}

// Saldo REAL da conta (só considera o que efetivamente entrou/saiu):
//   saldo inicial
// + receitas com status === 'recebido'
// - despesas com status === 'pago'
// + transferências recebidas (sempre realizadas)
// - transferências enviadas (sempre realizadas)
export function accountRealBalance(account, entries) {
  if (!account) return 0
  let total = Number(account.initialBalance) || 0
  for (const e of entries) {
    if (e.status === 'cancelado') continue
    if (e.type === 'receita' && e.accountId === account.id && e.status === 'recebido') {
      total += e.value
    } else if (e.type === 'despesa' && e.accountId === account.id && e.status === 'pago') {
      total -= e.value
    } else if (e.type === 'transferencia') {
      if (e.destAccountId === account.id) total += e.value
      if (e.accountId === account.id) total -= e.value
    }
  }
  return total
}

// Saldo REAL total: soma dos saldos reais das contas marcadas como
// "incluir no saldo total".
export function totalRealBalance(accounts, entries) {
  return accounts
    .filter((a) => a.includeInTotal)
    .reduce((s, a) => s + accountRealBalance(a, entries), 0)
}
