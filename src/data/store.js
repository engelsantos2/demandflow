// =============================================================================
// Camada de dados — Supabase com cache em memória
// =============================================================================
// A API pública (useDB, insert, update, remove, updateSettings) continua
// SÍNCRONA do ponto de vista dos componentes. Por baixo:
//   1. Login dispara fetchAll() que popula o cache com tudo do user.
//   2. Cada insert/update/remove atualiza o cache primeiro (optimistic) e
//      depois envia para o Supabase em background.
//   3. Falhas são logadas (console.warn) e o usuário pode dar reload para
//      ressincronizar. No futuro, dá pra adicionar fila/retry/rollback.
// =============================================================================

import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabaseClient'
import { COLLECTIONS, tableOf, rowToObject, objectToRow } from './schema'

const listeners = new Set()

function emptyDB() {
  return {
    // "users" no app antigo armazenava a lista de membros. Agora contém
    // apenas o perfil do usuário logado (preenchido em loadProfile()).
    users: [],
    clients: [],
    services: [],
    demands: [],
    proposals: [],
    proposalItems: [],
    bankAccounts: [],
    financialCategories: [],
    recurringContracts: [],
    financialEntries: [],
    // settings vem de profiles.settings (jsonb)
    settings: {
      companyName: '',
      companyLogo: '',
      companyEmail: '',
      companyPhone: '',
      companyDocument: '',
      companyAddress: '',
      bankInfo: '',
      defaultTerms: '',
      primaryColor: '#00FF85',
      monthlyGoal: 0,
      dashboardMetrics: null,
      financeiroMetrics: null,
    },
    // metadados internos do app (não persistidos)
    _loading: false,
    _userId: null,
  }
}

let db = emptyDB()

function emit() {
  for (const fn of listeners) fn()
}

function setDBState(next) {
  db = next
  emit()
}

export function getDB() {
  return db
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useDB() {
  return useSyncExternalStore(subscribe, getDB)
}

// =============================================================================
// Carga inicial — chamado pelo AuthProvider quando há sessão ativa
// =============================================================================

export async function loadForUser(userId) {
  if (!userId) {
    setDBState({ ...emptyDB() })
    return
  }
  setDBState({ ...db, _loading: true, _userId: userId })

  // Carrega profile (settings) em paralelo com as collections
  const [profileRes, ...collectionResults] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    ...COLLECTIONS.map((c) =>
      supabase
        .from(tableOf(c))
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ),
  ])

  const next = emptyDB()
  next._userId = userId
  next._loading = false

  // Profile → users[0] + settings
  if (!profileRes.error && profileRes.data) {
    const p = profileRes.data
    next.users = [
      {
        id: p.id,
        name: p.name,
        email: p.email,
        position: p.position,
        isAdmin: p.is_admin,
        permissions: p.permissions || [],
        createdAt: p.created_at,
      },
    ]
    next.settings = { ...next.settings, ...(p.settings || {}) }
  }

  // Collections
  COLLECTIONS.forEach((c, i) => {
    const res = collectionResults[i]
    if (res.error) {
      console.warn(`[store] erro ao carregar ${c}:`, res.error.message)
      next[c] = []
      return
    }
    next[c] = (res.data || []).map(rowToObject)
  })

  setDBState(next)
}

export function clearForLogout() {
  setDBState({ ...emptyDB() })
}

// =============================================================================
// CRUD — síncrono para o app, async no fundo
// =============================================================================

// UUID v4 nativo do browser. Fallback simples (não-criptográfico) só por garantia.
function newUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function insert(collection, item) {
  const userId = db._userId
  if (!userId) {
    console.warn('[store] insert sem usuário autenticado', collection, item)
    return null
  }

  // "users" não é mais uma collection no novo modelo — é a tabela profiles
  // controlada por Supabase Auth. Gestão de equipe via Auth Admin API fica
  // para uma próxima iteração.
  if (collection === 'users') {
    console.warn(
      '[store] gestão de equipe ainda não disponível na nuvem. Use Supabase ' +
        '→ Authentication para convidar membros por enquanto.',
    )
    return null
  }

  // Otimista: monta record com id + createdAt locais e adiciona ao cache
  const record = {
    id: newUUID(),
    createdAt: new Date().toISOString(),
    ...item,
  }
  setDBState({
    ...db,
    [collection]: [record, ...(db[collection] || [])],
  })

  // Dispara no Supabase
  const row = {
    ...objectToRow(record),
    user_id: userId,
    created_at: record.createdAt,
  }
  supabase
    .from(tableOf(collection))
    .insert(row)
    .then(({ error }) => {
      if (error) {
        console.warn(`[store] insert falhou em ${collection}:`, error.message)
      }
    })

  return record
}

