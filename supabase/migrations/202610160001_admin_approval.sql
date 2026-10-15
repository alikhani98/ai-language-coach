-- Existing Auth accounts retain access; future accounts require manual approval.
-- Apply once through the migration ledger, inside a transaction.
begin;
-- Prevent a registration from slipping between legacy backfill and trigger installation.
lock table auth.users in share row exclusive mode;
alter table public.users_profile
  add column status text not null default 'active'
    constraint users_profile_status_check check (status in ('pending','active','suspended','rejected')),
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users(id) on delete set null;
insert into public.users_profile(user_id,level,goal,status,created_at)
  select id,'','','active',created_at from auth.users
  on conflict (user_id) do nothing;
alter table public.users_profile alter column status set default 'pending';
create index users_profile_status_created_idx on public.users_profile(status,created_at desc,user_id);

create function public.create_pending_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users_profile(user_id,level,goal,created_at) values(new.id,'','',new.created_at);
  return new;
end $$;
revoke all on function public.create_pending_profile() from public,anon,authenticated;
create trigger create_pending_profile after insert on auth.users
  for each row execute function public.create_pending_profile();

-- Fresh owner-controlled Auth metadata, never user_metadata or a browser flag.
create function public.is_app_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u join public.users_profile p on p.user_id=u.id
    where u.id=auth.uid() and u.raw_app_meta_data->>'role'='admin' and p.status='active');
$$;
revoke all on function public.is_app_admin() from public,anon;
grant execute on function public.is_app_admin() to authenticated;

-- Column grants prevent self-approval, owner changes and deleting/recreating profiles.
revoke insert,update,delete on public.users_profile from authenticated,anon;
grant update(level,goal,daily_minutes,timezone,interface_language,theme_preference)
  on public.users_profile to authenticated;
drop policy "Users can insert own profile" on public.users_profile;
drop policy "Users can delete own profile" on public.users_profile;

create table public.admin_audit_logs(
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check(action in ('user_approved','user_rejected','user_suspended','user_reactivated','user_updated')),
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=4096),
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon,authenticated;
create index admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc,id);
create index admin_audit_logs_target_idx on public.admin_audit_logs(target_user_id,created_at desc);

create function public.has_active_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users_profile where user_id=auth.uid() and status='active');
$$;
revoke all on function public.has_active_account() from public,anon;
grant execute on function public.has_active_account() to authenticated;
-- Restrictive policies preserve all existing ownership checks.
do $$ declare t text; begin
  foreach t in array array['daily_lessons','conversations','conversation_messages','mistakes','practice_logs','learning_memory'] loop
    execute format('create policy "Active account required" on public.%I as restrictive for all to authenticated using ((select public.has_active_account())) with check ((select public.has_active_account()))',t);
  end loop;
end $$;
-- The existing SECURITY DEFINER message RPC bypasses RLS: guard its insert too.
create function public.guard_learning_message() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.has_active_account() then
    raise exception 'Active account required' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.guard_learning_message() from public,anon,authenticated;
create trigger active_message_account before insert on public.conversation_messages
for each row execute function public.guard_learning_message();

