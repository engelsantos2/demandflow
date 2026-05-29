# DemandFlow

Sistema completo de gestão para estúdios de design e branding — demandas (Kanban),
clientes, propostas, financeiro com receitas/despesas/recorrências, contas bancárias,
serviços e relatórios.

Construído com **Vite + React 18** e persistência local (LocalStorage + IndexedDB).
Sem backend — funciona 100% no navegador.

## Stack

- React 18, React Router 6
- Vite 5 (build) + code-splitting por rota
- recharts, dnd-kit, lucide-react
- jsPDF + html2canvas para exportação
- Persistência: localStorage (dados estruturados) e IndexedDB (anexos)

## Setup do backend (Supabase)

1. Crie um projeto em <https://supabase.com>
2. Rode o SQL em `supabase/schema.sql` (SQL Editor)
3. Copie URL + anon key para `.env.local` (use `.env.example` como base)

Guia detalhado: [`supabase/SETUP.md`](./supabase/SETUP.md).

## Scripts

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção (gera dist/)
npm run preview  # serve o build localmente
```

## Acesso

Novos usuários podem ser criados pela tela `/signup`.

## Estrutura

```
src/
  components/   # UI compartilhada (Modal, Field, StatCard, etc.)
  pages/        # Rotas: Dashboard, Demandas, Clientes, Financeiro, ...
  data/         # store.js (estado global) + seed.js (dados iniciais)
  lib/          # Utilidades: format, finance, projection, dashboardMetrics, ...
```

## Deploy

### Vercel

O projeto já vem com `vercel.json` configurado para SPA:

1. Conecte o repositório no painel da Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Framework preset: **Vite** (detectado automaticamente).
5. Domínios customizados (Cloudflare): adicione o domínio em Vercel → Settings →
   Domains; depois aponte um registro `CNAME` para `cname.vercel-dns.com` no
   Cloudflare (sem "proxy" para HTTPS automático, ou com "proxy" se desejar usar
   o CDN do Cloudflare).

### Outras hospedagens

Qualquer hospedagem estática serve `dist/`. Garanta que todas as rotas
desconhecidas caiam em `index.html` (SPA fallback).

## Dados

Toda a base é persistida no navegador do usuário (multi-tenant por dispositivo).
Há ferramentas internas para **exportar/importar backup** (Configurações → Dados).
