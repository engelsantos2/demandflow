import { useRef } from 'react'
import { Calendar } from 'lucide-react'

// Campo de data com ícone próprio. Clicar em qualquer ponto abre o calendário.
export default function DateInput({ value, onChange, className = 'input', ...rest }) {
  const ref = useRef(null)

  const openPicker = () => {
    try {
      ref.current?.showPicker?.()
    } catch {
      /* navegador sem suporte a showPicker */
    }
  }

  return (
    <div className="date-field" onClick={openPicker}>
      <input
        ref={ref}
        type="date"
        className={`${className} date-input ${value ? '' : 'is-empty'}`}
        value={value || ''}
        onChange={onChange}
        onFocus={openPicker}
        {...rest}
      />
      <Calendar className="date-field-icon" size={15} />
    </div>
  )
}
