-- =============================================================================
-- DemandFlow — schema completo para Supabase (Postgres)
-- =============================================================================
-- Multi-tenant: cada usuário (auth.uid()) só enxerga seus próprios dados.
-- RLS está habilitado em todas as tabelas.
--
-- Como rodar:
--   1. Crie um projeto em https://supabase.com
--   2. Abra SQL Editor → New query → cole TODO este arquivo → Run
--   3. Copie URL e anon key (Settings → API) para o .env do app
-- =============================================================================

-- Habilita gen_random_uuid()
create extension if not exists pgcrypto;

-- =============================================================================
-- 1) PROFILES — espelha auth.users com dados extras do app
-- =============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text        not null,
  email        text        not null,
  position     text        default 'Membro',
  is_admin     boolean     default true,
  permissions  text[]      default array[
                              'dashboard','demandas','clientes','financeiro',
                              'propostas','servicos','relatorios','configuracoes'
                            ]::text[],
  settings     jsonb       default '{}'::jsonb,
  created_at   timestamptz default now()
);

-- Cria automaticamente um profile quando alguém se registra no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, position)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'position', 'Membro')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2) Tabelas de negócio
-- =============================================================================
-- Padrão comum: cada linha pertence a um user_id = auth.uid() do dono.

-- CLIENTES
create table if not exists public.clients (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  responsible_name text,
  email            text,
  phone            text,
  whatsapp         text,
  document         text,
  address          text,
  city             text,
  state            text,
  notes            text,
  status           text default 'ativo',
  created_at       timestamptz default now()
);
create index if not exists clients_user_idx on public.clients(user_id);

-- SERVIÇOS / PRODUTOS
create table if not exists public.services (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  name                   text not null,
  description            text,
  category               text,
  default_price          numeric(12, 2) default 0,
  average_delivery_days  int default 0,
  status                 text default 'ativo',
  created_at             timestamptz default now()
);
create index if not exists services_user_idx on public.services(user_id);

-- DEMANDAS (kanban)
create table if not exists public.demands (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  client_id     uuid references public.clients(id) on delete set null,
  service_id    uuid references public.services(id) on delete set null,
  title         text not null,
  description   text,
  value         numeric(12, 2) default 0,
  start_date    date,
  due_date      date,
  priority      text default 'media',
  status        text default 'entrada',
  responsible   text,
  tags          text[],
  project_link  text,
  notes         text,
  checklist     jsonb default '[]'::jsonb,
  comments      jsonb default '[]'::jsonb,
  files         jsonb default '[]'::jsonb,
  history       jsonb default '[]'::jsonb,
  created_at    timestamptz default now()
);
create index if not exists demands_user_idx on public.demands(user_id);
create index if not exists demands_client_idx on public.demands(client_id);

-- PROPOSTAS
create table if not exists public.proposals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  number          int  not null,
  client_id       uuid references public.clients(id) on delete set null,
  title           text not null,
  description     text,
  scope           text,
  included_items  text,
  excluded_items  text,
  delivery_time   text,
  total_value     numeric(12, 2) default 0,
  payment_terms   text,
  installments    int default 1,
  expiration_date date,
  status          text default 'rascunho',
  public_token    text unique,
  terms           text,
  created_at      timestamptz default now()
);
create index if not exists proposals_user_idx on public.proposals(user_id);

-- ITENS DE PROPOSTA
create table if not exists public.proposal_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete cascade,
  name        text not null,
  description text,
  quantity    numeric(12, 2) default 1,
  unit_price  numeric(12, 2) default 0,
  total_price numeric(12, 2) default 0,
  created_at  timestamptz default now()
);
create index if not exists proposal_items_user_idx on public.proposal_items(user_id);
create index if not exists proposal_items_proposal_idx on public.proposal_items(proposal_id);

-- CONTAS BANCÁRIAS
create table if not exists public.bank_accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  bank             text,
  agency           text,
  account_number   text,
  type             text default 'corrente',
  initial_balance  numeric(12, 2) default 0,
  color            text default '#00FF85',
  include_in_total boolean default true,
  notes            text,
  created_at       timestamptz default now()
);
create index if not exists bank_accounts_user_idx on public.bank_accounts(user_id);

