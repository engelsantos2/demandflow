import { currency, formatDate } from './format'
import { proposalCode } from './proposalActions'

export function publicProposalURL(proposal) {
  // BrowserRouter — rotas limpas sem '#'
  return `${window.location.origin}/proposta/${proposal.publicToken}`
}

export function buildProposalText(proposal, settings) {
  const url = publicProposalURL(proposal)
  const code = proposalCode(proposal.number)
  return [
    `Olá! Segue a proposta ${code} — ${proposal.title}.`,
    '',
    `Valor total: ${currency(proposal.totalValue)}`,
    proposal.expirationDate ? `Validade: ${formatDate(proposal.expirationDate)}` : null,
    '',
    'Acesse e aprove pelo link:',
    url,
    '',
    `— ${settings.companyName || 'Equipe'}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function sendByEmail(proposal, settings, client) {
  const subject = `Proposta ${proposalCode(proposal.number)} — ${proposal.title}`
  const body = buildProposalText(proposal, settings)
  const to = client?.email || ''
  window.location.href =
    `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
}

export function sendByWhatsapp(proposal, settings, client) {
  const phone = String(client?.whatsapp || client?.phone || '').replace(/\D/g, '')
  const body = buildProposalText(proposal, settings)
  const normalized = phone && !phone.startsWith('55') ? `55${phone}` : phone
  const base = normalized ? `https://wa.me/${normalized}` : 'https://wa.me/'
  window.open(`${base}?text=${encodeURIComponent(body)}`, '_blank', 'noopener')
}
