-- =============================================================================
-- Migration 006 — Reset/garantir todas policies públicas de proposta
-- =============================================================================
-- Roda DROP IF EXISTS + CREATE para garantir que as policies estão corretas,
-- mesmo se algumas tiverem sido perdidas no caminho.
-- =============================================================================

-- ===== proposal_items =====
drop policy if exists "proposal_items_public" on public.proposal_items;

create policy "proposal_items_public" on public.proposal_items
  for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and p.public_token is not null
    )
  );

-- ===== clients =====
drop policy if exists "clients_public_for_proposal" on public.clients;

create policy "clients_public_for_proposal" on public.clients
  for select
  using (
    exists (
      select 1 from public.proposals p
      where p.client_id = clients.id and p.public_token is not null
    )
  );

-- ===== profiles =====
drop policy if exists "profiles_public_read_for_proposal_owner" on public.profiles;

create policy "profiles_public_read_for_proposal_owner" on public.profiles
  for select
  using (
    exists (
      select 1 from public.proposals p
      where p.user_id = profiles.id and p.public_token is not null
    )
  );

-- ===== proposals (UPDATE público) =====
drop policy if exists "proposals_public_status_update" on public.proposals;

create policy "proposals_public_status_update" on public.proposals
  for update
  using (public_token is not null)
  with check (public_token is not null);

-- =============================================================================
-- Como rodar:
-- 1. SQL Editor → New query
-- 2. Cole TODO este arquivo
-- 3. Run
-- =============================================================================
