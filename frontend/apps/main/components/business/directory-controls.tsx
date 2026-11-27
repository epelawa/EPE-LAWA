"use client";

import { useEffect, useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BrandedDialog from "../branded-dialog";
import { SlidersIcon } from "./business-icons";
import { SORT_OPTIONS, directoryHref, type DirectoryQuery, type DirectorySort } from "../../lib/business-directory";
import styles from "../../app/business-directory/directory.module.css";

/**
 * "Filters" button + native-dialog sheet (bottom sheet on phones via .ui-dialog, centred panel on larger
 * screens). The form is a plain GET to /business-directory, so applying it is one navigation and the
 * search text and category are carried as hidden fields — nothing the visitor typed is lost.
 */
export function DirectoryFilterSheet({ query, areas = [] }: { query: DirectoryQuery; areas?: string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const router = useRouter();
  // Once hydrated, build the URL with directoryHref so empty fields (area=) never reach the address bar.
  // Before hydration the native GET submit still works; empty values are ignored by parseDirectoryQuery.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setOpen(false);
    router.push(directoryHref({ ...query, area: String(data.get("area") ?? "").trim(), verified: data.get("verified") === "1", page: 1 }));
  }
  const active = Number(Boolean(query.area)) + Number(query.verified);
  return <>
    <button type="button" className={styles.filterButton} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <SlidersIcon /> Filters{active ? <span className={styles.filterCount} aria-label={`${active} active`}>{active}</span> : null}
    </button>
    <BrandedDialog open={open} onClose={() => setOpen(false)} title="Filter businesses" description="Only filters backed by published listing data are offered." className={styles.filterDialog}>
      <form action="/business-directory" method="get" className={styles.filterForm} onSubmit={submit}>
        {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
        {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
        {query.sort !== "verified" ? <input type="hidden" name="sort" value={query.sort} /> : null}
        <div className="ui-field">
          <label htmlFor={`${id}-area`}>Area or community</label>
          {areas.length ? (
            <select id={`${id}-area`} name="area" defaultValue={query.area}>
              <option value="">Any area</option>
              {query.area && !areas.some((area) => area.toLowerCase() === query.area.toLowerCase()) ? <option value={query.area}>{query.area}</option> : null}
              {areas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          ) : (
            <input id={`${id}-area`} name="area" defaultValue={query.area} maxLength={100} placeholder="e.g. Iraye, Ejirin, Online" autoComplete="off" />
          )}
        </div>
        <label className={styles.checkRow} htmlFor={`${id}-verified`}>
          <input id={`${id}-verified`} type="checkbox" name="verified" value="1" defaultChecked={query.verified} />
          <span><strong>Verified businesses only</strong><small>Listings the EPE LAWA desk has checked.</small></span>
        </label>
        <div className="ui-dialog__actions">
          <a className="btn-ghost" href={directoryHref({ q: query.q, category: query.category, sort: query.sort })}>Clear filters</a>
          <button className="btn-primary" type="submit">Show results</button>
        </div>
      </form>
    </BrandedDialog>
  </>;
}

/** Sort control. Once hydrated it navigates on change; before that (or without JavaScript) Apply submits the form. */
export function DirectorySortSelect({ query }: { query: DirectoryQuery }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  // Until React has hydrated, onChange is not attached yet: keep the Apply button visible so a change made
  // during a slow load still works. data-ready marks the moment the select navigates on its own.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return <form action="/business-directory" method="get" className={styles.sortForm} aria-busy={pending || undefined} data-ready={ready || undefined}>
    {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
    {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
    {query.area ? <input type="hidden" name="area" value={query.area} /> : null}
    {query.verified ? <input type="hidden" name="verified" value="1" /> : null}
    <label htmlFor={`${id}-sort`}>Sort by</label>
    <select id={`${id}-sort`} name="sort" defaultValue={query.sort} onChange={(event) => {
      const sort = event.currentTarget.value as DirectorySort;
      startTransition(() => router.push(directoryHref({ ...query, sort, page: 1 })));
    }}>
      {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {ready ? null : <button type="submit" className="btn-secondary">Apply</button>}
  </form>;
}
