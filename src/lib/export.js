// Exporta uma matriz (primeira linha = cabeçalho) como arquivo CSV.
export function downloadCSV(filename, rows) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const content = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// PDF via diálogo de impressão do navegador (Salvar como PDF).
export function exportPDF() {
  window.print()
}
