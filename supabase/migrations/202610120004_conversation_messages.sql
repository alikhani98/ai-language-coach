alter table public.conversations
  add column if not exists status text not null default 'active'
  check (status in ('active', 'ended'));

alter table public.conversations
  add column if not exists active_request_id text;

alter table public.conversations
  add column if not exists active_generation_started_at timestamptz;

alter table public.conversations
  add column if not exists ended_at timestamptz;

alter table public.conversations
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 2000),
  corrections jsonb not null default '[]'::jsonb,
  request_id text,
  created_at timestamptz not null default now(),
  unique (conversation_id, role, request_id)
);

create index if not exists conversation_messages_conversation_created_idx
  on public.conversation_messages (conversation_id, created_at, id);

create index if not exists conversation_messages_user_created_idx
  on public.conversation_messages (user_id, created_at desc);

alter table public.conversation_messages enable row level security;

create policy "Users can read own conversation messages"
  on public.conversation_messages for select
  using (
    exists (
      select 1
      from public.conversations
      where conversations.id = conversation_messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy "Users can insert own conversation messages"
  on public.conversation_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.conversations
      where conversations.id = conversation_messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy "Users can update own conversation messages"
  on public.conversation_messages for update
  using (
    exists (
      select 1
      from public.conversations
      where conversations.id = conversation_messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.conversations
      where conversations.id = conversation_messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy "Users can delete own conversation messages"
  on public.conversation_messages for delete
  using (
    exists (
      select 1
      from public.conversations
      where conversations.id = conversation_messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );
