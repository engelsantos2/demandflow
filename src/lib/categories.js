// Helpers para resolver as categorias financeiras gerenciadas pelo usuário.
// As categorias vivem em db.financialCategories (collection v5+).
//
// Regras de escopo:
//  • scope: 'receita' aparece apenas no formulário de receita
//  • scope: 'despesa' aparece apenas no formulário de despesa
//  • scope: 'ambos'   aparece em ambos os formulários

import { defaultFinancialCategories } from '../data/seed'

export function getCategories(db) {
  return db?.financialCategories?.length
    ? db.financialCategories
    : defaultFinancialCategories()
}

/**
 * Retorna nomes únicos de categorias ATIVAS para o tipo informado.
 * Inclui categorias com scope === 'ambos'.
 * Mantém ordem alfabética e garante que 'Outros' fica por último quando existe.
 */
export function categoriesForType(db, type /* 'receita' | 'despesa' */) {
  const list = getCategories(db).filter((c) => {
    if (!c.active) return false
    if (c.scope === 'ambos') return true
    return c.scope === type
  })
  const names = Array.from(new Set(list.map((c) => c.name)))
  names.sort((a, b) => {
    if (a === 'Outros') return 1
    if (b === 'Outros') return -1
    return a.localeCompare(b, 'pt-BR')
  })
  return names
}

/**
 * Garante que a categoria associada a uma entry continue listada no select
 * mesmo quando ela foi desativada/renomeada após a criação. Devolve uma lista
 * pronta para `<option>`.
 */
export function categoriesForForm(db, type, currentValue) {
  const opts = categoriesForType(db, type)
  if (currentValue && !opts.includes(currentValue)) {
    return [currentValue, ...opts]
  }
  return opts
}