create function public.admin_change_user(p_target uuid,p_action text,p_profile jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare before_row public.users_profile; next_status text; expected text; changes jsonb; k text;
begin
  if not public.is_app_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into before_row from public.users_profile where user_id=p_target for update;
  if not found then raise exception 'Target missing' using errcode='P0002'; end if;
  if p_target=auth.uid() then raise exception 'Self modification denied' using errcode='42501'; end if;
  if p_action='user_updated' then
    if p_profile is null or jsonb_typeof(p_profile)<>'object' or octet_length(p_profile::text)>2048
      or not (p_profile ?& array['level','goal','daily_minutes','timezone','interface_language','theme_preference']) then
      raise exception 'Invalid profile' using errcode='22023';
    end if;
    for k in select jsonb_object_keys(p_profile) loop
      if not k=any(array['level','goal','daily_minutes','timezone','interface_language','theme_preference']) then
        raise exception 'Invalid field' using errcode='22023';
      end if;
    end loop;
    if not (p_profile->>'level'=any(array['a1_beginner','a2_elementary','b1_intermediate','b2_upper_intermediate','c1_advanced']))
      or not (p_profile->>'goal'=any(array['conversation','work','travel','exam','personal_growth']))
      or not (p_profile->>'daily_minutes'=any(array['10','15','30']))
      or not (p_profile->>'interface_language'=any(array['en','fa']))
      or not (p_profile->>'theme_preference'=any(array['light','dark','system','auto']))
      or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_profile->>'timezone')
      or exists(select 1 from jsonb_each(p_profile) where value='null'::jsonb) then
      raise exception 'Invalid profile' using errcode='22023';
    end if;
    update public.users_profile set level=p_profile->>'level',goal=p_profile->>'goal',
      daily_minutes=(p_profile->>'daily_minutes')::integer,timezone=p_profile->>'timezone',
      interface_language=p_profile->>'interface_language',theme_preference=p_profile->>'theme_preference'
      where user_id=p_target;
    select coalesce(jsonb_object_agg(key,jsonb_build_object('from',to_jsonb(before_row)->key,'to',value)),'{}') into changes
      from jsonb_each(p_profile) where to_jsonb(before_row)->key is distinct from value;
    if changes='{}'::jsonb then return; end if;
  else
    select x.old,x.new into expected,next_status from (values
      ('user_approved','pending','active'),('user_rejected','pending','rejected'),
      ('user_suspended','active','suspended'),('user_reactivated','suspended','active')) x(action,old,new)
      where x.action=p_action;
    if expected is null or before_row.status<>expected then raise exception 'Invalid transition' using errcode='40001'; end if;
    update public.users_profile set status=next_status,
      approved_at=case when p_action='user_approved' then now() else approved_at end,
      approved_by=case when p_action='user_approved' then auth.uid() else approved_by end
      where user_id=p_target and status=expected;
    changes:=jsonb_build_object('status',jsonb_build_object('from',expected,'to',next_status));
  end if;
  insert into public.admin_audit_logs(admin_user_id,target_user_id,action,metadata)
    values(auth.uid(),p_target,p_action,jsonb_build_object('changes',changes));
end $$;
revoke all on function public.admin_change_user(uuid,text,jsonb) from public,anon;
grant execute on function public.admin_change_user(uuid,text,jsonb) to authenticated;

-- Bounded read RPC avoids copying Auth email into a second user table or N+1 Auth calls.
create function public.admin_users(p_search text default '',p_status text default '',p_page integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_app_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_search is null or p_status is null or p_page is null or length(p_search)>100 or p_page not between 1 and 10000 or p_status not in ('','pending','active','suspended','rejected') then
    raise exception 'Invalid filter' using errcode='22023'; end if;
  with filtered as materialized (
    select p.user_id,p.level,p.status,u.email,p.created_at from public.users_profile p join auth.users u on u.id=p.user_id
      where (p_status='' or p.status=p_status) and (p_search='' or position(lower(p_search) in lower(u.email))>0)
  ) select jsonb_build_object('total',(select count(*) from filtered),'users',coalesce((select jsonb_agg(to_jsonb(x)) from
    (select * from filtered order by created_at desc,user_id limit 25 offset (p_page-1)*25) x),'[]'::jsonb),
    'counts',(select jsonb_object_agg(status,n) from (select status,count(*) n from public.users_profile group by status) c)) into result;
  return result;
end $$;
create function public.admin_user_detail(p_target uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  return (select jsonb_build_object('id',p.id,'user_id',p.user_id,'level',p.level,'goal',p.goal,
      'daily_minutes',p.daily_minutes,'timezone',p.timezone,'interface_language',p.interface_language,
      'theme_preference',p.theme_preference,'status',p.status,'created_at',p.created_at,
      'approved_at',p.approved_at,'approved_by',p.approved_by,'email',u.email,'last_sign_in_at',u.last_sign_in_at,
      'memory',(select jsonb_build_object('snapshot',m.snapshot,'as_of',m.as_of) from public.learning_memory m where m.user_id=p.user_id))
    from public.users_profile p join auth.users u on u.id=p.user_id where p.user_id=p_target);
end $$;
create function public.admin_audit(p_page integer default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_page is null or p_page not between 1 and 10000 then raise exception 'Invalid page' using errcode='22023'; end if;
  return jsonb_build_object('total',(select count(*) from public.admin_audit_logs),'logs',coalesce((select jsonb_agg(to_jsonb(x)) from
    (select * from public.admin_audit_logs order by created_at desc,id limit 25 offset (p_page-1)*25) x),'[]'::jsonb));
end $$;
revoke all on function public.admin_users(text,text,integer),public.admin_user_detail(uuid),public.admin_audit(integer) from public,anon;
grant execute on function public.admin_users(text,text,integer),public.admin_user_detail(uuid),public.admin_audit(integer) to authenticated;
commit;