-- CATEGORIAS FINANCEIRAS
create table if not exists public.financial_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  scope      text not null default 'receita',  -- 'receita' | 'despesa' | 'ambos'
  active     boolean default true,
  created_at timestamptz default now()
);
create index if not exists financial_categories_user_idx on public.financial_categories(user_id);

-- CONTRATOS RECORRENTES (receita fixa / despesa recorrente)
create table if not exists public.recurring_contracts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null,            -- 'receita' | 'despesa'
  client_id      uuid references public.clients(id) on delete set null,
  description    text not null,
  category       text,
  value          numeric(12, 2) default 0,
  day_of_month   int default 5,
  start_date     date,
  end_date       date,
  status         text default 'ativo',     -- 'ativo' | 'pausado' | 'encerrado'
  payment_method text default 'PIX',
  account_id     uuid references public.bank_accounts(id) on delete set null,
  notes          text,
  created_at     timestamptz default now()
);
create index if not exists recurring_user_idx on public.recurring_contracts(user_id);

-- LANÇAMENTOS FINANCEIROS
create table if not exists public.financial_entries (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  type                   text not null,    -- 'receita' | 'despesa' | 'transferencia'
  description            text not null,
  category               text,
  value                  numeric(12, 2) default 0,
  client_id              uuid references public.clients(id) on delete set null,
  demand_id              uuid references public.demands(id) on delete set null,
  proposal_id            uuid references public.proposals(id) on delete set null,
  account_id             uuid references public.bank_accounts(id) on delete set null,
  dest_account_id        uuid references public.bank_accounts(id) on delete set null,
  due_date               date,
  payment_date           date,
  status                 text default 'pendente',
  payment_method         text default 'PIX',
  is_recurring           boolean default false,
  recurrence_group_id    text,
  recurring_contract_id  uuid references public.recurring_contracts(id) on delete set null,
  notes                  text,
  created_at             timestamptz default now()
);
create index if not exists fin_entries_user_idx on public.financial_entries(user_id);
create index if not exists fin_entries_account_idx on public.financial_entries(account_id);
create index if not exists fin_entries_due_idx on public.financial_entries(due_date);

-- =============================================================================
-- 3) Row Level Security — cada usuário só vê os próprios dados
-- =============================================================================

-- PROFILES: cada um vê e edita só o próprio
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Helper macro: gera 4 políticas (select/insert/update/delete) por tabela.
-- Como Postgres não tem macro, repetimos.

-- CLIENTS
alter table public.clients enable row level security;
create policy "clients_select_own" on public.clients for select using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients for update using (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients for delete using (auth.uid() = user_id);

-- SERVICES
alter table public.services enable row level security;
create policy "services_select_own" on public.services for select using (auth.uid() = user_id);
create policy "services_insert_own" on public.services for insert with check (auth.uid() = user_id);
create policy "services_update_own" on public.services for update using (auth.uid() = user_id);
create policy "services_delete_own" on public.services for delete using (auth.uid() = user_id);

-- DEMANDS
alter table public.demands enable row level security;
create policy "demands_select_own" on public.demands for select using (auth.uid() = user_id);
create policy "demands_insert_own" on public.demands for insert with check (auth.uid() = user_id);
create policy "demands_update_own" on public.demands for update using (auth.uid() = user_id);
create policy "demands_delete_own" on public.demands for delete using (auth.uid() = user_id);

-- PROPOSALS
alter table public.proposals enable row level security;
create policy "proposals_select_own" on public.proposals for select using (auth.uid() = user_id);
create policy "proposals_insert_own" on public.proposals for insert with check (auth.uid() = user_id);
create policy "proposals_update_own" on public.proposals for update using (auth.uid() = user_id);
create policy "proposals_delete_own" on public.proposals for delete using (auth.uid() = user_id);
-- Permite leitura pública por public_token (proposta enviada ao cliente)
create policy "proposals_public_by_token" on public.proposals
  for select using (public_token is not null);

-- PROPOSAL_ITEMS
alter table public.proposal_items enable row level security;
create policy "proposal_items_select_own" on public.proposal_items for select using (auth.uid() = user_id);
create policy "proposal_items_insert_own" on public.proposal_items for insert with check (auth.uid() = user_id);
create policy "proposal_items_update_own" on public.proposal_items for update using (auth.uid() = user_id);
create policy "proposal_items_delete_own" on public.proposal_items for delete using (auth.uid() = user_id);
-- Itens são lidos publicamente junto com a proposta pública
create policy "proposal_items_public" on public.proposal_items
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and p.public_token is not null
    )
  );

