alter table public.users_profile
  add column if not exists timezone text not null default 'UTC';
