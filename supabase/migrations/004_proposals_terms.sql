-- =============================================================================
-- Migration 004 — Coluna `terms` em proposals
-- =============================================================================
-- O app envia o campo `terms` (termos e condições da proposta) ao inserir,
-- mas a coluna estava faltando no schema original. Sem isso, o insert no
-- Supabase falhava silenciosamente e a proposta sumia após F5.
-- =============================================================================

alter table public.proposals
  add column if not exists terms text;

-- =============================================================================
-- Como rodar:
-- 1. SQL Editor → New query
-- 2. Cole TODO este arquivo
-- 3. Run
-- =============================================================================
