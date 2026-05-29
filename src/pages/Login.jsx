import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { LogIn, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'

export default function Login() {
  const { user, signIn, loading } = useAuth()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    const dest = loc.state?.from || '/'
    return <Navigate to={dest} replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await signIn(email, password)
    setSubmitting(false)
    if (!res.ok) setError(res.error)
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="brand-logo">
            <svg width="22" height="22" viewBox="0 0 32 32">
              <path
                d="M8 9h11a7 7 0 0 1 0 14H8z"
                fill="none"
                stroke="#00FF85"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />
              <path d="M8 16h8" fill="none" stroke="#00FF85" strokeWidth="3.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="brand-name">
              Demand<span>Flow</span>
            </div>
            <div className="brand-sub">Gestão de estúdio</div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 22, marginBottom: 4 }}>Entrar</h2>
        <p className="text-sm text-2 mb-16">Acesse com seu e-mail e senha.</p>

        <div className="field">
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label className="label">Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ paddingRight: 38 }}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              title={show ? 'Ocultar' : 'Mostrar'}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-2)',
                display: 'flex',
              }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <div className="field-error mb-16">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={submitting || loading}
        >
          <LogIn size={15} /> {submitting ? 'Entrando…' : 'Entrar'}
        </button>

        <Link
          to="/signup"
          className="btn"
          style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
        >
          <UserPlus size={15} /> Criar nova conta
        </Link>
      </form>
    </div>
  )
}
