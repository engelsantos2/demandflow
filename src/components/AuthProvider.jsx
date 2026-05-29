// =============================================================================
// AuthProvider — sessão Supabase + carregamento NÃO-BLOQUEANTE de dados
// =============================================================================
// Estratégia:
//   • `user` é derivado DIRETAMENTE da session (não depende de profile carregar).
//     Assim o app SEMPRE abre quando há sessão válida.
//   • `loadForUser()` roda em BACKGROUND, populando o cache aos poucos.
//     Se demorar/falhar, as páginas só mostram dados vazios — não travam.
//   • `loading` reflete só a verificação inicial de sessão (~1s).
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadForUser, clearForLogout } from '../data/store'

const AuthContext = createContext(null)

const DEFAULT_PERMISSIONS = [
  'dashboard',
  'demandas',
  'clientes',
  'financeiro',
  'propostas',
  'servicos',
  'relatorios',
  'configuracoes',
]

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let loadedUserId = null

    // Função interna: dispara loadForUser em BACKGROUND.
    // Não bloqueia setLoading. Se falhar, log e segue a vida.
    const kickoffLoad = (uid) => {
      if (!uid || uid === loadedUserId) return
      loadedUserId = uid
      loadForUser(uid).catch((err) =>
        console.warn('[df] loadForUser falhou (background):', err),
      )
    }

    // 1) Verifica sessão inicial (rápido — lê localStorage)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        const sess = data.session || null
        setSession(sess)
        setLoading(false) // ← UI já pode renderizar
        if (sess?.user?.id) kickoffLoad(sess.user.id)
      })
      .catch((err) => {
        console.warn('[df] getSession falhou:', err)
        if (mounted) setLoading(false)
      })

    // 2) Reage a mudanças de sessão (login, logout)
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      // Token refresh / initial session — só atualiza session, não recarrega.
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (sess) setSession(sess)
        return
      }
      setSession(sess || null)
      if (event === 'SIGNED_IN' && sess?.user?.id) {
        kickoffLoad(sess.user.id)
      } else if (event === 'SIGNED_OUT') {
        loadedUserId = null
        clearForLogout()
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Usuário vem DIRETO da session (sempre disponível quando logado).
  // Permissões completas por default — multi-tenant simples.
  const user = useMemo(() => {
    if (!session?.user) return null
    const u = session.user
    return {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || (u.email || '').split('@')[0] || 'Usuário',
      position: u.user_metadata?.position || 'Membro',
      isAdmin: true,
      permissions: DEFAULT_PERMISSIONS,
    }
  }, [session])

  const signIn = useCallback(async (email, password) => {
    const cleanEmail = String(email || '').trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password || ''),
    })
    if (error) return { ok: false, error: traduzErroAuth(error.message) }
    return { ok: true, user: data.user }
  }, [])

  const signUp = useCallback(async ({ name, email, password, position }) => {
    const cleanName = String(name || '').trim()
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanPosition = String(position || '').trim() || 'Membro'
    const cleanPassword = String(password || '')

    if (!cleanName) return { ok: false, error: 'Informe seu nome completo.' }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return { ok: false, error: 'Informe um e-mail válido.' }
    if (cleanPassword.length < 6)
      return { ok: false, error: 'A senha precisa ter ao menos 6 caracteres.' }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: { data: { name: cleanName, position: cleanPosition } },
    })
    if (error) return { ok: false, error: traduzErroAuth(error.message) }
    if (!data.session) return { ok: true, user: data.user, needsConfirm: true }
    return { ok: true, user: data.user }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    clearForLogout()
  }, [])

  const value = useMemo(
    () => ({ user, session, loading, signIn, signUp, signOut }),
    [user, session, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function traduzErroAuth(msg) {
  const m = (msg || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed'))
    return 'Confirme seu e-mail antes de entrar.'
  if (m.includes('user already registered'))
    return 'Já existe uma conta com este e-mail.'
  if (m.includes('password should be at least'))
    return 'A senha precisa ter ao menos 6 caracteres.'
  if (m.includes('rate limit')) return 'Muitas tentativas — aguarde alguns segundos.'
  return msg || 'Não foi possível concluir.'
}
