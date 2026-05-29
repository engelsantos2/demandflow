import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  Users,
  KanbanSquare,
  FileText,
  Package,
  CalendarClock,
  AlertTriangle,
  LogOut,
  Settings as SettingsIcon,
  Sun,
  Moon,
} from 'lucide-react'
import Avatar from './Avatar'
import { useDB } from '../data/store'
import { useAuth } from './AuthProvider'
import { useTheme } from './ThemeProvider'
import { canAccess } from '../lib/permissions'
import { daysUntil, currency, formatDate } from '../lib/format'

const KIND_ICON = {
  Cliente: Users,
  Demanda: KanbanSquare,
  Proposta: FileText,
  Serviço: Package,
}

export default function Topbar({ onToggleNav }) {
  const db = useDB()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [openMenu, setOpenMenu] = useState(null)
  const blurTimer = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out = []
    db.clients.forEach((c) => {
      if (c.name.toLowerCase().includes(q))
        out.push({ kind: 'Cliente', label: c.name, to: `/clientes/${c.id}` })
    })
    db.demands.forEach((d) => {
      if (d.title.toLowerCase().includes(q))
        out.push({ kind: 'Demanda', label: d.title, to: `/demandas?d=${d.id}` })
    })
    db.proposals.forEach((p) => {
      if (p.title.toLowerCase().includes(q) || `#${p.number}`.includes(q))
        out.push({ kind: 'Proposta', label: `#${p.number} — ${p.title}`, to: `/propostas` })
    })
    db.services.forEach((s) => {
      if (s.name.toLowerCase().includes(q))
        out.push({ kind: 'Serviço', label: s.name, to: `/servicos` })
    })
    return out.slice(0, 8)
  }, [query, db])

  const notifications = useMemo(() => {
    const items = []
    db.financialEntries.forEach((e) => {
      if (e.status === 'pendente' && daysUntil(e.dueDate) < 0) {
        items.push({
          icon: AlertTriangle,
          color: '#ef4444',
          title: `${e.type === 'receita' ? 'Recebimento' : 'Conta'} em atraso`,
          text: `${e.description} • ${currency(e.value)}`,
        })
      }
    })
    db.demands.forEach((d) => {
      if (['concluido', 'cancelado'].includes(d.status)) return
      const dd = daysUntil(d.dueDate)
      if (dd !== null && dd >= 0 && dd <= 3) {
        items.push({
          icon: CalendarClock,
          color: '#facc15',
          title: 'Entrega próxima',
          text: `${d.title} • ${formatDate(d.dueDate)}`,
        })
      }
    })
    return items.slice(0, 8)
  }, [db])

  const go = (to) => {
    setQuery('')
    setOpenMenu(null)
    navigate(to)
  }

  const doSignOut = () => {
    setOpenMenu(null)
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <button className="icon-btn hamburger" onClick={onToggleNav} aria-label="Menu">
        <Menu />
      </button>

      <div
        className="search"
        onBlur={() => {
          blurTimer.current = setTimeout(() => setQuery((q) => (results.length ? q : q)), 0)
        }}
      >
        <Search />
        <input
          placeholder="Buscar clientes, demandas, propostas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <div className="search-results">
            {results.length === 0 && (
              <div className="search-result text-2">Nenhum resultado encontrado</div>
            )}
            {results.map((r, i) => {
              const Icon = KIND_ICON[r.kind] || Search
              return (
                <div
                  key={i}
                  className="search-result"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    go(r.to)
                  }}
                >
                  <Icon size={15} className="text-2" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="search-result-kind">{r.kind}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.label}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          <Sun className="icon-sun" />
          <Moon className="icon-moon" />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setOpenMenu(openMenu === 'notif' ? null : 'notif')}
            aria-label="Notificações"
          >
            <Bell />
            {notifications.length > 0 && <span className="dot" />}
          </button>
          {openMenu === 'notif' && (
            <div className="dropdown">
              <div className="dropdown-head">
                Notificações ({notifications.length})
              </div>
              {notifications.length === 0 && (
                <div className="dropdown-item text-2">Tudo em dia. Sem alertas.</div>
              )}
              {notifications.map((n, i) => (
                <div key={i} className="dropdown-item">
                  <div
                    className="dot-icon"
                    style={{ background: `${n.color}22`, color: n.color }}
                  >
                    <n.icon size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                    <div className="text-xs text-2">{n.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            className="pill"
            style={{ height: 42, paddingRight: 10 }}
            onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
          >
            <Avatar name={user?.name} size={26} />
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} />
          </button>
          {openMenu === 'profile' && (
            <div className="dropdown" style={{ width: 260 }}>
              <div className="dropdown-head">
                <div>{user?.name}</div>
                <div className="text-xs text-2" style={{ fontWeight: 400 }}>
                  {user?.email}
                </div>
                <div className="text-xs text-2" style={{ fontWeight: 400 }}>
                  {user?.position || (user?.isAdmin ? 'Administrador' : '')}
                </div>
              </div>
              {canAccess(user, '/configuracoes') && (
                <div
                  className="dropdown-item"
                  style={{ cursor: 'pointer', alignItems: 'center' }}
                  onClick={() => go('/configuracoes')}
                >
                  <SettingsIcon size={14} className="text-2" /> Configurações
                </div>
              )}
              <div
                className="dropdown-item"
                style={{ cursor: 'pointer', alignItems: 'center', color: '#fca5a5' }}
                onClick={doSignOut}
              >
                <LogOut size={14} /> Sair
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
