export const KANBAN_COLUMNS = [
  { id: 'entrada', label: 'Entrada', accent: '#38BDF8' },
  { id: 'briefing', label: 'Aguardando briefing', accent: '#A78BFA' },
  { id: 'producao', label: 'Em produção', accent: '#00FF85' },
  { id: 'revisao', label: 'Em revisão', accent: '#FACC15' },
  { id: 'aprovacao', label: 'Aguardando aprovação', accent: '#FB923C' },
  { id: 'concluido', label: 'Concluído', accent: '#22C55E' },
  { id: 'cancelado', label: 'Cancelado', accent: '#EF4444' },
]

export const STATUS_LABEL = Object.fromEntries(
  KANBAN_COLUMNS.map((c) => [c.id, c.label]),
)

export const PRIORITIES = [
  { id: 'baixa', label: 'Baixa', color: '#A3A3A3' },
  { id: 'media', label: 'Média', color: '#38BDF8' },
  { id: 'alta', label: 'Alta', color: '#FACC15' },
  { id: 'urgente', label: 'Urgente', color: '#EF4444' },
]

export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]))

export const CLIENT_STATUS = [
  { id: 'ativo', label: 'Ativo', color: '#00FF85' },
  { id: 'inativo', label: 'Inativo', color: '#A3A3A3' },
  { id: 'lead', label: 'Lead', color: '#FACC15' },
]

export const SERVICE_STATUS = [
  { id: 'ativo', label: 'Ativo', color: '#00FF85' },
  { id: 'inativo', label: 'Inativo', color: '#A3A3A3' },
]

export const FINANCIAL_CATEGORIES = [
  'Ferramentas',
  'Assinaturas',
  'Tráfego pago',
  'Freelancer',
  'Impostos',
  'Equipamentos',
  'Alimentação',
  'Transporte',
  'Serviços prestados',
  'Outros',
]

export const PROPOSAL_STATUS = [
  { id: 'rascunho', label: 'Rascunho', color: '#A3A3A3' },
  { id: 'enviada', label: 'Enviada', color: '#38BDF8' },
  { id: 'visualizada', label: 'Visualizada', color: '#A78BFA' },
  { id: 'aprovada', label: 'Aprovada', color: '#00FF85' },
  { id: 'recusada', label: 'Recusada', color: '#EF4444' },
  { id: 'expirada', label: 'Expirada', color: '#FB923C' },
]

export const FIN_STATUS = {
  pendente: { id: 'pendente', label: 'Pendente', color: '#FACC15' },
  recebido: { id: 'recebido', label: 'Recebido', color: '#00FF85' },
  pago: { id: 'pago', label: 'Pago', color: '#00FF85' },
  atrasado: { id: 'atrasado', label: 'Atrasado', color: '#EF4444' },
  cancelado: { id: 'cancelado', label: 'Cancelado', color: '#A3A3A3' },
  previsto: { id: 'previsto', label: 'Previsto', color: '#A78BFA' },
}

export const CONTRACT_STATUS = [
  { id: 'ativo', label: 'Ativo', color: '#00FF85' },
  { id: 'pausado', label: 'Pausado', color: '#FACC15' },
  { id: 'encerrado', label: 'Encerrado', color: '#A3A3A3' },
]

export const CONTRACT_STATUS_MAP = Object.fromEntries(
  CONTRACT_STATUS.map((c) => [c.id, c]),
)

export const PAYMENT_METHODS = [
  'PIX',
  'Boleto',
  'Cartão de crédito',
  'Transferência',
  'Dinheiro',
]

export const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]
