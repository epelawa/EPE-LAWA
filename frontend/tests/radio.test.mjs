import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const read=(p)=>readFile(path.join(root,p),'utf8');

test('radio page uses direct Lagos stream and a server-side Guts lookup', async()=>{
 const player=await read('frontend/apps/main/components/radio-player.tsx');
 const station=await read('frontend/apps/main/lib/radio-lagos.ts');
 const page=await read('frontend/apps/main/app/radio/page.tsx');
 const lookup=await read('frontend/apps/main/lib/guts-radio.ts');
 assert.match(station,/https:\/\/azstream\.elektranbroadcast\.com\/listen\/radiolagos1075\/radio\.mp3/);
 assert.doesNotMatch(station,/puzzofme/);
 assert.match(player,/src=\{station\.streamUrl\}/);
 assert.match(player,/Radio Lagos/); assert.match(player,/Guts FM/);
 assert.match(lookup,/NAIJA_RADIO_API_KEY/); assert.doesNotMatch(player,/NAIJA_RADIO_API_KEY/);
 assert.doesNotMatch(page,/listeningPerks|Better Listening Desk/);
 assert.match(page,/href="\/radio\/programmes"/); assert.match(page,/href="\/radio\/reminders"/);
});

test('public programmes continue to use database records',async()=>{
 const page=await read('frontend/apps/main/app/radio/programmes/page.tsx');
 for(const table of ['programmes','radio_schedule','episodes']) assert.match(page,new RegExp(`from\\(["']${table}["']\\)`));
 assert.match(page,/No programmes published yet/); assert.match(page,/No schedule published yet/);
});

test('Radio admin distinguishes failed data reads from empty catalogues',async()=>{
 const page=await read('frontend/apps/admin/app/(protected)/radio/page.tsx');
 for(const section of ['programmes','episodes','schedules']) assert.match(page,new RegExp(`error: ${section}Error`));
 assert.match(page,/failedSections\.length > 0/);
 assert.ok(page.indexOf('if (failedSections.length > 0)') < page.indexOf('const programmeForm'));
 assert.match(page,/Radio records could not be loaded/);
 assert.match(page,/No empty catalogue is inferred and no editing forms are shown/);
 assert.match(page,/No schedule slots/);
 assert.match(page,/No episodes/);
});

test('Radio writes use one verified-capability RPC instead of direct PostgREST writes',async()=>{
 const actions=await read('frontend/apps/admin/app/(protected)/radio/actions.ts');
 const page=await read('frontend/apps/admin/app/(protected)/radio/page.tsx');
 const migration=await read('backend/supabase/migrations/20261107232000_radio_atomic_authoring.sql');
 for(const action of ['saveProgramme','saveSchedule','saveEpisode']) assert.match(actions,new RegExp(`export async function ${action}`));
 assert.match(actions,/radio_authoring_save/);
 assert.match(actions,/has_capability/);
 assert.doesNotMatch(actions,/from\("(programmes|episodes|radio_schedule|radio_rights_records)"\)\.(insert|update)/);
 assert.match(page,/await createClient\(\)/);
 assert.match(page,/has_capability/);
 assert.match(migration,/perform public\.require_capability\('radio\.manage'\)/);
 assert.match(migration,/revoke insert, update, delete on public\.programmes, public\.episodes, public\.radio_schedule/);
 assert.match(migration,/revoke all on public\.radio_rights_records/);
});

test('Radio publication saves rights atomically, audits no note text and rejects stale revisions',async()=>{
 const migration=await read('backend/supabase/migrations/20261107232000_radio_atomic_authoring.sql');
 assert.match(migration,/p_expected_revision/);
 assert.match(migration,/v_status is null or v_status not in/);
 assert.match(migration,/revision=revision\+1 where id=p_id and revision=p_expected_revision/);
 assert.match(migration,/radio_revision_conflict/);
 assert.match(migration,/published_radio_requires_rights_note/);
 assert.match(migration,/insert into public\.radio_rights_records/);
 assert.match(migration,/jsonb_build_object\('publication_status',v_status,'revision',v_revision/);
 assert.match(migration,/'rights_note_recorded',nullif\(btrim\(coalesce\(p_rights_note/);
 assert.doesNotMatch(migration,/'rights_note'\s*,\s*p_rights_note/);
	 assert.match(migration,/radio_rights_records_recorded_by_idx/);
});

test('Radio staff can edit schedule and episode revisions without changing episode slugs',async()=>{
 const page=await read('frontend/apps/admin/app/(protected)/radio/page.tsx');
 const actions=await read('frontend/apps/admin/app/(protected)/radio/actions.ts');
 for(const field of ['day_of_week','starts_at','ends_at','note','programme_id','publication_status','aired_on','external_url','description','title']) assert.match(page,new RegExp(`name="${field}"`));
 assert.match(page,/name="id" value=\{s\.id\}/);
 assert.match(page,/name="revision" value=\{s\.revision\}/);
 assert.match(page,/name="id" value=\{e\.id\}/);
 assert.match(page,/name="revision" value=\{e\.revision\}/);
 assert.match(actions,/save\(db, "schedule", id, rev/);
 assert.match(actions,/save\(db, "episode", id, rev/);
 assert.match(actions,/slug = data\.slug/);
 assert.match(actions,/radio=\$\{encodeURIComponent\(code\)\}/);
 assert.match(page,/Fresh rights\/source note \(private\)/);
 assert.match(page,/aria-live/);
 assert.doesNotMatch(actions,/rights_note.*console\.(log|error)/);
});
