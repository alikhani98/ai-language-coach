-- Run only against a disposable/local database with the project migrations.
-- No pgTAP dependency. All fixtures and mutations are rolled back.
begin;
insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.users_profile(user_id,level,goal,timezone) values
  ('11111111-1111-4111-8111-111111111111','a2_elementary','conversation','Asia/Tehran'),
  ('22222222-2222-4222-8222-222222222222','b1_intermediate','work','Asia/Tehran')
on conflict(user_id) do update set level=excluded.level,goal=excluded.goal,timezone=excluded.timezone,status='active';
update public.users_profile set status='active' where user_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');

do $$
declare today date := (statement_timestamp() at time zone 'Asia/Tehran')::date;
begin
  insert into public.daily_lessons(user_id,date,words,sentence,reading_text,speaking_task,completed,generation_status) values
    ('11111111-1111-4111-8111-111111111111',today,'[1,2,3]','Example','Example','Example',true,'ready'),
    ('11111111-1111-4111-8111-111111111111',today-7,'[1,2]','Example','Example','Example',true,'ready'),
    ('11111111-1111-4111-8111-111111111111',today-25,'[1]','Example','Example','Example',true,'ready'),
    ('11111111-1111-4111-8111-111111111111',today-1,'[]','Pending','Pending','Pending',false,'pending'),
    ('22222222-2222-4222-8222-222222222222',today,'[1,2,3,4]','Private example','Private example','Private example',true,'ready');
  insert into public.conversations(id,user_id,topic,status,ended_at) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','work','ended',statement_timestamp()),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','work','active',null),
    ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','travel','ended',statement_timestamp());
  insert into public.conversation_messages(id,conversation_id,user_id,role,content,request_id,corrections,created_at) values
    ('10000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','user','I go yesterday','request-1','[]',statement_timestamp()-interval '1 minute'),
    -- UTC previous-week date, but current-week date in Tehran.
    ('10000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','assistant','A reply','request-1',
      '[{"original":"I go yesterday","corrected":"I went yesterday","explanation":"Past tense","category":"grammar"},{"original":"Wrong word","corrected":"Better word","explanation":"Choose a word","category":"vocabulary"}]',
      (today-7+time '21:00') at time zone 'UTC'),
    ('10000000-0000-4000-8000-000000000003','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','user','I go yesterday','request-2','[]',(today-7+time '11:00') at time zone 'UTC'),
    ('10000000-0000-4000-8000-000000000004','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','assistant','A reply','request-2',
      '[{"original":"I go yesterday","corrected":"I went yesterday","explanation":"Past tense","category":"grammar"}]',(today-7+time '12:00') at time zone 'UTC'),
    ('10000000-0000-4000-8000-000000000005','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','user','I go yesterday','request-3','[]',(today-8+time '11:00') at time zone 'UTC'),
    ('10000000-0000-4000-8000-000000000006','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','assistant','A reply','request-3',
      '[{"original":"I go yesterday","corrected":"I went yesterday","explanation":"Past tense","category":"grammar"}]',(today-8+time '12:00') at time zone 'UTC'),
    ('10000000-0000-4000-8000-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','assistant','Unanswered orphan','orphan-request',
      '[{"original":"private@example.test","corrected":"private@example.test","explanation":"Past tense","category":"grammar"}]',statement_timestamp());
end;
$$;
insert into public.mistakes(user_id,source_message_id,correction_index,wrong_sentence,correct_sentence,explanation,category,dismissed_at) values
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000002',0,'I go yesterday','I went yesterday','Past tense','grammar',null),
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000002',1,'Wrong word','Better word','Choose a word','vocabulary',now()),
  ('11111111-1111-4111-8111-111111111111',null,null,'I went to store yesterday','I went to the store yesterday','Use the article','grammar',null);

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare memory jsonb; again jsonb;
begin
  memory := public.refresh_learning_memory();
  again := public.refresh_learning_memory();
  assert memory = again, 'Retries must be idempotent';
  assert (memory#>>'{totals,lessons}')::int = 3, 'All-time completed lessons only';
  assert (memory#>>'{totals,vocabulary}')::int = 6, 'Vocabulary reviews are not unique mastery';
  assert (memory#>>'{current,lessons}')::int = 1, 'Current seven-day boundary';
  assert (memory#>>'{previous,lessons}')::int = 1, 'Previous seven-day boundary';
  assert (memory#>>'{totals,conversations}')::int = 1, 'Do not count empty ended conversations';
  assert (memory#>>'{totals,exchanges}')::int = 3, 'Ignore orphan assistant replies';
  assert (memory#>>'{areas,past_simple,total}')::int = 3, 'Do not double-count notebook copies';
  assert (memory#>>'{areas,past_simple,sessions}')::int = 2, 'Distinct conversation evidence';
  assert (memory#>>'{areas,past_simple,recent}')::int = 1, 'Timezone-aware correction window';
  assert (memory#>>'{areas,past_simple,previous}')::int = 2, 'Previous feedback window';
  assert (memory#>>'{areas,grammar,total}')::int = 1, 'Article correction is not past-simple';
  assert (memory#>>'{areas,grammar,recent_feedback}')::int = 0, 'Manual notebook evidence is not conversation feedback';
  assert not (memory->'areas' ? 'vocabulary'), 'Dismissed feedback must be excluded';
  assert (memory#>>'{topics,work,sessions}')::int = 2, 'Recognize practiced topics';
  assert memory::text not like '%private%' and memory::text not like '%yesterday%', 'No raw learning or personal text';
  begin
    update public.learning_memory set snapshot = snapshot || '{"personal":"private@example.test"}'::jsonb;
    raise exception 'Raw text must be rejected';
  exception when check_violation then null; end;
  update public.mistakes set dismissed_at = now() where source_message_id = '10000000-0000-4000-8000-000000000002' and correction_index = 0;
  memory := public.refresh_learning_memory();
  assert (memory#>>'{areas,past_simple,total}')::int = 2, 'Rebuild after dismissing a correction';
end;
$$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare memory jsonb; affected integer;
begin
  assert (select count(*) from public.learning_memory) = 0, 'Cannot read another learner memory';
  memory := public.refresh_learning_memory();
  assert (memory#>>'{totals,lessons}')::int = 1, 'RPC aggregates only the current owner';
  assert memory->'areas' = '{}'::jsonb, 'No cross-user corrections';
  update public.learning_memory set as_of = current_date where user_id = '11111111-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  assert affected = 0, 'Cannot update another learner';
  delete from public.learning_memory where user_id = '11111111-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  assert affected = 0, 'Cannot delete another learner';
  begin
    insert into public.learning_memory(user_id,as_of,snapshot) values ('11111111-1111-4111-8111-111111111111',current_date,memory);
    raise exception 'Cross-user insert must be rejected';
  exception when insufficient_privilege then null; end;
  begin
    update public.learning_memory set user_id = '11111111-1111-4111-8111-111111111111';
    raise exception 'Owner reassignment must be rejected';
  exception when insufficient_privilege then null; end;
  delete from public.learning_memory;
  assert (select count(*) from public.learning_memory) = 0, 'Own snapshot may be deleted';
  perform public.refresh_learning_memory();
end;
$$;

select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin
    perform public.refresh_learning_memory();
    raise exception 'Missing authenticated identity must fail';
  exception when insufficient_privilege then null; end;
end; $$;
set local role anon;
do $$ begin
  begin
    perform public.refresh_learning_memory();
    raise exception 'Anonymous refresh must fail';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.learning_memory;
    raise exception 'Anonymous read must fail';
  exception when insufficient_privilege then null; end;
end; $$;
rollback;
