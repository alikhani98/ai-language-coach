alter table public.mistakes
  add column if not exists source_message_id uuid references public.conversation_messages(id) on delete set null,
  add column if not exists correction_index integer,
  add column if not exists dismissed_at timestamptz;

create unique index if not exists mistakes_source_message_correction_idx
  on public.mistakes (source_message_id, correction_index);

create index if not exists mistakes_user_created_at_idx
  on public.mistakes (user_id, created_at desc);

create index if not exists mistakes_user_dismissed_idx
  on public.mistakes (user_id, dismissed_at);

drop policy if exists "Users can insert own conversation messages"
  on public.conversation_messages;

create policy "Users can insert own user conversation messages"
  on public.conversation_messages for insert
  with check (
    auth.uid() = user_id
    and role = 'user'
    and exists (
      select 1
      from public.conversations
      where conversations.id = conversation_messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create or replace function public.insert_assistant_conversation_message(
  p_conversation_id uuid,
  p_content text,
  p_corrections jsonb,
  p_request_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
  owner_id uuid;
begin
  select user_id into owner_id
  from public.conversations
  where id = p_conversation_id
    and user_id = auth.uid();

  if owner_id is null then
    raise exception 'Conversation not found';
  end if;

  insert into public.conversation_messages (
    conversation_id,
    user_id,
    role,
    content,
    corrections,
    request_id
  )
  values (
    p_conversation_id,
    owner_id,
    'assistant',
    p_content,
    coalesce(p_corrections, '[]'::jsonb),
    p_request_id
  )
  on conflict (conversation_id, role, request_id) do nothing
  returning id into inserted_id;

  return inserted_id;
end;
$$;
