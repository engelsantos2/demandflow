-- =============================================================================
-- Migration 003 — Conta bancária "principal" (default em lançamentos)
-- =============================================================================
-- Cada usuário pode marcar UMA conta como principal. Ela é pré-selecionada
-- no modal de receita/despesa e em contratos recorrentes.
-- =============================================================================

alter table public.bank_accounts
  add column if not exists is_primary boolean default false;

-- Garante que só exista UMA conta principal por usuário.
-- Index único parcial: só vale quando is_primary = true.
create unique index if not exists bank_accounts_one_primary_per_user
  on public.bank_accounts (user_id)
  where is_primary = true;

-- =============================================================================
-- Como rodar:
-- 1. SQL Editor → New query
-- 2. Cole TODO este arquivo
-- 3. Run
-- =============================================================================
