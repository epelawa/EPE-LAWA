import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root=new URL("../../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");
test("map correction intake stays private and approved knowledge is the only public source",async()=>{
 const sql=await read("backend/supabase/migrations/20261203120000_map_correction_review_queue.sql");
 const submission=sql.slice(sql.indexOf("create table public.map_correction_submissions"),sql.indexOf("create table public.map_verified_knowledge"));
 const verified=sql.slice(sql.indexOf("create table public.map_verified_knowledge"),sql.indexOf("create or replace function public.map_correction_decide"));
 assert.match(submission,/status text not null default 'pending'/);assert.match(submission,/enable row level security/);assert.match(submission,/revoke all on public\.map_correction_submissions from public, anon, authenticated/);assert.match(submission,/grant select on public\.map_correction_submissions to authenticated/);assert.match(submission,/using \(public\.has_capability\('map\.review'\)\)/);assert.doesNotMatch(submission,/grant (?:select|insert) .* to anon/i);
 assert.match(submission,/directions_query text,/);assert.match(submission,/source_note text,/);assert.match(submission,/source_url text,/);assert.match(verified,/grant select \(id,place_name,details,directions_query,latitude,longitude,source_note,verified_at,verified_by,status\) on public\.map_verified_knowledge to anon, authenticated/);assert.match(verified,/using \(status = 'active'\)/);assert.match(verified,/map_verified_coords_pair/);assert.match(verified,/between -90 and 90/);assert.match(verified,/between -180 and 180/);assert.match(verified,/map_verified_epe_bounds/);
});
test("map approval is capability-gated, active verified staff-only, atomic/idempotent, and audited",async()=>{
 const sql=await read("backend/supabase/migrations/20261203120000_map_correction_review_queue.sql");const rpc=sql.slice(sql.indexOf("create or replace function public.map_correction_decide"));
 assert.match(sql,/insert into public\.capabilities\(key, description\).*'map\.review'/);assert.match(rpc,/email_confirmed_at is not null and p\.is_active/);assert.match(rpc,/has_capability\('map\.review'\)/);assert.match(rpc,/for update/);assert.match(rpc,/status <> 'pending' or v_submission\.reviewed_at is not null/);assert.match(rpc,/insert into public\.map_verified_knowledge/);assert.match(rpc,/update public\.map_correction_submissions/);assert.match(rpc,/public\.audit_event\('staff','map\.correction_decide'/);assert.match(rpc,/verified_https_source_required/);assert.match(rpc,/revoke all on function public\.map_correction_decide.*from public, anon/);
 const page=await read("frontend/apps/admin/app/(protected)/map-corrections/page.tsx");const action=await read("frontend/apps/admin/app/(protected)/map-corrections/actions.ts");assert.match(page,/p_capability:\s*"map\.review"/);assert.match(action,/p_capability: "map\.review"/);assert.match(action,/map_correction_decide/);assert.match(page,/No submission details are shown/);
});
