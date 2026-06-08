-- DemandFlow — Desafios financeiros
-- Rode este arquivo no Supabase SQL Editor antes/depois do deploy do código.

create extension if not exists pgcrypto;

create table if not exists public.financial_challenges (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  goal_amount     numeric(12, 2) default 0,
  deposit_count   int default 0,
  generation_type text default 'crescente',
  frequency       text default 'livre',
  start_date      date,
  end_date        date,
  status          text default 'andamento',
  deposits        jsonb default '[]'::jsonb,
  updated_at      timestamptz default now(),
  created_at      timestamptz default now()
);

create index if not exists financial_challenges_user_idx
  on public.financial_challenges(user_id);

alter table public.financial_challenges enable row level security;

drop policy if exists "fin_challenges_select_own" on public.financial_challenges;
drop policy if exists "fin_challenges_insert_own" on public.financial_challenges;
drop policy if exists "fin_challenges_update_own" on public.financial_challenges;
drop policy if exists "fin_challenges_delete_own" on public.financial_challenges;

create policy "fin_challenges_select_own"
  on public.financial_challenges for select
  using (auth.uid() = user_id);

create policy "fin_challenges_insert_own"
  on public.financial_challenges for insert
  with check (auth.uid() = user_id);

create policy "fin_challenges_update_own"
  on public.financial_challenges for update
  using (auth.uid() = user_id);

create policy "fin_challenges_delete_own"
  on public.financial_challenges for delete
  using (auth.uid() = user_id);

alter table public.profiles
  alter column permissions set default array[
    'dashboard','demandas','clientes','financeiro',
    'desafios','propostas','servicos','relatorios','configuracoes'
  ]::text[];

update public.profiles
set permissions = array_append(permissions, 'desafios')
where permissions is not null
  and not ('desafios' = any(permissions));
