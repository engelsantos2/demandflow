-- =============================================================================
-- Migration 005 — Leitura pública de cliente vinculado a proposta pública
-- =============================================================================
-- A página /proposta/:token precisa mostrar nome, e-mail e telefone do
-- cliente. Sem essa policy, a RLS bloqueia o SELECT em clients e o
-- documento aparece vazio na seção "Preparada para".
-- =============================================================================

create policy "clients_public_for_proposal" on public.clients
  for select
  using (
    exists (
      select 1 from public.proposals p
      where p.client_id = clients.id and p.public_token is not null
    )
  );

-- =============================================================================
-- Como rodar:
-- 1. SQL Editor → New query
-- 2. Cole TODO este arquivo
-- 3. Run
-- =============================================================================
