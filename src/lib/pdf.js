// Geração de PDF nativa — html2canvas e jsPDF são carregados sob demanda.
export async function elementToPDF(element, filename) {
  if (!element) throw new Error('Elemento não encontrado.')
  const [{ default: html2canvas }, jsPDFMod] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const jsPDF = jsPDFMod.jsPDF || jsPDFMod.default

  const canvas = await html2canvas(element, {
    backgroundColor: '#050807',
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  })

  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgW = pageW
  const imgH = (canvas.height * pageW) / canvas.width

  if (imgH <= pageH) {
    pdf.addImage(img, 'PNG', 0, 0, imgW, imgH)
  } else {
    let y = 0
    let remaining = imgH
    while (remaining > 0) {
      pdf.addImage(img, 'PNG', 0, y, imgW, imgH)
      remaining -= pageH
      if (remaining > 0) {
        y -= pageH
        pdf.addPage()
      }
    }
  }
  pdf.save(filename)
}
