// Wrapper em torno de import() dinâmico que:
//  1. Tenta novamente se o chunk falhar ao baixar (rede instável)
//  2. Se persistir, força reload da página — porque pode ser que o build
//     mudou (novo deploy) e o hash dos arquivos é outro. Reload pega o
//     index.html novo, que aponta para os chunks atuais.
//
// Use sempre pelo wrapper: lazyRetry(() => import('./pages/X'))
export function lazyRetry(factory, retries = 2, delayMs = 400) {
  return new Promise((resolve, reject) => {
    factory()
      .then(resolve)
      .catch((err) => {
        if (retries <= 0) {
          // Marca pra evitar loops infinitos de reload em servidores quebrados.
          const KEY = 'demandflow-chunk-reload'
          const last = Number(sessionStorage.getItem(KEY) || 0)
          const now = Date.now()
          if (now - last > 10000) {
            sessionStorage.setItem(KEY, String(now))
            window.location.reload()
            return
          }
          reject(err)
          return
        }
        setTimeout(() => {
          lazyRetry(factory, retries - 1, delayMs * 2).then(resolve, reject)
        }, delayMs)
      })
  })
}