-- BANK_ACCOUNTS
alter table public.bank_accounts enable row level security;
create policy "bank_accounts_select_own" on public.bank_accounts for select using (auth.uid() = user_id);
create policy "bank_accounts_insert_own" on public.bank_accounts for insert with check (auth.uid() = user_id);
create policy "bank_accounts_update_own" on public.bank_accounts for update using (auth.uid() = user_id);
create policy "bank_accounts_delete_own" on public.bank_accounts for delete using (auth.uid() = user_id);

-- FINANCIAL_CATEGORIES
alter table public.financial_categories enable row level security;
create policy "fin_cat_select_own" on public.financial_categories for select using (auth.uid() = user_id);
create policy "fin_cat_insert_own" on public.financial_categories for insert with check (auth.uid() = user_id);
create policy "fin_cat_update_own" on public.financial_categories for update using (auth.uid() = user_id);
create policy "fin_cat_delete_own" on public.financial_categories for delete using (auth.uid() = user_id);

-- RECURRING_CONTRACTS
alter table public.recurring_contracts enable row level security;
create policy "rc_select_own" on public.recurring_contracts for select using (auth.uid() = user_id);
create policy "rc_insert_own" on public.recurring_contracts for insert with check (auth.uid() = user_id);
create policy "rc_update_own" on public.recurring_contracts for update using (auth.uid() = user_id);
create policy "rc_delete_own" on public.recurring_contracts for delete using (auth.uid() = user_id);

-- FINANCIAL_ENTRIES
alter table public.financial_entries enable row level security;
create policy "fin_select_own" on public.financial_entries for select using (auth.uid() = user_id);
create policy "fin_insert_own" on public.financial_entries for insert with check (auth.uid() = user_id);
create policy "fin_update_own" on public.financial_entries for update using (auth.uid() = user_id);
create policy "fin_delete_own" on public.financial_entries for delete using (auth.uid() = user_id);

-- =============================================================================
-- 4) Seed inicial de categorias financeiras para CADA novo usuário
-- =============================================================================
-- Roda automaticamente quando o profile é criado.
create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.financial_categories (user_id, name, scope, active) values
    -- Receitas
    (new.id, 'Serviços prestados',   'receita', true),
    (new.id, 'Landing Page',         'receita', true),
    (new.id, 'Site institucional',   'receita', true),
    (new.id, 'Manutenção mensal',    'receita', true),
    (new.id, 'Consultoria',          'receita', true),
    (new.id, 'Venda de produto',     'receita', true),
    (new.id, 'Comissão',             'receita', true),
    -- Despesas
    (new.id, 'Assinaturas',          'despesa', true),
    (new.id, 'Ferramentas',          'despesa', true),
    (new.id, 'Tráfego pago',         'despesa', true),
    (new.id, 'Freelancer',           'despesa', true),
    (new.id, 'Impostos',             'despesa', true),
    (new.id, 'Hospedagem/domínio',   'despesa', true),
    (new.id, 'Software',             'despesa', true),
    (new.id, 'Alimentação',          'despesa', true),
    (new.id, 'Transporte',           'despesa', true),
    (new.id, 'Equipamentos',         'despesa', true),
    -- Ambos
    (new.id, 'Outros',               'ambos',   true);
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.seed_user_defaults();

-- =============================================================================
-- FIM
-- =============================================================================
-- Verifique no painel:
--   Database → Tables: 11 tabelas
--   Authentication → Policies: cada tabela com 4+ policies
-- =============================================================================
