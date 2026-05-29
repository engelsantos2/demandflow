// Mapeamento entre os "collections" usados no app (camelCase) e as tabelas
// do Postgres no Supabase (snake_case).
//
// O nome da collection no app é o que os componentes referenciam via
// `db.collection` (ex.: `db.clients`, `db.financialEntries`). A função
// `tableOf()` resolve para o nome real da tabela no banco.

export const TABLES = {
  clients: 'clients',
  services: 'services',
  demands: 'demands',
  proposals: 'proposals',
  proposalItems: 'proposal_items',
  bankAccounts: 'bank_accounts',
  financialCategories: 'financial_categories',
  recurringContracts: 'recurring_contracts',
  financialEntries: 'financial_entries',
}

export const COLLECTIONS = Object.keys(TABLES)

export function tableOf(collection) {
  const t = TABLES[collection]
  if (!t) throw new Error(`Collection desconhecida: ${collection}`)
  return t
}

// ---------- Conversão de chaves ----------
// camelCase → snake_case
const toSnake = (s) =>
  s.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, '')

// snake_case → camelCase
const toCamel = (s) => s.replace(/_([a-z])/g, (_m, c) => c.toUpperCase())

// Converte recursivamente as chaves de um objeto plano (não mexe em valores
// que sejam objetos/arrays — apenas em chaves do nível raiz).
export function rowToObject(row) {
  if (!row || typeof row !== 'object') return row
  const out = {}
  for (const key of Object.keys(row)) {
    out[toCamel(key)] = row[key]
  }
  return out
}

export function objectToRow(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = {}
  for (const key of Object.keys(obj)) {
    // Ignora chaves auxiliares do app que não existem no banco
    if (key === 'id') {
      out.id = obj.id
      continue
    }
    out[toSnake(key)] = obj[key]
  }
  return out
}
