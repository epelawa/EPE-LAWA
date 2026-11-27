"use client";

import { useId, useState, useTransition } from "react";
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
export function DirectoryFilterSheet({ query }: { query: DirectoryQuery }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const active = Number(Boolean(query.area)) + Number(query.verified);
  return <>
    <button type="button" className={styles.filterButton} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <SlidersIcon /> Filters{active ? <span className={styles.filterCount} aria-label={`${active} active`}>{active}</span> : null}
    </button>
    <BrandedDialog open={open} onClose={() => setOpen(false)} title="Filter businesses" description="Only filters backed by published listing data are offered." className={styles.filterDialog}>
      <form action="/business-directory" method="get" className={styles.filterForm}>
        {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
        {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
        {query.sort !== "verified" ? <input type="hidden" name="sort" value={query.sort} /> : null}
        <div className="ui-field">
          <label htmlFor={`${id}-area`}>Area or community</label>
          <input id={`${id}-area`} name="area" defaultValue={query.area} maxLength={100} placeholder="e.g. Iraye, Ejirin, Online" autoComplete="off" />
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

/** Sort control. With JavaScript it navigates on change; without, the Apply button submits the form. */
export function DirectorySortSelect({ query }: { query: DirectoryQuery }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  return <form action="/business-directory" method="get" className={styles.sortForm} aria-busy={pending || undefined}>
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
    <noscript><button type="submit" className="btn-secondary">Apply</button></noscript>
  </form>;
}
