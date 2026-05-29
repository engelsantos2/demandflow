import { useEffect, useRef, useState } from 'react'

/**
 * Anima um número de 0 até o valor final usando easeOutCubic.
 * Aceita o valor como número OU como string com formato (ex.: "R$ 12.450,00").
 * Quando recebe string, extrai o número e reformata mantendo prefixos/sufixos.
 */
function parseFormatted(input) {
  if (typeof input === 'number') {
    return { value: input, format: (n) => String(Math.round(n)) }
  }
  const str = String(input ?? '')
  // Detecta o trecho numérico (suporta separadores . e ,)
  const match = str.match(/-?[\d.,]+/)
  if (!match) {
    return { value: 0, format: () => str }
  }
  const numStr = match[0]
  const prefix = str.slice(0, match.index)
  const suffix = str.slice(match.index + numStr.length)

  // Heurística: se tem ',' como separador decimal (padrão BR), troca por '.'
  let normalized = numStr
  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')
  let decimals = 0

  if (hasComma && hasDot) {
    // BR: ponto = milhares, vírgula = decimal
    normalized = normalized.replace(/\./g, '').replace(',', '.')
    decimals = (numStr.split(',')[1] || '').length
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
    decimals = (numStr.split(',')[1] || '').length
  } else if (hasDot) {
    // Se o ponto está nas últimas 3 posições, é decimal; senão é milhares
    const after = numStr.split('.').pop()
    if (after && after.length <= 2) {
      decimals = after.length
    } else {
      normalized = normalized.replace(/\./g, '')
    }
  }

  const value = Number(normalized) || 0

  const format = (n) => {
    const rounded = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n))
    let [intPart, decPart] = rounded.split('.')
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    const formatted = decPart ? `${intPart},${decPart}` : intPart
    return `${prefix}${formatted}${suffix}`
  }

  return { value, format }
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

export function useCountUp(target, { duration = 900, enabled = true } = {}) {
  const { value: targetValue, format } = parseFormatted(target)
  const [display, setDisplay] = useState(() => format(0))
  const startRef = useRef(null)
  const rafRef = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setDisplay(format(targetValue))
      return undefined
    }

    if (typeof window === 'undefined' || !('requestAnimationFrame' in window)) {
      setDisplay(format(targetValue))
      return undefined
    }

    // Respeita prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(format(targetValue))
      return undefined
    }

    startRef.current = null
    const from = fromRef.current

    const step = (ts) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      const eased = easeOutCubic(t)
      const current = from + (targetValue - from) * eased
      setDisplay(format(current))
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(step)
      } else {
        fromRef.current = targetValue
      }
    }

    rafRef.current = window.requestAnimationFrame(step)
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetValue, duration, enabled])

  return display
}
