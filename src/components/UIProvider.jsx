import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, TriangleAlert } from 'lucide-react'
import Modal from './Modal'

const UIContext = createContext(null)

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI deve ser usado dentro de UIProvider')
  return ctx
}

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warn: AlertTriangle,
}

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const resolverRef = useRef(null)
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, type = 'success') => {
      const id = ++idRef.current
      setToasts((list) => [...list, { id, message, type }])
      setTimeout(() => dismiss(id), 3800)
    },
    [dismiss],
  )

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setConfirmState({
        title: 'Confirmar ação',
        message: 'Tem certeza que deseja continuar?',
        confirmLabel: 'Confirmar',
        cancelLabel: 'Cancelar',
        danger: false,
        ...options,
      })
    })
  }, [])

  const closeConfirm = (result) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setConfirmState(null)
  }

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-stack">
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.type] || Info
          return (
            <div key={t.id} className={`toast ${t.type}`} onClick={() => dismiss(t.id)}>
              <Icon className="toast-icon" size={20} />
              <span className="toast-msg">{t.message}</span>
            </div>
          )
        })}
      </div>

      <Modal
        open={!!confirmState}
        onClose={() => closeConfirm(false)}
        title={confirmState?.title}
        footer={
          <>
            <button className="btn" onClick={() => closeConfirm(false)}>
              {confirmState?.cancelLabel}
            </button>
            <button
              className={confirmState?.danger ? 'btn btn-danger' : 'btn btn-primary'}
              onClick={() => closeConfirm(true)}
            >
              {confirmState?.confirmLabel}
            </button>
          </>
        }
      >
        <div className="flex gap-12">
          <div
            className="dot-icon"
            style={{
              background: confirmState?.danger
                ? 'rgba(239,68,68,0.14)'
                : 'rgba(0,255,133,0.14)',
              color: confirmState?.danger ? '#ef4444' : '#00ff85',
            }}
          >
            <TriangleAlert size={16} />
          </div>
          <p className="text-2" style={{ flex: 1 }}>
            {confirmState?.message}
          </p>
        </div>
      </Modal>
    </UIContext.Provider>
  )
}
