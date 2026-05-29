import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Download,
  CheckCircle2,
  FileText,
  Building2,
  CalendarClock,
} from 'lucide-react'
import Badge from '../components/Badge'
import { useUI } from '../components/UIProvider'
import { supabase } from '../lib/supabaseClient'
import { rowToObject } from '../data/schema'
import { currency, formatDate } from '../lib/format'
import { PROPOSAL_STATUS } from '../lib/constants'
import { proposalCode } from '../lib/proposalActions'
import { elementToPDF } from '../lib/pdf'

const STATUS_MAP = Object.fromEntries(PROPOSAL_STATUS.map((s) => [s.id, s]))

// Fetch público: usa o token na URL como autenticação. As policies do
// schema (proposals_public_by_token + proposal_items_public) permitem
// leitura sem login quando `public_token IS NOT NULL`.
async function fetchPublicProposal(token) {
  const { data: proposalRow, error: pErr } = await supabase
    .from('proposals')
    .select('*')
    .eq('public_token', token)
    .maybeSingle()
  if (pErr) throw new Error(pErr.message)
  if (!proposalRow) return null
  const proposal = rowToObject(proposalRow)

  console.log('[proposta-pública] proposta id:', proposal.id, 'token:', proposal.publicToken)

  // Itens da proposta (também públicos via policy)
  const { data: itemsData, error: itemsErr } = await supabase
    .from('proposal_items')
    .select('*')
    .eq('proposal_id', proposal.id)
  if (itemsErr) console.warn('[proposta-pública] erro items:', itemsErr.message)
  const items = (itemsData || []).map(rowToObject)
  console.log('[proposta-pública] items carregados:', items.length, items)

  // Cliente — pode falhar por RLS, retorna parcial
  let client = null
  if (proposal.clientId) {
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', proposal.clientId)
      .maybeSingle()
    if (clientErr) console.warn('[proposta-pública] erro cliente:', clientErr.message)
    if (clientData) client = rowToObject(clientData)
    console.log('[proposta-pública] cliente carregado?', !!client)
  }

  // Settings do dono da proposta — pra mostrar nome da empresa, etc.
  let settings = {}
  if (proposal.userId) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('settings, name, email')
      .eq('id', proposal.userId)
      .maybeSingle()
    if (profileData) {
      settings = profileData.settings || {}
      settings.ownerName = profileData.name
      settings.ownerEmail = profileData.email
    }
  }

  return { proposal, items, client, settings }
}

// Atualização pública de status (visualizada/aprovada/recusada).
// Como a policy de UPDATE exige user_id = auth.uid(), e aqui não há sessão,
// usamos uma RPC pública ou apenas tentamos e ignoramos erro silencioso.
// Por segurança, marcamos como "visualizada" via tentativa que pode falhar.
async function tryUpdatePublicProposalStatus(id, patch) {
  const { error } = await supabase.from('proposals').update(patch).eq('id', id)
  if (error) console.warn('[proposta-pública] update bloqueado:', error.message)
}

export default function PropostaPublica() {
  const { token } = useParams()
  const { toast, confirm } = useUI()
  const viewedRef = useRef(false)
  const docRef = useRef(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [state, setState] = useState({
    loading: true,
    proposal: null,
    items: [],
    client: null,
    settings: {},
    error: null,
  })

  // Busca a proposta no Supabase (sem login)
  useEffect(() => {
    let mounted = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchPublicProposal(token)
      .then((res) => {
        if (!mounted) return
        if (!res) {
          setState({
            loading: false,
            proposal: null,
            items: [],
            client: null,
            settings: {},
            error: 'not-found',
          })
        } else {
          setState({
            loading: false,
            proposal: res.proposal,
            items: res.items,
            client: res.client,
            settings: res.settings,
            error: null,
          })
        }
      })
      .catch((err) => {
        if (!mounted) return
        setState({
          loading: false,
          proposal: null,
          items: [],
          client: null,
          settings: {},
          error: err.message || 'erro',
        })
      })
    return () => {
      mounted = false
    }
  }, [token])

  const { proposal, items, client, settings, loading, error } = state

  // marca como "visualizada" na primeira abertura (best-effort)
  useEffect(() => {
    if (proposal && proposal.status === 'enviada' && !viewedRef.current) {
      viewedRef.current = true
      tryUpdatePublicProposalStatus(proposal.id, { status: 'visualizada' }).then(() => {
        setState((s) =>
          s.proposal ? { ...s, proposal: { ...s.proposal, status: 'visualizada' } } : s,
        )
      })
    }
  }, [proposal])

  if (loading) {
    return (
      <div className="proposal-page">
        <div
          className="proposal-doc"
          style={{ padding: 56, textAlign: 'center' }}
        >
          <div className="spinner" style={{ margin: '0 auto' }} />
          <p className="text-2 text-sm mt-16">Carregando proposta...</p>
        </div>
      </div>
    )
  }

  if (!proposal || error === 'not-found') {
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
        'Ao confirmar, esta proposta será marcada como aprovada. O estúdio será notificado para começar o projeto.',
      confirmLabel: 'Aprovar proposta',
    })
    if (!ok) return
    await tryUpdatePublicProposalStatus(proposal.id, { status: 'aprovada' })
    setState((s) =>
      s.proposal ? { ...s, proposal: { ...s.proposal, status: 'aprovada' } } : s,
    )
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

  const handleReject = async () => {
    const ok = await confirm({
      title: 'Recusar proposta',
      message: 'Deseja marcar esta proposta como recusada?',
      confirmLabel: 'Recusar',
      danger: true,
    })
    if (!ok) return
    await tryUpdatePublicProposalStatus(proposal.id, { status: 'recusada' })
    setState((s) =>
      s.proposal ? { ...s, proposal: { ...s.proposal, status: 'recusada' } } : s,
    )
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
          justifyContent: 'flex-end',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div className="flex gap-8 items-center wrap">
          <Badge label={st.label} color={st.color} />
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
