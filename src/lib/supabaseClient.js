// Cliente Supabase compartilhado por toda a aplicação.
//
// As credenciais vêm de variáveis Vite (com prefixo VITE_*), expostas ao
// bundle do frontend. A anon key é segura para o cliente porque Row Level
// Security no banco impede que cada usuário enxergue dados alheios.
//
// Em desenvolvimento, crie um .env.local na raiz do projeto:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
//
// Em produção (Vercel), configure as mesmas variáveis em
// Settings → Environment Variables.

import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(URL && KEY)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Aviso amigável em dev — em produção, o build falhará antes.
  console.warn(
    '[supabase] Variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não definidas. ' +
      'Crie um .env.local seguindo supabase/SETUP.md.',
  )
}

// Mesmo sem config, criamos um cliente "vazio" para não quebrar imports.
// As chamadas vão falhar com erros claros se forem usadas sem config.
export const supabase = createClient(
  URL || 'https://placeholder.supabase.co',
  KEY || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
