import { Component } from 'react'

// Captura erros em qualquer componente abaixo na árvore, e mostra uma tela
// amigável em vez de deixar a página em branco / spinner eterno.
// O usuário pode recarregar ou voltar à home.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    // Detecta erro clássico de "chunk antigo após deploy" — o navegador tenta
    // baixar um JS com hash que não existe mais. Faz reload automático uma
    // única vez (com guarda para evitar loop infinito).
    const msg = (error?.message || '').toLowerCase()
    const isChunkError =
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('importing a module script failed')
    if (isChunkError) {
      const KEY = 'demandflow-chunk-reload'
      const last = Number(sessionStorage.getItem(KEY) || 0)
      const now = Date.now()
      if (now - last > 10000) {
        sessionStorage.setItem(KEY, String(now))
        // Pequeno delay pra log aparecer
        setTimeout(() => window.location.reload(), 200)
      }
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  reload = () => {
    window.location.href = '/'
  }

  render() {
    if (!this.state.error) return this.props.children
    const msg = this.state.error?.message || String(this.state.error)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--canvas, #050807)',
          color: 'var(--text, #fff)',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            background: 'var(--surface-tile-1, #0a1110)',
            border: '1px solid var(--hairline, #1f2a24)',
            borderRadius: 16,
            padding: 28,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Algo deu errado</h2>
          <p style={{ color: 'var(--text-2, #95a09a)', fontSize: 13, marginTop: 12 }}>
            {msg}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              marginTop: 20,
            }}
          >
            <button className="btn" onClick={this.reset}>
              Tentar novamente
            </button>
            <button className="btn btn-primary" onClick={this.reload}>
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    )
  }
}
