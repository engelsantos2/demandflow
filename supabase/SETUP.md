# Setup do Supabase — DemandFlow

Siga estes passos **uma vez** para preparar o banco de dados na nuvem.

---

## 1. Criar projeto Supabase

1. Acesse <https://supabase.com> e clique em **Start your project**.
2. Faça login com GitHub (mais rápido).
3. Clique em **New project**:
   - **Name:** `demandflow`
   - **Database password:** **anote em local seguro** (você não vai usar no dia a dia)
   - **Region:** `South America (São Paulo)` ou outra próxima
   - **Pricing plan:** **Free**
4. Aguarde uns 2 minutos enquanto o projeto provisiona.

---

## 2. Rodar o schema SQL

1. No menu lateral do Supabase, clique em **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` deste repositório.
3. Cole **todo o conteúdo** no editor e clique em **Run** (ou `Ctrl+Enter`).
4. Se aparecer `Success. No rows returned`, deu certo.

Para conferir:

- **Database → Tables**: deve listar 11 tabelas (`profiles`, `clients`, `services`,
  `demands`, `proposals`, `proposal_items`, `bank_accounts`, `financial_categories`,
  `recurring_contracts`, `financial_entries` — e a `auth.users` do Supabase).
- **Authentication → Policies**: cada tabela com várias policies tipo
  `*_select_own`, `*_insert_own`, etc.

---

## 3. Pegar URL + anon key

1. **Project Settings** (engrenagem no rodapé) → **API**.
2. Copie:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (string longa começando com `eyJ...`)

> A `anon key` é segura para o frontend — quem protege os dados é o RLS, não a chave.

---

## 4. Criar `.env.local` no projeto

Na raiz do `demandflow/`, crie um arquivo `.env.local` com:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...sua-chave-aqui...
```

> **Nunca commite esse arquivo.** Ele já está no `.gitignore`.

Reinicie `npm run dev` depois de criar o arquivo.

---

## 5. Configurar o e-mail/redirect URL do Supabase

1. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:5173` (dev) ou `https://seudominio.com` (produção)
   - **Redirect URLs**: adicione ambos:
     ```
     http://localhost:5173
     https://seudominio.com
     ```
2. **Authentication → Providers**:
   - **Email** já vem ativado.
   - Por enquanto, **desligue "Confirm email"** (em Authentication → Settings)
     para você poder testar sem precisar confirmar e-mail. Quando estiver no ar,
     **ligue de novo** para forçar confirmação.

---

## 6. Criar seu usuário admin

Como o cadastro pelo app criará usuários comuns, e você quer ter o
`engel@demandflow.app` como conta principal, faça assim:

1. **Authentication → Users → Add user → Create new user**.
2. **Email:** `engel@demandflow.app`
3. **Password:** `admin` (ou qualquer outra que preferir)
4. ✅ **Auto Confirm User** marcado.
5. Clique em **Create user**.

Pronto. O profile e as categorias-padrão são criados automaticamente pelos triggers.

---

## 7. Configurar variáveis no Vercel (para produção)

1. No painel do Vercel → seu projeto → **Settings → Environment Variables**.
2. Adicione duas variáveis (Production + Preview + Development):
   - `VITE_SUPABASE_URL` = a URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = a anon key
3. Redeploy o último build (Deployments → ⋯ → Redeploy).

---

## Pronto!

Quando terminar os passos acima, me avise. Vou então:

1. Migrar `AuthProvider` para usar `supabase.auth`
2. Migrar `store.js` para ler/escrever no Supabase
3. Manter a mesma API `useDB()` que o resto do app já usa — minimiza mudanças

Você pode acompanhar tudo via **Database → Table Editor** no painel do Supabase.

---

## Solução de problemas

**"new row violates row-level security policy"**
→ Você esqueceu de passar `user_id` no insert, ou a sessão não está autenticada.
O cliente Supabase do app injeta isso automaticamente após a migração.

**"relation does not exist"**
→ O SQL não rodou completo. Volte ao SQL Editor e rode novamente.

**Login não funciona em produção**
→ Verifique se adicionou o domínio em **URL Configuration → Redirect URLs**.
