-- A rebuildable, bounded learning cache. Never copy sentences, feedback, names,
-- profile fields, or arbitrary model output into this table.
create or replace function public.valid_learning_memory(value jsonb)
returns boolean language plpgsql immutable security invoker
set search_path = pg_catalog, public as $$
declare item record;
begin
  if jsonb_typeof(value) = 'number' then
    return value::text ~ '^[0-9]{1,9}$';
  end if;
  if jsonb_typeof(value) <> 'object' then return false; end if;
  for item in select * from jsonb_each(value) loop
    if not (item.key = any(array[
      'totals','current','previous','areas','topics','lessons','vocabulary',
      'conversations','exchanges','days','total','sessions','recent','recent_feedback','previous_feedback',
      'grammar','past_simple','word_order','tone','clarity','other',
      'daily_life','work','travel','hobbies','free_conversation'
    ])) or not public.valid_learning_memory(item.value) then return false; end if;
  end loop;
  return true;
end;
$$;

create table public.learning_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  as_of date not null,
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object'
    and octet_length(snapshot::text) <= 12000
    and public.valid_learning_memory(snapshot)
  ),
  updated_at timestamptz not null default now()
);

alter table public.learning_memory enable row level security;
create policy "Read own learning memory" on public.learning_memory
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own learning memory" on public.learning_memory
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own learning memory" on public.learning_memory
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Delete own learning memory" on public.learning_memory
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.learning_memory from anon;
grant select, insert, update, delete on public.learning_memory to authenticated;

-- Only controlled topic codes leave the database. This conservative classifier
-- mirrors the existing past-simple heuristic; it is a signal, not an assessment.
create or replace function public.learning_memory_area(
  category text, original text, corrected text, explanation text
) returns text language sql immutable security invoker
set search_path = pg_catalog, public as $$
  select case
    when category = 'grammar' and (
      explanation ~* 'past (tense|simple)|simple past|زمان گذشته'
      or (original ~* 'yesterday|last (week|night|year)|\mago\M' and (
        (original ~* '\mgo\M' and corrected ~* '\mwent\M') or
        (original ~* '\meat\M' and corrected ~* '\mate\M') or
        (original ~* '\msee\M' and corrected ~* '\msaw\M') or
        (original ~* '\mhave\M' and corrected ~* '\mhad\M') or
        (original ~* '\mdo\M' and corrected ~* '\mdid\M') or
        (original ~* '\mbuy\M' and corrected ~* '\mbought\M') or
        (original ~* '\mis\M' and corrected ~* '\mwas\M') or
        (original ~* '\mare\M' and corrected ~* '\mwere\M')
      ))
    ) then 'past_simple'
    when category in ('grammar','vocabulary','word_order','tone','clarity') then category
    else 'other' end;
$$;

