alter table public.users_profile
  add column if not exists interface_language text not null default 'en'
  check (interface_language in ('fa', 'en'));
