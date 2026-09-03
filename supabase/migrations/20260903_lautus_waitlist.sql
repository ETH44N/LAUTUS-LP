-- Applied to project vakvqlyvvaxpqabewtei on 2026-09-03 (kept here for reference).

create table if not exists public.lautus_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  user_agent text,
  referrer text,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists lautus_waitlist_email_key on public.lautus_waitlist (lower(email));
create index if not exists lautus_waitlist_created_at_idx on public.lautus_waitlist (created_at desc);
alter table public.lautus_waitlist enable row level security;
revoke all on public.lautus_waitlist from anon, authenticated;

-- Vault reader for the edge function (service role only).
create or replace function public.lautus_secret(secret_name text)
returns text language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1
$$;
revoke all on function public.lautus_secret(text) from public;
revoke all on function public.lautus_secret(text) from anon, authenticated;
