import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  KanbanSquare,
  Wallet,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
} from 'lucide-react'
import Avatar from './Avatar'
import { useAuth } from './AuthProvider'
import { canAccess } from '../lib/permissions'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/demandas', label: 'Demandas', icon: KanbanSquare },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/propostas', label: 'Propostas', icon: FileText },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicos', label: 'Produtos / Serviços', icon: Package },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Sidebar({ open, onNavigate }) {
  const { user } = useAuth()
  const allowed = NAV.filter((item) => canAccess(user, item.to))

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
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

      <nav className="nav stagger">
        <div className="nav-label">Menu</div>
        {allowed.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <Avatar name={user?.name} size={36} />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">
              {user?.position || (user?.isAdmin ? 'Administrador' : '—')}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
