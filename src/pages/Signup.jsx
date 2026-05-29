import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'

export default function Signup() {
  const { user, signUp } = useAuth()
  const loc = useLocation()
  const [form, setForm] = useState({
    name: '',
    email: '',
    position: '',
    password: '',
    confirm: '',
  })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    const dest = loc.state?.from || '/'
    return <Navigate to={dest} replace />
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setSubmitting(true)
    const res = await signUp({
      name: form.name,
      email: form.email,
      position: form.position,
      password: form.password,
    })
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    if (res.needsConfirm) {
      setInfo(
        'Conta criada! Confirme o e-mail enviado por nós para ativar o acesso.',
      )
    }
    // Caso a confirmação esteja desligada, o onAuthStateChange já vai
    // redirecionar para a home automaticamente.
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

        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 22, marginBottom: 4 }}>
          Criar conta
        </h2>
        <p className="text-sm text-2 mb-16">
          Comece a usar o DemandFlow no seu estúdio. Sua conta sincroniza automaticamente.
        </p>

        <div className="field">
          <label className="label">Nome completo</label>
          <input
            className="input"
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Ex.: Maria Souza"
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="voce@estudio.com"
            required
          />
        </div>
        <div className="field">
          <label className="label">Cargo / função (opcional)</label>
          <input
            className="input"
            type="text"
            value={form.position}
            onChange={set('position')}
            placeholder="Ex.: Designer, Founder, Gerente"
          />
        </div>
        <div className="field">
          <label className="label">Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              minLength={6}
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
        <div className="field">
          <label className="label">Confirmar senha</label>
          <input
            className="input"
            type={show ? 'text' : 'password'}
            value={form.confirm}
            onChange={set('confirm')}
            minLength={6}
            required
          />
        </div>

        {error && <div className="field-error mb-16">{error}</div>}
        {info && (
          <div
            className="muted-box mb-16"
            style={{
              background: 'rgba(0,255,133,0.08)',
              borderColor: 'rgba(0,255,133,0.25)',
            }}
          >
            <div className="text-sm font-bold mb-4 text-neon">Tudo certo!</div>
            <div className="text-xs text-2">{info}</div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={submitting}
        >
          <UserPlus size={15} /> {submitting ? 'Criando…' : 'Criar conta e entrar'}
        </button>

        <div className="login-foot">
          <Link to="/login" className="text-xs text-2 link-back">
            <ArrowLeft size={12} /> Já tenho conta — voltar para login
          </Link>
        </div>
      </form>
    </div>
  )
}
