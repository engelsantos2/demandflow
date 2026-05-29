// Converte um hex (#RRGGBB) em rgba com a opacidade indicada.
export function withAlpha(hex, alpha) {
  const h = (hex || '#00FF85').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
