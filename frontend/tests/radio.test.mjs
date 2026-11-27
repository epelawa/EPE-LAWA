import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const read=(p)=>readFile(path.join(root,p),'utf8');

test('radio page uses direct streams for Radio Lagos and Guts FM', async()=>{
 const player=await read('frontend/apps/main/components/radio-player.tsx');
 const station=await read('frontend/apps/main/lib/radio-lagos.ts');
 const page=await read('frontend/apps/main/app/radio/page.tsx');
 const guts=await read('frontend/apps/main/lib/guts-radio.ts');
 // Exact source strings, not unanchored URL regexes (CodeQL js/incomplete-url-regexp).
 assert.ok(station.includes('"https://azstream.elektranbroadcast.com/listen/radiolagos1075/radio.mp3"'));
 assert.doesNotMatch(station,/puzzofme/);
 // Turn 5 redesign: playback moved into one shared store (lib/radio-store.ts) so the
 // site-wide mini-player keeps the same stream running across pages.
 const store=await read('frontend/apps/main/lib/radio-store.ts');
 assert.match(store,/element\.src = station\.streamUrl/);
 assert.match(store,/RADIO_LAGOS_1075/); assert.match(store,/GUTS_FM/);
 assert.ok(guts.includes('streamUrl: "https://stream.voltsradio.com/listen/cfm/radio.mp3"'));
 assert.doesNotMatch(guts + player + store,/NAIJA_RADIO_API_KEY|puzzofme/);
 assert.doesNotMatch(page,/listeningPerks|Better Listening Desk/);
 assert.match(page,/The sound of Epe\./);
 assert.match(player,/className=\{styles\.playButton\}/);
 // Removed at the owner's request: provider credit, idle status pill, song requests and the archive.
 assert.doesNotMatch(player+page,/Station catalogue|Naija Radio|No EPE LAWA programme is scheduled right now|SongRequestModal|Request a song|radio\/archive/);
 assert.ok(page.indexOf("<RadioPlayer") < page.indexOf("Keep exploring"));
 assert.match(page,/href="\/radio\/programmes"/); assert.match(page,/href="\/radio\/reminders"/);
});

test('radio landing hero and player use the light color scheme',async()=>{
 const pageStyles=await read('frontend/apps/main/app/radio/radio-page.module.css');
 const playerStyles=await read('frontend/apps/main/components/radio-player.module.css');
 const page=await read('frontend/apps/main/app/radio/page.tsx');
 assert.match(pageStyles,/\.hero\s*\{\s*background:\s*#F1F4FA;\s*color:\s*#17264A;/);
 assert.match(pageStyles,/\.heroTitle\s*\{[^}]*color:\s*#17264A;/);
 assert.match(playerStyles,/--player-bg:\s*#FFFFFF/);
 assert.match(playerStyles,/--player-text:\s*#17264A/);
 assert.match(playerStyles,/--player-muted:\s*#53627A/);
 assert.doesNotMatch(pageStyles+playerStyles,/background:\s*#0A1023|color:\s*#F1F4FA/);
 assert.match(page,/className=\{styles\.playerPosition\}/);
 assert.match(pageStyles,/\.playerPosition\s*\{\s*transform:\s*translateY\(-12px\);\s*\}/);
 assert.match(pageStyles,/@media \(max-width: 900px\)\s*\{[\s\S]*?\.playerPosition\s*\{\s*transform:\s*none;/);
});

test('public programmes continue to use database records',async()=>{
 const page=await read('frontend/apps/main/app/radio/programmes/page.tsx');
 for(const table of ['programmes','radio_schedule']) assert.match(page,new RegExp(`from\\(["']${table}["']\\)`));
 // Turn 5: the public archive was removed, so published episodes are no longer read here.
 assert.doesNotMatch(page,/from\(["']episodes["']\)/);
 assert.match(page,/No programmes published yet/); assert.match(page,/No schedule published yet/);
});

test('Radio admin distinguishes failed data reads from empty catalogues',async()=>{
 const page=await read('frontend/apps/admin/app/(protected)/radio/page.tsx');
 for(const section of ['programmes','schedules']) assert.match(page,new RegExp(`error: ${section}Error`));
 // Turn 5: the episode (archive) editor was removed from admin at the owner's request.
 assert.doesNotMatch(page,/from\("episodes"\)|saveEpisode|deleteEpisode/);
 assert.match(page,/failedSections\.length > 0/);
 assert.ok(page.indexOf('if (failedSections.length > 0)') < page.indexOf('const programmeForm'));
 assert.match(page,/Radio records could not be loaded/);
 assert.match(page,/No empty catalogue is inferred and no editing forms are shown/);
 assert.match(page,/No schedule slots/);
});

test('Radio writes use one verified-capability RPC instead of direct PostgREST writes',async()=>{
 const actions=await read('frontend/apps/admin/app/(protected)/radio/actions.ts');
 const page=await read('frontend/apps/admin/app/(protected)/radio/page.tsx');
 const migration=await read('backend/supabase/migrations/20261107232000_radio_atomic_authoring.sql');
 for(const action of ['saveProgramme','saveSchedule']) assert.match(actions,new RegExp(`export async function ${action}`));
 assert.doesNotMatch(actions,/export async function (saveEpisode|deleteEpisode)/);
 assert.match(actions,/radio_authoring_save/);
 assert.match(actions,/has_capability/);
 assert.doesNotMatch(actions,/from\("(programmes|episodes|radio_schedule|radio_rights_records)"\)\.(insert|update)/);
 assert.match(page,/await createStaffClient\(\)/);
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

test('Radio staff can edit schedule and programme revisions',async()=>{
 const page=await read('frontend/apps/admin/app/(protected)/radio/page.tsx');
 const actions=await read('frontend/apps/admin/app/(protected)/radio/actions.ts');
 for(const field of ['day_of_week','starts_at','ends_at','note','programme_id','publication_status','description','name']) assert.match(page,new RegExp(`name="${field}"`));
 assert.match(page,/name="id" value=\{s\.id\}/);
 assert.match(page,/name="revision" value=\{s\.revision\}/);
 assert.match(page,/name="id" value=\{p\.id\}/);
 assert.match(page,/name="revision" value=\{p\.revision\}/);
 assert.match(actions,/save\(db, "schedule", id, rev/);
 assert.match(actions,/radio=\$\{encodeURIComponent\(code\)\}/);
 assert.match(page,/Fresh rights\/source note \(private\)/);
 assert.match(page,/aria-live/);
 assert.doesNotMatch(actions,/rights_note.*console\.(log|error)/);
});
