// =============================================================================
// AuthProvider — autenticação real via Supabase Auth
// =============================================================================
// • signIn(email, password)  → Supabase signInWithPassword
// • signUp({...})            → Supabase signUp (com metadata)
// • signOut()                → encerra sessão + limpa cache
//
// Quando a sessão muda, dispara loadForUser() para popular o cache global.
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
import { useDB, loadForUser, clearForLogout } from '../data/store'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const db = useDB()
  const [session, setSession] = useState(null)
  // 'loading' enquanto verifica sessão inicial / carrega dados do usuário.
  const [loading, setLoading] = useState(true)

  // Carrega sessão inicial e escuta mudanças (login/logout em outras abas).
  // Importante: SEMPRE liberar `loading` no finally, senão um erro silencioso
  // em loadForUser deixaria o app travado num spinner eterno.
  // Também aplicamos um timeout de segurança — se loadForUser não voltar em
  // 15s, libera assim mesmo. Pior caso o cache fica vazio, mas o app abre.
  useEffect(() => {
    let mounted = true
    // Lembra qual userId já foi carregado nesta sessão da página para evitar
    // recarregar quando SIGNED_IN é re-emitido (acontece em refresh de token,
    // mudança de aba, etc.).
    let loadedUserId = null
    console.log('[df] AuthProvider mount')

    const withTimeout = (p) =>
      Promise.race([
        p,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('[df] loadForUser timeout (30s)')), 30000),
        ),
      ])

    const ensureLoaded = async (sess, source) => {
      const uid = sess?.user?.id
      if (!uid) return
      if (uid === loadedUserId) {
        console.log(`[df] ${source}: usuário já carregado, pulando`)
        return
      }
      console.log(`[df] ${source}: chamando loadForUser para`, sess.user.email)
      setLoading(true)
      try {
        await withTimeout(loadForUser(uid))
        loadedUserId = uid
        console.log(`[df] loadForUser (${source}) terminou`)
      } catch (err) {
        console.error(`[df] loadForUser falhou (${source}):`, err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        console.log('[df] getSession resolveu, session?', !!data.session)
        if (!mounted) return
        setSession(data.session || null)
        if (data.session?.user?.id) {
          await ensureLoaded(data.session, 'getSession')
        } else if (mounted) {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('[df] getSession falhou:', err)
        if (mounted) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      console.log('[df] onAuthStateChange:', event, 'session?', !!sess)
      // Ignora refresh de token completamente — não muda a sessão do app.
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (sess) setSession(sess)
        return
      }
      setSession(sess || null)
      if (event === 'SIGNED_IN') {
        await ensureLoaded(sess, 'SIGNED_IN')
      } else if (event === 'SIGNED_OUT') {
        console.log('[df] SIGNED_OUT: limpando cache')
        loadedUserId = null
        clearForLogout()
      }
    })

    return () => {
      console.log('[df] AuthProvider unmount')
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Usuário "do app" = primeiro registro da collection users (profile do logado).
  // Mantemos esse formato para os componentes que já consomem `user.permissions`,
  // `user.name`, etc.
  const user = useMemo(() => {
    if (!session) return null
    return db.users?.[0] || null
  }, [session, db.users])

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
      options: {
        data: { name: cleanName, position: cleanPosition },
      },
    })
    if (error) return { ok: false, error: traduzErroAuth(error.message) }
    // Se o projeto Supabase está com "Confirm email" ligado, o usuário precisa
    // confirmar antes de logar. Avisamos.
    if (!data.session) {
      return {
        ok: true,
        user: data.user,
        needsConfirm: true,
      }
    }
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

// Traduz mensagens comuns de erro do Supabase Auth para português.
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
