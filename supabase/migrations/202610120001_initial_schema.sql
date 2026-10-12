create extension if not exists "pgcrypto";

create table if not exists public.users_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  level text not null,
  goal text not null,
  daily_minutes integer not null default 15 check (daily_minutes between 10 and 30),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  words jsonb not null default '[]'::jsonb,
  sentence text not null,
  reading_text text not null,
  speaking_task text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  messages jsonb not null default '[]'::jsonb,
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wrong_sentence text not null,
  correct_sentence text not null,
  explanation text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  duration integer not null check (duration > 0),
  created_at timestamptz not null default now()
);

create index if not exists daily_lessons_user_date_idx
  on public.daily_lessons (user_id, date desc);

create index if not exists conversations_user_created_at_idx
  on public.conversations (user_id, created_at desc);

create index if not exists mistakes_user_category_idx
  on public.mistakes (user_id, category);

create index if not exists practice_logs_user_created_at_idx
  on public.practice_logs (user_id, created_at desc);

alter table public.users_profile enable row level security;
alter table public.daily_lessons enable row level security;
alter table public.conversations enable row level security;
alter table public.mistakes enable row level security;
alter table public.practice_logs enable row level security;

create policy "Users can read own profile"
  on public.users_profile for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.users_profile for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.users_profile for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own profile"
  on public.users_profile for delete
  using (auth.uid() = user_id);

create policy "Users can read own daily lessons"
  on public.daily_lessons for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily lessons"
  on public.daily_lessons for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily lessons"
  on public.daily_lessons for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own daily lessons"
  on public.daily_lessons for delete
  using (auth.uid() = user_id);

create policy "Users can read own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

create policy "Users can read own mistakes"
  on public.mistakes for select
  using (auth.uid() = user_id);

create policy "Users can insert own mistakes"
  on public.mistakes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own mistakes"
  on public.mistakes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own mistakes"
  on public.mistakes for delete
  using (auth.uid() = user_id);

create policy "Users can read own practice logs"
  on public.practice_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own practice logs"
  on public.practice_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own practice logs"
  on public.practice_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own practice logs"
  on public.practice_logs for delete
  using (auth.uid() = user_id);
