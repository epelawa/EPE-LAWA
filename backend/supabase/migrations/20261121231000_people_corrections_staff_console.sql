-- The People staff console could not load open correction submissions: the table
-- shipped without authenticated grants or policies, so every staff SELECT was
-- denied. It also fills two column-grant gaps the console page reads.

-- Staff (and a submitter for their own rows) can read the correction queue.
grant select (id, person_id, submitted_by, claim, evidence, state, created_at, resolved_by, resolved_at, updated_at)
  on table public.people_corrections to authenticated;

-- Console page reads the achievements text and the optimistic-lock revision.
grant select (achievements, revision)
  on table public.people to authenticated;

-- Console page reads the verification note and its linked source.
grant select (source_id, note)
  on table public.people_verifications to authenticated;

drop policy if exists people_corrections_read_own on public.people_corrections;
create policy people_corrections_read_own on public.people_corrections
  for select to authenticated
  using (submitted_by = (select auth.uid()));

drop policy if exists people_corrections_read_staff on public.people_corrections;
create policy people_corrections_read_staff on public.people_corrections
  for select to authenticated
  using (public.has_capability('people.manage'));
