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

    const withTimeout = (p) =>
      Promise.race([
        p,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('[auth] loadForUser timeout (15s)')), 15000),
        ),
      ])

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return
        setSession(data.session || null)
        if (data.session?.user?.id) {
          try {
            await withTimeout(loadForUser(data.session.user.id))
          } catch (err) {
            console.error('[auth] loadForUser falhou:', err)
          }
        }
      })
      .catch((err) => console.error('[auth] getSession falhou:', err))
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      // Evita reagir a refresh de token quando já temos sessão.
      if (event === 'TOKEN_REFRESHED') {
        setSession(sess || null)
        return
      }
      setSession(sess || null)
      if (sess?.user?.id && event === 'SIGNED_IN') {
        setLoading(true)
        try {
          await withTimeout(loadForUser(sess.user.id))
        } catch (err) {
          console.error('[auth] loadForUser falhou (auth change):', err)
        } finally {
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        clearForLogout()
      }
    })

    return () => {
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
