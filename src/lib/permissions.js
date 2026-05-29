// Lista dos módulos do sistema com suas permissões granulares.
export const PERMISSION_MODULES = [
  { id: 'dashboard', label: 'Dashboard', path: '/' },
  { id: 'demandas', label: 'Demandas', path: '/demandas' },
  { id: 'clientes', label: 'Clientes', path: '/clientes' },
  { id: 'financeiro', label: 'Financeiro', path: '/financeiro' },
  { id: 'propostas', label: 'Propostas', path: '/propostas' },
  { id: 'servicos', label: 'Produtos / Serviços', path: '/servicos' },
  { id: 'relatorios', label: 'Relatórios', path: '/relatorios' },
  { id: 'configuracoes', label: 'Configurações', path: '/configuracoes' },
]

export const ALL_PERMISSION_IDS = PERMISSION_MODULES.map((m) => m.id)

export function canAccess(user, path) {
  if (!user) return false
  if (user.isAdmin) return true
  const perms = user.permissions || []
  if (path === '/') return perms.includes('dashboard')
  for (const m of PERMISSION_MODULES) {
    if (m.path === '/') continue
    if (path === m.path || path.startsWith(m.path + '/')) {
      return perms.includes(m.id)
    }
  }
  return false
}

export function canManageUsers(user) {
  return !!user?.isAdmin
}

// Descrição amigável de um conjunto de permissões.
export function permissionsSummary(user) {
  if (!user) return ''
  if (user.isAdmin) return 'Acesso total + gestão de usuários'
  const perms = user.permissions || []
  if (perms.length === 0) return 'Sem acesso a módulos'
  if (perms.length === PERMISSION_MODULES.length) return 'Acesso a todos os módulos'
  return `${perms.length} de ${PERMISSION_MODULES.length} módulos`
}
