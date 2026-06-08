-- DemandFlow — valor inicial/minimo para desafios financeiros

alter table public.financial_challenges
  add column if not exists minimum_deposit_amount numeric(12, 2) default 0;
