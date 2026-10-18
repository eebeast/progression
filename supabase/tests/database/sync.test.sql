begin;
create extension if not exists pgtap with schema extensions;
select plan(19);
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
select throws_ok($$select public.sync_pull()$$,'42501','Authentication required','anonymous RPC checks auth');
set local role anon;
select throws_ok($$select public.sync_pull()$$,'42501',null,'anonymous cannot execute RPC');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select throws_ok($$select * from workout_private.records$$,'42501',null,'browser cannot read private payload tables');
select throws_ok($$insert into workout_private.records values ('10000000-0000-0000-0000-000000000001','runs','evil',1,'{}',now())$$,'42501',null,'browser cannot bypass revision RPC');
select is(public.sync_push('20000000-0000-0000-0000-000000000001',
 '[{"store":"runs","id":"run-a","baseVersion":0,"data":{"id":"run-a","date":1,"distanceKm":5,"durationSeconds":1500}}]')->>'status','accepted','create accepted');
select is(public.sync_push('20000000-0000-0000-0000-000000000001',
 '[{"store":"runs","id":"run-a","baseVersion":0,"data":{"id":"run-a","date":1,"distanceKm":5,"durationSeconds":1500}}]')->>'status','accepted','same operation is replayable');
select is(jsonb_array_length(public.sync_pull()->'changes'),1,'replay appends no extra change');
select throws_ok($$select public.sync_push('20000000-0000-0000-0000-000000000001','[{"store":"runs","id":"run-a","baseVersion":1,"data":null}]')$$,
 '22023','Operation ID reused with another payload','operation identity is bound to immutable payload');
select is(public.sync_push('20000000-0000-0000-0000-000000000002',
 '[{"store":"runs","id":"run-a","baseVersion":0,"data":{"id":"run-a","distanceKm":9}}]')->>'status','conflict','stale edit is explicit conflict');
select is(public.sync_pull()->>'cursor','1','conflict does not advance accepted journal');
select throws_ok($$select public.sync_push('20000000-0000-0000-0000-000000000003','[{"store":"runs","id":"bad","data":{}}]')$$,
 '22023','Invalid mutation','missing revision cannot bypass version checks');
select is(public.sync_push('20000000-0000-0000-0000-000000000004',
 '[{"store":"runs","id":"run-b","baseVersion":0,"data":{"id":"run-b"}},
   {"store":"logs","id":"set-a","baseVersion":0,"data":{"id":"set-a","sessionId":"missing","exerciseId":"missing"}}]')->>'status','rejected','invalid relationship rejects atomic group');
select is(jsonb_array_length(public.sync_pull()->'changes'),1,'rejected group rolls back all writes');
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select is(jsonb_array_length(public.sync_pull()->'changes'),0,'another account sees no first-account changes');
select is(public.sync_push('20000000-0000-0000-0000-000000000001',
 '[{"store":"runs","id":"run-a","baseVersion":0,"data":{"id":"run-a","distanceKm":1}}]')->>'status','accepted','IDs are scoped to account');
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select is(public.sync_push('20000000-0000-0000-0000-000000000005',
 '[{"store":"runs","id":"run-a","baseVersion":1,"data":null}]')->>'status','accepted','delete is revisioned');
select is(public.sync_pull(1,1)->'changes'->0->'data','null'::jsonb,'deletion appears as tombstone');
select is(public.sync_pull(0,1)->>'hasMore','true','pull is paginated');
select is(public.sync_push('20000000-0000-0000-0000-000000000006',
 '[{"store":"runs","id":"run-a","baseVersion":1,"data":{"id":"run-a","distanceKm":8}}]')->>'status','conflict','stale edit cannot resurrect deleted record');
select * from finish();
rollback;
