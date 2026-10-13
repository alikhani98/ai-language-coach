-- Table privileges permit operations; existing RLS policies restrict row access.
grant usage on schema public to authenticated;

grant select, insert, update on table
  public.users_profile,
  public.daily_lessons,
  public.conversations,
  public.mistakes
to authenticated;

-- Assistant messages continue to use the existing ownership-checked RPC.
grant select, insert on table public.conversation_messages to authenticated;

-- No current workflow queries practice_logs. Vocabulary is stored in
-- daily_lessons.words, and progress is derived from the tables above.
-- UUID primary keys do not require sequence privileges.