-- No caller-supplied user ID, timezone, history, or snapshot. SECURITY INVOKER
-- preserves all existing RLS policies; all sources additionally filter auth.uid().
create or replace function public.refresh_learning_memory()
returns jsonb language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare
  owner_id uuid := auth.uid();
  learner_timezone text;
  today date;
  result jsonb;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select timezone into learner_timezone from public.users_profile where user_id = owner_id;
  if learner_timezone is null then raise exception 'Learner profile required'; end if;
  today := (statement_timestamp() at time zone learner_timezone)::date;
  -- Serializes rebuilds for this owner, so a slower older event cannot overwrite
  -- a newer snapshot. Rebuilds use source counts, never increment on retries.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));

  with answered as materialized (
    select a.id, a.conversation_id, a.corrections,
      (a.created_at at time zone learner_timezone)::date as day
    from public.conversation_messages a
    join public.conversations c on c.id = a.conversation_id and c.user_id = owner_id
    where a.user_id = owner_id and a.role = 'assistant' and a.request_id is not null
      and exists (select 1 from public.conversation_messages u
        where u.user_id = owner_id and u.conversation_id = a.conversation_id
          and u.role = 'user' and u.request_id = a.request_id)
      and a.created_at <= statement_timestamp()
  ), lessons as materialized (
    select date as day,
      case when jsonb_typeof(words) = 'array' then jsonb_array_length(words) else 0 end as words
    from public.daily_lessons where user_id = owner_id
      and completed and generation_status = 'ready' and date <= today
  ), ended as materialized (
    select c.id, (c.ended_at at time zone learner_timezone)::date as day
    from public.conversations c where c.user_id = owner_id and c.status = 'ended'
      and c.ended_at <= statement_timestamp()
      and exists (select 1 from answered a where a.conversation_id = c.id)
  ), correction_sources as (
    select a.conversation_id::text as session_id, a.day, true as from_exchange,
      public.learning_memory_area(x.value->>'category', x.value->>'original',
        x.value->>'corrected', x.value->>'explanation') as area
    from answered a
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(a.corrections) = 'array' then a.corrections else '[]'::jsonb end
    ) with ordinality x(value, position)
    where x.value->>'category' in ('grammar','vocabulary','word_order','tone','clarity','other')
      and not exists (select 1 from public.mistakes m where m.user_id = owner_id
        and m.source_message_id = a.id and m.correction_index = x.position - 1
        and m.dismissed_at is not null)
    union all
    -- Linked notebook entries are already counted above; manual/legacy entries
    -- contribute once per local day, without copying their text into memory.
    select 'notebook:' || (m.created_at at time zone learner_timezone)::date::text,
      (m.created_at at time zone learner_timezone)::date, false,
      public.learning_memory_area(m.category, m.wrong_sentence, m.correct_sentence, m.explanation)
    from public.mistakes m where m.user_id = owner_id and m.source_message_id is null
      and m.dismissed_at is null and m.created_at <= statement_timestamp()
  ), area_counts as (
    select area, count(*) as total, count(distinct session_id) as sessions,
      count(*) filter (where day between today - 6 and today) as recent,
      count(*) filter (where day between today - 13 and today - 7) as previous,
      count(*) filter (where from_exchange and day between today - 6 and today) as recent_feedback,
      count(*) filter (where from_exchange and day between today - 13 and today - 7) as previous_feedback
    from correction_sources group by area
  ), topic_counts as (
    select c.topic, count(*) as exchanges, count(distinct a.conversation_id) as sessions
    from answered a join public.conversations c on c.id = a.conversation_id and c.user_id = owner_id
    where c.topic in ('daily_life','work','travel','hobbies','free_conversation') group by c.topic
  ), activity_days as (
    select day from lessons union select day from answered
  ), windows as (
    select 'current' as key, today - 6 as start_day, today as end_day
    union all select 'previous', today - 13, today - 7
  ), weekly as (
    select w.key, jsonb_build_object(
      'lessons', (select count(*) from lessons l where l.day between w.start_day and w.end_day),
      'vocabulary', (select coalesce(sum(l.words),0) from lessons l where l.day between w.start_day and w.end_day),
      'conversations', (select count(*) from ended e where e.day between w.start_day and w.end_day),
      'exchanges', (select count(*) from answered a where a.day between w.start_day and w.end_day),
      'days', (select count(*) from activity_days d where d.day between w.start_day and w.end_day)
    ) as value from windows w
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'lessons', (select count(*) from lessons),
      'vocabulary', (select coalesce(sum(words),0) from lessons),
      'conversations', (select count(*) from ended),
      'exchanges', (select count(*) from answered)
    ),
    'current', (select value from weekly where key = 'current'),
    'previous', (select value from weekly where key = 'previous'),
    'areas', coalesce((select jsonb_object_agg(area, jsonb_build_object(
      'total',total,'sessions',sessions,'recent',recent,'previous',previous,
      'recent_feedback',recent_feedback,'previous_feedback',previous_feedback)) from area_counts), '{}'::jsonb),
    'topics', coalesce((select jsonb_object_agg(topic, jsonb_build_object(
      'exchanges',exchanges,'sessions',sessions)) from topic_counts), '{}'::jsonb)
  ) into result;

  insert into public.learning_memory (user_id, as_of, snapshot, updated_at)
    values (owner_id, today, result, clock_timestamp())
    on conflict (user_id) do update set as_of = excluded.as_of,
      snapshot = excluded.snapshot, updated_at = excluded.updated_at;
  return result;
end;
$$;

revoke all on function public.refresh_learning_memory() from public, anon;
grant execute on function public.refresh_learning_memory() to authenticated;
revoke all on function public.valid_learning_memory(jsonb) from public, anon;
grant execute on function public.valid_learning_memory(jsonb) to authenticated;
revoke all on function public.learning_memory_area(text,text,text,text) from public, anon;
grant execute on function public.learning_memory_area(text,text,text,text) to authenticated;

create index if not exists conversation_messages_memory_request_idx
  on public.conversation_messages (user_id, conversation_id, request_id, role);
