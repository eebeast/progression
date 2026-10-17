-- Private payload storage preserves legacy values; only the versioned RPC can mutate it.
create schema if not exists workout_private;
revoke all on schema workout_private from public, anon, authenticated;

create table workout_private.account_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sequence bigint not null default 0
);
create table workout_private.records (
  user_id uuid not null references auth.users(id) on delete cascade,
  store text not null check (store in ('settings','exercises','templates','sessions','logs','runs','bodyWeights','programOrder')),
  id text not null check (length(id) between 1 and 200),
  version bigint not null check (version > 0),
  data jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, store, id)
);
create table workout_private.receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request jsonb not null,
  result jsonb not null,
  primary key(user_id, operation_id)
);
create table workout_private.changes (
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence bigint not null,
  store text not null,
  id text not null,
  version bigint not null,
  data jsonb,
  primary key(user_id, sequence)
);

-- RLS is defense in depth; the schema has no browser grants or direct API exposure.
alter table workout_private.account_state enable row level security;
alter table workout_private.records enable row level security;
alter table workout_private.receipts enable row level security;
alter table workout_private.changes enable row level security;
create policy owner_read on workout_private.records for select to authenticated using (user_id = (select auth.uid()));
create policy owner_read on workout_private.changes for select to authenticated using (user_id = (select auth.uid()));
create policy owner_read on workout_private.receipts for select to authenticated using (user_id = (select auth.uid()));
create policy owner_read on workout_private.account_state for select to authenticated using (user_id = (select auth.uid()));

