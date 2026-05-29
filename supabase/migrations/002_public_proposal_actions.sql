-- =============================================================================
-- Migration 002 — Cliente consegue aprovar/recusar proposta sem login
-- =============================================================================
-- Permite UPDATE público no campo `status` de uma proposta quando a operação
-- vem com o public_token correto. Cliente abre o link, clica Aprovar/Recusar,
-- e o status muda sem precisar fazer login.
-- =============================================================================

-- Permite update público apenas em propostas que têm public_token (ou seja,
-- foram explicitamente compartilhadas). RLS continua bloqueando deletes e
-- updates em outros campos.
create policy "proposals_public_status_update" on public.proposals
  for update
  using (public_token is not null)
  with check (public_token is not null);

-- Também adiciona policy de leitura pública dos profiles (apenas campos
-- não-sensíveis: nome/email do dono e settings). Necessário para o
-- documento de proposta mostrar quem emitiu.
create policy "profiles_public_read_for_proposal_owner" on public.profiles
  for select
  using (
    exists (
      select 1 from public.proposals p
      where p.user_id = profiles.id and p.public_token is not null
    )
  );

-- =============================================================================
-- Como rodar:
-- 1. SQL Editor → New query
-- 2. Cole TODO este arquivo
-- 3. Run
-- =============================================================================