export function update(collection, id, patchOrFn) {
  const current = (db[collection] || []).find((x) => x.id === id)
  if (!current) {
    console.warn(`[store] update em ${collection}/${id} — registro não existe`)
    return
  }
  const patch = typeof patchOrFn === 'function' ? patchOrFn(current) : patchOrFn
  const updated = { ...current, ...patch }

  setDBState({
    ...db,
    [collection]: db[collection].map((x) => (x.id === id ? updated : x)),
  })

  // "users" → atualiza o profile correspondente (só funciona pro próprio usuário)
  if (collection === 'users') {
    const profilePatch = {}
    if ('name' in patch) profilePatch.name = patch.name
    if ('position' in patch) profilePatch.position = patch.position
    if ('isAdmin' in patch) profilePatch.is_admin = !!patch.isAdmin
    if ('permissions' in patch) profilePatch.permissions = patch.permissions
    if (Object.keys(profilePatch).length === 0) return
    supabase
      .from('profiles')
      .update(profilePatch)
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.warn('[store] update profile falhou:', error.message)
      })
    return
  }

  // Envia ao Supabase só os campos alterados — converte chaves
  const rowPatch = objectToRow(patch)
  delete rowPatch.id // nunca atualiza id
  supabase
    .from(tableOf(collection))
    .update(rowPatch)
    .eq('id', id)
    .then(({ error }) => {
      if (error) {
        console.warn(`[store] update falhou em ${collection}/${id}:`, error.message)
      }
    })
}

export function remove(collection, id) {
  if (collection === 'users') {
    console.warn(
      '[store] exclusão de usuários só pelo painel Supabase Auth por enquanto.',
    )
    return
  }
  setDBState({
    ...db,
    [collection]: db[collection].filter((x) => x.id !== id),
  })

  supabase
    .from(tableOf(collection))
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (error) {
        console.warn(`[store] remove falhou em ${collection}/${id}:`, error.message)
      }
    })
}

export function setDB(updater) {
  // Mantido por compat — usado em poucos pontos. Aplica apenas no cache local.
  const next = typeof updater === 'function' ? updater(db) : updater
  setDBState(next)
}

// =============================================================================
// Settings (profiles.settings jsonb)
// =============================================================================

export function updateSettings(patch) {
  const userId = db._userId
  const nextSettings = { ...db.settings, ...patch }
  setDBState({ ...db, settings: nextSettings })

  if (!userId) return
  supabase
    .from('profiles')
    .update({ settings: nextSettings })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.warn('[store] updateSettings falhou:', error.message)
    })
}

// =============================================================================
// Numeração de propostas
// =============================================================================

export function nextProposalNumber() {
  const max = (db.proposals || []).reduce((m, p) => Math.max(m, p.number || 0), 0)
  return max + 1
}

// =============================================================================
// Reset / Backup
// =============================================================================

export async function resetDB() {
  // Apaga TODOS os dados do usuário atual em todas as tabelas.
  const userId = db._userId
  if (!userId) return
  for (const c of COLLECTIONS) {
    const { error } = await supabase
      .from(tableOf(c))
      .delete()
      .eq('user_id', userId)
    if (error) console.warn(`[store] resetDB ${c}:`, error.message)
  }
  await loadForUser(userId)
}

export async function resetEmpty() {
  // Mesma coisa de resetDB no modelo Supabase (não tinha seed mock).
  // Os triggers SQL repopulam categorias padrão automaticamente quando
  // necessário. Aqui só zeramos tabelas de dados.
  const userId = db._userId
  if (!userId) return
  const toClear = [
    'clients',
    'services',
    'demands',
    'proposals',
    'proposalItems',
    'financialEntries',
    'bankAccounts',
    'recurringContracts',
  ]
  for (const c of toClear) {
    const { error } = await supabase
      .from(tableOf(c))
      .delete()
      .eq('user_id', userId)
    if (error) console.warn(`[store] resetEmpty ${c}:`, error.message)
  }
  await loadForUser(userId)
}

export function exportBackup() {
  return JSON.stringify({ ...db, exportedAt: new Date().toISOString() }, null, 2)
}

export async function importBackup(input) {
  const obj = typeof input === 'string' ? JSON.parse(input) : input
  if (!obj || typeof obj !== 'object') throw new Error('Arquivo de backup inválido.')
  const userId = db._userId
  if (!userId) throw new Error('Faça login antes de importar.')

  // Limpa tudo do usuário primeiro
  await resetEmpty()

  // Re-insere collection por collection. Como insert() é otimista e dispara
  // em background, vamos enviar diretamente para o Supabase em batch.
  for (const c of COLLECTIONS) {
    const items = obj[c] || []
    if (items.length === 0) continue
    const rows = items.map((it) => ({
      ...objectToRow(it),
      user_id: userId,
      id: it.id || newUUID(),
      created_at: it.createdAt || new Date().toISOString(),
    }))
    const { error } = await supabase.from(tableOf(c)).insert(rows)
    if (error) console.warn(`[store] importBackup ${c}:`, error.message)
  }

  // Settings
  if (obj.settings) {
    await supabase.from('profiles').update({ settings: obj.settings }).eq('id', userId)
  }

  await loadForUser(userId)
}

// =============================================================================
// Compat: getSession/setSession do localStorage não são mais usados — a sessão
// vive no Supabase Auth. Stubs para evitar import-error em código legado.
// =============================================================================

export function getSessionUserId() {
  return db._userId
}

export function setSessionUserId() {
  // no-op — sessão é controlada por supabase.auth
}