create function public.sync_push(operation_id uuid, mutations jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  old_receipt workout_private.receipts%rowtype;
  current_row workout_private.records%rowtype;
  m jsonb; related jsonb; result_rows jsonb := '[]'; answer jsonb;
  next_sequence bigint; expected bigint; next_version bigint; changed boolean;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if operation_id is null or jsonb_typeof(mutations) <> 'array' or jsonb_array_length(mutations) not between 1 and 1000
    or octet_length(mutations::text) > 2000000 then
    raise exception 'Invalid operation batch' using errcode = '22023';
  end if;
  insert into workout_private.account_state(user_id) values (owner) on conflict do nothing;
  -- This lock is held to transaction commit, so change sequences also reflect commit order.
  select sequence into next_sequence from workout_private.account_state where user_id = owner for update;
  select * into old_receipt from workout_private.receipts r where r.user_id = owner and r.operation_id = sync_push.operation_id;
  if found then
    if old_receipt.request <> mutations then raise exception 'Operation ID reused with another payload' using errcode = '22023'; end if;
    return old_receipt.result;
  end if;

  if (select count(*) from jsonb_array_elements(mutations)) <>
     (select count(distinct (v->>'store',v->>'id')) from jsonb_array_elements(mutations) v) then
    raise exception 'Duplicate record in atomic group' using errcode = '22023';
  end if;
  foreach m in array array(select value from jsonb_array_elements(mutations)) loop
    if m->>'store' not in ('settings','exercises','templates','sessions','logs','runs','bodyWeights','programOrder')
      or m->>'store' is null or coalesce(length(m->>'id'),0) not between 1 and 200
      or jsonb_typeof(m->'baseVersion') is distinct from 'number' or (m->>'baseVersion') !~ '^[0-9]+$'
      or not (m ? 'data') or (m->'data' <> 'null'::jsonb and
        (jsonb_typeof(m->'data') <> 'object' or m->'data'->>'id' is distinct from m->>'id')) then
      raise exception 'Invalid mutation' using errcode = '22023';
    end if;
    expected := (m->>'baseVersion')::bigint;
    select * into current_row from workout_private.records where user_id = owner and store = m->>'store' and id = m->>'id';
    result_rows := result_rows || jsonb_build_array(jsonb_build_object('store',m->>'store','id',m->>'id',
      'version',coalesce(current_row.version,0),'data',current_row.data));
    if coalesce(current_row.version,0) <> expected then
      -- A second client can safely claim the exact same original record, without a new revision.
      if not (expected = 0 and current_row.version = 1 and current_row.data = m->'data') then changed := true; end if;
    end if;
  end loop;
  if changed then
    answer := jsonb_build_object('status','conflict','records',result_rows,'error','Competing edit requires review');
    insert into workout_private.receipts values(owner, operation_id, mutations, answer);
    return answer;
  end if;

  -- A subtransaction ensures validation failures cannot partially apply an atomic group.
  begin
    result_rows := '[]';
    foreach m in array array(select value from jsonb_array_elements(mutations)) loop
      select * into current_row from workout_private.records where user_id = owner and store = m->>'store' and id = m->>'id';
      if (m->>'baseVersion')::bigint = 0 and current_row.version = 1 and current_row.data = m->'data' then
        next_version := 1;
      else
        next_version := coalesce(current_row.version,0) + 1;
        insert into workout_private.records(user_id,store,id,version,data)
          values(owner,m->>'store',m->>'id',next_version,nullif(m->'data','null'::jsonb))
          on conflict(user_id,store,id) do update set version = excluded.version, data = excluded.data, updated_at = now();
        next_sequence := next_sequence + 1;
        insert into workout_private.changes values(owner,next_sequence,m->>'store',m->>'id',next_version,nullif(m->'data','null'::jsonb));
      end if;
      result_rows := result_rows || jsonb_build_array(jsonb_build_object('store',m->>'store','id',m->>'id','version',next_version,'data',m->'data'));
    end loop;

    -- Validate the final group state, including reverse relationships after deletes.
    -- Every lookup includes owner; a client cannot reference another account's entity.
    for current_row in select * from workout_private.records where user_id = owner and data is not null loop
      if current_row.store = 'logs' then
        if not exists(select 1 from workout_private.records where user_id = owner and store = 'sessions' and id = current_row.data->>'sessionId' and data is not null)
          or not exists(select 1 from workout_private.records where user_id = owner and store = 'exercises' and id = current_row.data->>'exerciseId' and data is not null) then
          raise exception 'A set references a missing session or exercise' using errcode = '23503';
        end if;
      elsif current_row.store in ('templates','sessions') then
        if current_row.store = 'templates' and jsonb_typeof(current_row.data->'exercises') is distinct from 'array' then
          raise exception 'A plan must contain exercise assignments' using errcode = '23514';
        end if;
        if current_row.data ? 'exercises' then
          if jsonb_typeof(current_row.data->'exercises') <> 'array' then raise exception 'Invalid exercise list' using errcode = '23514'; end if;
          for related in select value from jsonb_array_elements(current_row.data->'exercises') loop
            if not exists(select 1 from workout_private.records where user_id = owner and store = 'exercises' and id = related->>'exerciseId' and data is not null) then
              raise exception 'An assignment references a missing exercise' using errcode = '23503';
            end if;
          end loop;
        end if;
      elsif current_row.store = 'programOrder' then
        if jsonb_typeof(current_row.data->'orderedIds') is distinct from 'array' then raise exception 'Invalid rotation' using errcode = '23514'; end if;
        if exists(select 1 from jsonb_array_elements_text(current_row.data->'orderedIds') v
          where not exists(select 1 from workout_private.records where user_id = owner and store = 'templates' and id = v and data is not null)) then
          raise exception 'Rotation references missing plan' using errcode = '23503';
        end if;
      end if;
    end loop;
    update workout_private.account_state set sequence = next_sequence where user_id = owner;
    answer := jsonb_build_object('status','accepted','records',result_rows);
  exception when integrity_constraint_violation then
    answer := jsonb_build_object('status','rejected','records','[]'::jsonb,'error',sqlerrm);
  end;
  insert into workout_private.receipts values(owner, operation_id, mutations, answer);
  return answer;
end $$;

create function public.sync_pull(after_sequence bigint default 0, page_size integer default 200)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); changes jsonb; last_sequence bigint;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if after_sequence < 0 or after_sequence is null or page_size not between 1 and 500 or page_size is null then
    raise exception 'Invalid cursor or page size' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('sequence',c.sequence,'store',c.store,'id',c.id,'version',c.version,'data',c.data) order by c.sequence),'[]'),
    coalesce(max(c.sequence),after_sequence) into changes,last_sequence
    from (select * from workout_private.changes where user_id = owner and sequence > after_sequence order by sequence limit page_size) c;
  return jsonb_build_object('changes',changes,'cursor',last_sequence,'hasMore',
    exists(select 1 from workout_private.changes where user_id = owner and sequence > last_sequence));
end $$;

revoke all on function public.sync_push(uuid,jsonb) from public, anon;
revoke all on function public.sync_pull(bigint,integer) from public, anon;
grant execute on function public.sync_push(uuid,jsonb) to authenticated;
grant execute on function public.sync_pull(bigint,integer) to authenticated;
