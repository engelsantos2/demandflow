import { useEffect, useRef, useState } from 'react'

/**
 * Hook reveal-on-scroll. Adiciona a classe `is-visible` ao elemento
 * quando ele entra na viewport. Use junto com a classe `.reveal`:
 *
 *   const { ref, visible } = useReveal()
 *   <section ref={ref} className={`reveal ${visible ? 'is-visible' : ''}`}>
 */
export function useReveal({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            if (once) obs.unobserve(entry.target)
          } else if (!once) {
            setVisible(false)
          }
        })
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, once])

  return { ref, visible }
}
