import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  FileText,
  Building2,
  CalendarClock,
  Mail,
  MessageCircle,
} from 'lucide-react'
import Badge from '../components/Badge'
import { useDB, update } from '../data/store'
import { useUI } from '../components/UIProvider'
import { currency, formatDate } from '../lib/format'
import { PROPOSAL_STATUS } from '../lib/constants'
import { approveProposal, proposalCode } from '../lib/proposalActions'
import { elementToPDF } from '../lib/pdf'
import { sendByEmail, sendByWhatsapp } from '../lib/send'

const STATUS_MAP = Object.fromEntries(PROPOSAL_STATUS.map((s) => [s.id, s]))

export default function PropostaPublica() {
  const { token } = useParams()
  const navigate = useNavigate()
  const db = useDB()
  const { toast, confirm } = useUI()
  const viewedRef = useRef(false)
  const docRef = useRef(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const proposal = db.proposals.find((p) => p.publicToken === token)

  const items = useMemo(
    () => (proposal ? db.proposalItems.filter((i) => i.proposalId === proposal.id) : []),
    [db.proposalItems, proposal],
  )
  const client = proposal && db.clients.find((c) => c.id === proposal.clientId)
  const { settings } = db

  // marca como "visualizada" na primeira abertura
  useEffect(() => {
    if (proposal && proposal.status === 'enviada' && !viewedRef.current) {
      viewedRef.current = true
      update('proposals', proposal.id, { status: 'visualizada' })
    }
  }, [proposal])

  if (!proposal) {
    return (
      <div className="proposal-page">
        <div className="proposal-doc" style={{ padding: 56, textAlign: 'center' }}>
          <div className="empty-icon" style={{ margin: '0 auto 16px' }}>
            <FileText />
          </div>
          <h2 style={{ fontSize: 18 }}>Proposta não encontrada</h2>
          <p className="text-2 text-sm mt-8">
            O link pode estar incorreto ou a proposta foi removida.
          </p>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/propostas')}>
            <ArrowLeft size={15} /> Ir para Propostas
          </button>
        </div>
      </div>
    )
  }

  const st = STATUS_MAP[proposal.status]
  const isClosed = ['aprovada', 'recusada', 'expirada'].includes(proposal.status)

  const handleApprove = async () => {
    const ok = await confirm({
      title: 'Aprovar proposta',
      message:
        'Ao aprovar, será criada automaticamente uma demanda e uma receita no financeiro vinculadas a esta proposta.',
      confirmLabel: 'Aprovar proposta',
    })
    if (!ok) return
    approveProposal(proposal)
    toast('Proposta aprovada com sucesso!', 'success')
  }

  const handleDownloadPDF = async () => {
    if (!docRef.current) return
    setPdfLoading(true)
    try {
      await elementToPDF(
        docRef.current,
        `proposta-${proposalCode(proposal.number).replace('#', '')}.pdf`,
      )
      toast('PDF gerado com sucesso')
    } catch (err) {
      toast('Erro ao gerar PDF: ' + err.message, 'error')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleEmail = () => sendByEmail(proposal, db.settings, client)
  const handleWhatsapp = () => sendByWhatsapp(proposal, db.settings, client)

  const handleReject = async () => {
    const ok = await confirm({
      title: 'Recusar proposta',
      message: 'Deseja marcar esta proposta como recusada?',
      confirmLabel: 'Recusar',
      danger: true,
    })
    if (!ok) return
    update('proposals', proposal.id, { status: 'recusada' })
    toast('Proposta marcada como recusada', 'info')
  }

  return (
    <div className="proposal-page">
      <div
        className="no-print"
        style={{
          maxWidth: 880,
          margin: '0 auto 16px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button className="btn btn-sm" onClick={() => navigate('/propostas')}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <div className="flex gap-8 items-center wrap">
          <Badge label={st.label} color={st.color} />
          <button className="btn btn-sm" onClick={handleEmail} title="Enviar por e-mail">
            <Mail size={14} /> E-mail
          </button>
          <button className="btn btn-sm" onClick={handleWhatsapp} title="Enviar por WhatsApp">
            <MessageCircle size={14} /> WhatsApp
          </button>
          <button className="btn btn-sm" onClick={handleDownloadPDF} disabled={pdfLoading}>
            <Download size={14} /> {pdfLoading ? 'Gerando...' : 'Baixar PDF'}
          </button>
        </div>
      </div>

      <div className="proposal-doc" ref={docRef}>
        <div className="proposal-band">
          <div className="flex gap-12 items-center">
            <div className="brand-logo" style={{ width: 48, height: 48 }}>
              <svg width="26" height="26" viewBox="0 0 32 32">
                <path d="M8 9h11a7 7 0 0 1 0 14H8z" fill="none" stroke="#00FF85" strokeWidth="3.2" strokeLinejoin="round" />
                <path d="M8 16h8" fill="none" stroke="#00FF85" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{settings.companyName}</div>
              <div className="text-xs text-2">{settings.companyEmail}</div>
              <div className="text-xs text-2">
                {settings.companyPhone} • {settings.companyAddress}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }} className="text-neon">
              PROPOSTA {proposalCode(proposal.number)}
            </div>
            <div className="text-xs text-2">Emitida em {formatDate(proposal.createdAt)}</div>
            <div className="text-xs text-2 flex items-center gap-6" style={{ justifyContent: 'flex-end' }}>
              <CalendarClock size={12} /> Válida até {formatDate(proposal.expirationDate)}
            </div>
          </div>
        </div>

        <div className="proposal-section">
          <h3>Preparada para</h3>
          <div className="grid cols-2" style={{ gap: 10 }}>
            <div className="kv">
              <span className="kv-label">Cliente</span>
              <span className="kv-value">{client?.name || '—'}</span>
            </div>
            <div className="kv">
              <span className="kv-label">Responsável</span>
              <span className="kv-value">{client?.responsibleName || '—'}</span>
            </div>
            <div className="kv">
              <span className="kv-label">E-mail</span>
              <span className="kv-value">{client?.email || '—'}</span>
            </div>
            <div className="kv">
              <span className="kv-label">Telefone</span>
              <span className="kv-value">{client?.whatsapp || client?.phone || '—'}</span>
            </div>
          </div>
        </div>

        <div className="proposal-section">
          <h3>{proposal.title}</h3>
          <p className="text-sm text-2">{proposal.description || 'Sem descrição geral.'}</p>
        </div>

        {proposal.scope && (
          <div className="proposal-section">
            <h3>Escopo do projeto</h3>
            <p className="text-sm text-2" style={{ whiteSpace: 'pre-wrap' }}>
              {proposal.scope}
            </p>
          </div>
        )}

        {(proposal.includedItems || proposal.excludedItems) && (
          <div className="proposal-section">
            <div className="grid cols-2" style={{ gap: 16 }}>
              <div>
                <h3>Itens inclusos</h3>
                <p className="text-sm text-2" style={{ whiteSpace: 'pre-wrap' }}>
                  {proposal.includedItems || '—'}
                </p>
              </div>
              <div>
                <h3>Itens não inclusos</h3>
                <p className="text-sm text-2" style={{ whiteSpace: 'pre-wrap' }}>
                  {proposal.excludedItems || '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="proposal-section">
          <h3>Investimento</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Descrição</th>
                  <th>Qtd.</th>
                  <th className="text-right">Unitário</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="font-bold">{i.name}</td>
                    <td className="text-2">{i.description || '—'}</td>
                    <td>{i.quantity}</td>
                    <td className="text-right">{currency(i.unitPrice)}</td>
                    <td className="text-right font-bold">{currency(i.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="proposal-section proposal-total">
          <div className="flex justify-between items-center wrap gap-16">
            <div>
              <div className="kv-label">Forma de pagamento</div>
              <div className="kv-value">{proposal.paymentTerms || '—'}</div>
              <div className="text-xs text-2 mt-8">
                {proposal.installments > 1
                  ? `Parcelado em ${proposal.installments}x`
                  : 'Pagamento à vista'}
                {proposal.deliveryTime ? ` • Prazo: ${proposal.deliveryTime}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="kv-label">Valor total</div>
              <div className="text-neon" style={{ fontSize: 30, fontWeight: 800 }}>
                {currency(proposal.totalValue)}
              </div>
            </div>
          </div>
        </div>

        {proposal.terms && (
          <div className="proposal-section">
            <h3>Termos e condições</h3>
            <p className="text-xs text-2" style={{ whiteSpace: 'pre-wrap' }}>
              {proposal.terms}
            </p>
          </div>
        )}

        <div className="proposal-section">
          <h3>Dados para pagamento</h3>
          <p className="text-sm text-2">{settings.bankInfo}</p>
        </div>

        {proposal.status === 'aprovada' ? (
          <div className="proposal-section" style={{ textAlign: 'center' }}>
            <div className="empty-icon" style={{ margin: '0 auto 12px' }}>
              <CheckCircle2 />
            </div>
            <div className="font-bold text-neon" style={{ fontSize: 16 }}>
              Proposta aprovada
            </div>
            <p className="text-sm text-2 mt-8">
              Uma demanda e uma receita foram criadas automaticamente no DemandFlow.
            </p>
          </div>
        ) : isClosed ? (
          <div className="proposal-section" style={{ textAlign: 'center' }}>
            <Badge label={st.label} color={st.color} />
          </div>
        ) : (
          <div className="proposal-section no-print" style={{ textAlign: 'center' }}>
            <p className="text-sm text-2 mb-16">
              Para seguir com o projeto, aprove a proposta abaixo.
            </p>
            <div className="flex gap-8" style={{ justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={handleReject}>
                Recusar
              </button>
              <button className="btn btn-primary" onClick={handleApprove}>
                <CheckCircle2 size={15} /> Aprovar proposta
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className="no-print"
        style={{ maxWidth: 880, margin: '16px auto 0', textAlign: 'center' }}
      >
        <span className="text-xs text-2 flex items-center gap-6" style={{ justifyContent: 'center' }}>
          <Building2 size={12} /> Gerado por DemandFlow
        </span>
      </div>
    </div>
  )
}
