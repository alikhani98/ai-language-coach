alter table public.daily_lessons
  add column if not exists generation_status text not null default 'ready'
  check (generation_status in ('pending', 'ready', 'failed'));

create index if not exists daily_lessons_user_status_idx
  on public.daily_lessons (user_id, generation_status);
