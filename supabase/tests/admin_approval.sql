begin;
insert into auth.users(id,email,raw_app_meta_data) values
 ('90000000-0000-4000-8000-000000000001','admin@example.test','{"role":"admin"}'),
 ('90000000-0000-4000-8000-000000000002','learner@example.test','{}'),
 ('90000000-0000-4000-8000-000000000003','other@example.test','{}');
update public.users_profile set status='active' where user_id='90000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
do $$ begin
 assert (select status='pending' from public.users_profile where user_id=auth.uid()), 'Signup defaults pending';
 assert (select count(*)=1 from public.users_profile), 'Profiles owner only';
 assert not public.is_app_admin(), 'Normal user is not admin';
 begin
   update public.users_profile set status='active' where user_id=auth.uid();
   raise exception 'Self approval succeeded';
 exception when insufficient_privilege then null; end;
 begin
   update public.users_profile set user_id='90000000-0000-4000-8000-000000000003' where user_id=auth.uid();
   raise exception 'Owner manipulation succeeded';
 exception when insufficient_privilege then null; end;
 begin
   delete from public.users_profile where user_id=auth.uid();
   raise exception 'Delete profile succeeded';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.users_profile(user_id,level,goal,status) values(auth.uid(),'','','active');
   raise exception 'Insert profile succeeded';
 exception when insufficient_privilege then null; end;
 begin
   perform public.admin_change_user(auth.uid(),'user_approved');
   raise exception 'Normal user RPC succeeded';
 exception when insufficient_privilege then null; end;
 begin
   perform public.admin_users();
   raise exception 'Normal user list succeeded';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.admin_audit_logs(admin_user_id,action) values(auth.uid(),'user_approved');
   raise exception 'Audit tampering succeeded';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.daily_lessons(user_id,date,sentence,reading_text,speaking_task) values(auth.uid(),current_date,'x','x','x');
   raise exception 'Pending learning write succeeded';
 exception when insufficient_privilege then null; end;
 update public.users_profile set interface_language='fa',theme_preference='auto' where user_id=auth.uid();
 assert (select interface_language='fa' and theme_preference='auto' from public.users_profile where user_id=auth.uid()), 'Preferences allowed while pending';
 update public.users_profile set level='c1_advanced' where user_id='90000000-0000-4000-8000-000000000003';
 assert not found, 'Other profile updates blocked';
end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
do $$ declare result jsonb; n integer; begin
 assert public.is_app_admin(), 'Trusted active administrator';
 result:=public.admin_users('learner','pending',1);
 assert (result->>'total')::int=1, 'Server email/status filtering';
 assert jsonb_array_length(result->'users')=1, 'Bounded results';
 perform public.admin_change_user('90000000-0000-4000-8000-000000000002','user_approved');
 result:=public.admin_user_detail('90000000-0000-4000-8000-000000000002');
 assert result->>'status'='active', 'Approve transition';
 assert result->>'approved_by'=auth.uid()::text, 'Approval attribution';
 begin
   perform public.admin_change_user('90000000-0000-4000-8000-000000000002','user_approved');
   raise exception 'Repeated approval succeeded';
 exception when serialization_failure then null; end;
 perform public.admin_change_user('90000000-0000-4000-8000-000000000002','user_suspended');
 assert public.admin_user_detail('90000000-0000-4000-8000-000000000002')->>'status'='suspended','Suspension';
 perform public.admin_change_user('90000000-0000-4000-8000-000000000002','user_reactivated');
 perform public.admin_change_user('90000000-0000-4000-8000-000000000003','user_rejected');
 begin
   perform public.admin_change_user('90000000-0000-4000-8000-000000000003','user_approved');
   raise exception 'Rejected approval succeeded';
 exception when serialization_failure then null; end;
 begin
   perform public.admin_change_user(auth.uid(),'user_suspended');
   raise exception 'Self suspension succeeded';
 exception when insufficient_privilege then null; end;
 begin
   perform public.admin_change_user('90000000-0000-4000-8000-000000000009','user_approved');
   raise exception 'Missing target succeeded';
 exception when no_data_found then null; end;
 perform public.admin_change_user('90000000-0000-4000-8000-000000000002','user_updated',
 '{"level":"b1_intermediate","goal":"work","daily_minutes":15,"timezone":"Asia/Tehran","interface_language":"fa","theme_preference":"auto"}');
 assert public.admin_user_detail('90000000-0000-4000-8000-000000000002')->>'level'='b1_intermediate','Validated edit';
 begin
   perform public.admin_change_user('90000000-0000-4000-8000-000000000002','user_updated','{"role":"admin"}');
   raise exception 'Arbitrary field accepted';
 exception when invalid_parameter_value then null; end;
 result:=public.admin_audit();
 assert (result->>'total')::int=5,'Exactly one audit per successful mutation';
 assert not (result::text like '%password%'),'No password audit data';
end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
insert into public.daily_lessons(user_id,date,sentence,reading_text,speaking_task) values(auth.uid(),current_date,'x','x','x');
do $$ begin assert (select count(*)=1 from public.daily_lessons where user_id=auth.uid()),'Active learning works'; end $$;
insert into public.conversations(id,user_id,topic) values('90000000-0000-4000-8000-000000000010',auth.uid(),'work');
reset role;
update public.users_profile set status='suspended' where user_id='90000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
 assert not public.has_active_account(),'Suspended denied';
 begin
   perform public.insert_assistant_conversation_message('90000000-0000-4000-8000-000000000010','blocked','[]','request');
   raise exception 'Suspended SECURITY DEFINER message insert allowed';
 exception when insufficient_privilege then null; end;
 assert (select count(*)=0 from public.daily_lessons),'Suspended learning reads denied';
end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000003',true);
do $$ begin assert not public.has_active_account(),'Rejected denied'; end $$;
reset role;
-- Force audit failure and verify status mutation rolls back with it.
create function public.test_reject_audit() returns trigger language plpgsql as $$ begin raise exception 'Fixture failure'; end $$;
create trigger test_reject_audit before insert on public.admin_audit_logs for each row execute function public.test_reject_audit();
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform public.admin_change_user('90000000-0000-4000-8000-000000000002','user_reactivated');
 exception when raise_exception then null; end;
 assert public.admin_user_detail('90000000-0000-4000-8000-000000000002')->>'status'='suspended','Audit failure rolls back mutation';
end $$;
reset role;
update auth.users set raw_app_meta_data='{}' where id='90000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
 assert not public.is_app_admin(),'Role revocation is immediate';
 begin perform public.admin_audit(); raise exception 'Revoked admin read allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.admin_users(); raise exception 'Anonymous admin read allowed';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
