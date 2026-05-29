import { insert, update } from '../data/store'
import { uid, todayISO, addDays } from './format'

export function proposalCode(number) {
  return `#${String(number).padStart(3, '0')}`
}

// Automação: ao aprovar uma proposta, cria a demanda e a receita vinculadas.
export function approveProposal(proposal) {
  if (!proposal || proposal.status === 'aprovada') return null
  const now = new Date().toISOString()
  const code = proposalCode(proposal.number)

  const demand = insert('demands', {
    clientId: proposal.clientId,
    title: proposal.title,
    description: proposal.scope || proposal.description || '',
    serviceId: '',
    value: proposal.totalValue,
    startDate: todayISO(),
    dueDate: addDays(todayISO(), 30),
    priority: 'media',
    status: 'entrada',
    responsible: '',
    tags: ['proposta aprovada'],
    projectLink: '',
    notes: `Demanda gerada automaticamente a partir da proposta ${code}.`,
    checklist: [],
    comments: [],
    files: [],
    history: [
      {
        id: uid('h'),
        date: now,
        text: `Demanda criada automaticamente — proposta ${code} aprovada`,
      },
    ],
  })

  insert('financialEntries', {
    clientId: proposal.clientId,
    demandId: demand.id,
    proposalId: proposal.id,
    type: 'receita',
    description: `Proposta ${code} — ${proposal.title}`,
    category: 'Serviços prestados',
    value: proposal.totalValue,
    dueDate: addDays(todayISO(), 15),
    paymentDate: '',
    status: 'pendente',
    paymentMethod: 'PIX',
    isRecurring: false,
    notes: `Receita gerada automaticamente pela aprovação da proposta ${code}.`,
  })

  update('proposals', proposal.id, { status: 'aprovada' })
  return demand
}
