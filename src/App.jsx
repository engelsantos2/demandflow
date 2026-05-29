import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { UIProvider } from './components/UIProvider'
import { AuthProvider, useAuth } from './components/AuthProvider'
import { ThemeProvider } from './components/ThemeProvider'
import Layout from './components/Layout'
import { canAccess } from './lib/permissions'
import { processRecurring } from './lib/recurring'
import { lazyRetry } from './lib/lazyRetry'
import ErrorBoundary from './components/ErrorBoundary'

const Dashboard = lazy(() => lazyRetry(() => import('./pages/Dashboard')))
const Demandas = lazy(() => lazyRetry(() => import('./pages/Demandas')))
const Clientes = lazy(() => lazyRetry(() => import('./pages/Clientes')))
const ClienteDetalhe = lazy(() => lazyRetry(() => import('./pages/ClienteDetalhe')))
const Financeiro = lazy(() => lazyRetry(() => import('./pages/Financeiro')))
const Propostas = lazy(() => lazyRetry(() => import('./pages/Propostas')))
const Produtos = lazy(() => lazyRetry(() => import('./pages/Produtos')))
const Relatorios = lazy(() => lazyRetry(() => import('./pages/Relatorios')))
const Configuracoes = lazy(() => lazyRetry(() => import('./pages/Configuracoes')))
const PropostaPublica = lazy(() => lazyRetry(() => import('./pages/PropostaPublica')))
const Login = lazy(() => lazyRetry(() => import('./pages/Login')))
const Signup = lazy(() => lazyRetry(() => import('./pages/Signup')))

function Fallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  // Enquanto a sessão Supabase é verificada / cache carregado, mostra spinner.
  if (loading) return <Fallback />
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (!canAccess(user, loc.pathname)) return <Navigate to="/" replace />
  return children
}

function InitRecurring() {
  const { user, loading } = useAuth()
  useEffect(() => {
    if (loading || !user) return
    // Só executa após cache estar carregado (loading === false e user válido).
    try {
      processRecurring()
    } catch (err) {
      console.warn('processRecurring falhou', err)
    }
  }, [user, loading])
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>
        <InitRecurring />
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/demandas" element={<Demandas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id" element={<ClienteDetalhe />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/propostas" element={<Propostas />} />
              <Route path="/servicos" element={<Produtos />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="/proposta/:token" element={<PropostaPublica />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </UIProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  )
}
