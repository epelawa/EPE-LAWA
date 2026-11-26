"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { SearchIcon } from "./icons";
import { OPEN_SEARCH_EVENT, trapTabKey, type OpenSearchDetail } from "../lib/site-search-events";
import styles from "./site-search.module.css";

type Category = "all" | "news" | "businesses" | "places" | "people" | "forum";
type Hit = { title: string; href: string; subline: string | null };
type Group = { key: Exclude<Category, "all">; label: string; items: Hit[] };
type Status = "idle" | "short" | "loading" | "ok" | "empty" | "error";

/** Only collections the search API actually queries are offered as filters. */
const CATEGORIES: Array<{ key: Category; label: string }> = [
  { key: "all", label: "All" },
  { key: "news", label: "News" },
  { key: "businesses", label: "Businesses" },
  { key: "places", label: "Places" },
  { key: "people", label: "People" },
  { key: "forum", label: "Forum" },
];
const BROWSE: Array<[string, string]> = [["/news", "News"], ["/business-directory", "Businesses"], ["/tourism", "Places"], ["/who-is-who", "People"], ["/forum", "Forum"]];
const MIN = 2;
const DEBOUNCE_MS = 260;

function cleanQuery(value: string) {
  return value.slice(0, 100);
}

export default function SiteSearch() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [status, setStatus] = useState<Status>("idle");
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const titleId = useId();
  const descriptionId = useId();
  const statusId = useId();

  const show = useCallback((initial?: string) => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    if (typeof initial === "string") setQuery(cleanQuery(initial));
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Open/close the native modal dialog: top layer, inert page, Escape via `cancel`.
  const wasOpen = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open && !wasOpen.current) return;
    wasOpen.current = open;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.dataset.searchOpen = "true";
      requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) {
      delete document.documentElement.dataset.searchOpen;
      abortRef.current?.abort();
      const target = restoreRef.current ?? triggerRef.current;
      if (target && target.isConnected) target.focus({ preventScroll: true });
    }
  }, [open]);

  // Other components (404 page, "/" shortcut, legacy /search redirect) can open the dialog.
  useEffect(() => {
    const onOpen = (event: Event) => show((event as CustomEvent<OpenSearchDetail>).detail?.query);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/" && params.get("open") === "search") {
      const legacy = params.get("q") ?? "";
      params.delete("open");
      params.delete("q");
      const rest = params.toString();
      window.history.replaceState(window.history.state, "", `/${rest ? `?${rest}` : ""}${window.location.hash}`);
      show(legacy);
    }
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
  }, [show]);

  // Debounced search with stale-response protection: only the newest request may update state.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    abortRef.current?.abort();
    if (!trimmed) { setStatus("idle"); setGroups([]); setTotal(0); return; }
    if (trimmed.length < MIN) { setStatus("short"); setGroups([]); setTotal(0); return; }
    const id = ++requestRef.current;
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (category !== "all") params.set("type", category);
        const response = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal, cache: "no-store", headers: { accept: "application/json" } });
        const data: { state?: string; total?: number; groups?: Group[] } = await response.json().catch(() => ({}));
        if (id !== requestRef.current) return;
        if (!response.ok || data.state !== "ok" || !Array.isArray(data.groups)) { setStatus("error"); setGroups([]); setTotal(0); return; }
        setGroups(data.groups);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setStatus(data.groups.length ? "ok" : "empty");
      } catch (error) {
        if (id !== requestRef.current || (error instanceof DOMException && error.name === "AbortError")) return;
        setStatus("error"); setGroups([]); setTotal(0);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, category, open, attempt]);

  const resultLinks = () => Array.from(resultsRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-result]") ?? []);

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      const first = resultLinks()[0];
      if (first) { event.preventDefault(); first.focus(); }
    } else if (event.key === "Enter") {
      const first = resultLinks()[0];
      if (first && status === "ok") { event.preventDefault(); first.click(); }
    }
  }

  function onResultsKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    const links = resultLinks();
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index < 0) return;
    event.preventDefault();
    if (event.key === "Home") links[0]?.focus();
    else if (event.key === "End") links[links.length - 1]?.focus();
    else if (event.key === "ArrowDown") links[Math.min(index + 1, links.length - 1)]?.focus();
    else if (index === 0) inputRef.current?.focus();
    else links[index - 1]?.focus();
  }

  const announcement = status === "loading" ? "Searching…"
    : status === "ok" ? `${total} ${total === 1 ? "result" : "results"} for ${query.trim()}`
    : status === "empty" ? `No results for ${query.trim()}`
    : status === "error" ? "Search is unavailable right now."
    : status === "short" ? `Type at least ${MIN} characters to search.` : "";

  return <>
    <button ref={triggerRef} type="button" className="btn-icon header-search" aria-label="Search EPE LAWA" aria-haspopup="dialog" aria-expanded={open} onClick={() => show()}>
      <SearchIcon size={20} />
    </button>
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClose={() => setOpen(false)}
      onClick={(event) => { if (event.target === dialogRef.current) close(); }}
      onKeyDown={(event) => trapTabKey(event, dialogRef.current)}
    >
      {open ? <div className={styles.surface}>
        <div className={styles.head}>
          <div className={styles.headCopy}>
            <h2 id={titleId} className={styles.title}>Search EPE LAWA</h2>
            <p id={descriptionId} className={styles.subtitle}>Find stories, people, businesses, places and more across Epe.</p>
          </div>
          <button type="button" className={styles.close} aria-label="Close search" onClick={close}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <form role="search" className={styles.field} onSubmit={(event) => event.preventDefault()}>
          <SearchIcon size={20} className={styles.fieldIcon} />
          <label className="sr-only" htmlFor={`${titleId}-input`}>Search EPE LAWA</label>
          <input
            ref={inputRef}
            id={`${titleId}-input`}
            className={styles.input}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={100}
            placeholder="What are you looking for?"
            value={query}
            aria-describedby={statusId}
            aria-controls={`${titleId}-results`}
            onChange={(event) => setQuery(cleanQuery(event.target.value))}
            onKeyDown={onInputKeyDown}
          />
          {query ? <button type="button" className={styles.clear} onClick={() => { setQuery(""); inputRef.current?.focus(); }}>Clear</button> : null}
        </form>
        <div className={styles.filters} role="group" aria-label="Filter results">
          {CATEGORIES.map((item) => <button key={item.key} type="button" className={styles.chip} aria-pressed={category === item.key} onClick={() => setCategory(item.key)}>{item.label}</button>)}
        </div>
        <p id={statusId} className="sr-only" role="status" aria-live="polite">{announcement}</p>
        <div ref={resultsRef} id={`${titleId}-results`} className={styles.results} aria-busy={status === "loading"} onKeyDown={onResultsKeyDown}>
          {status === "idle" ? <div className={styles.state}>
            <p className={styles.stateTitle}>Start typing to search published content.</p>
            <p className={styles.stateText}>Or browse a section:</p>
            <ul className={styles.browse}>{BROWSE.map(([href, label]) => <li key={href}><Link href={href} onClick={close}>{label}</Link></li>)}</ul>
          </div> : null}
          {status === "short" ? <div className={styles.state}><p className={styles.stateText}>Type at least {MIN} characters to search.</p></div> : null}
          {status === "loading" ? <ul className={styles.skeleton} aria-hidden="true">{[0, 1, 2, 3].map((index) => <li key={index}><span /><span /></li>)}</ul> : null}
          {status === "empty" ? <div className={styles.state}>
            <p className={styles.stateTitle}>No results for “{query.trim()}”</p>
            <p className={styles.stateText}>{category === "all" ? "Try a shorter phrase or a different spelling." : "Try another filter, or search everything."}</p>
            {category !== "all" ? <button type="button" className="btn-secondary" onClick={() => setCategory("all")}>Search everything</button> : null}
          </div> : null}
          {status === "error" ? <div className={styles.state} role="alert">
            <p className={styles.stateTitle}>Search is unavailable right now.</p>
            <p className={styles.stateText}>Nothing is shown rather than a partial or guessed result.</p>
            <button type="button" className="btn-secondary" onClick={() => setAttempt((count) => count + 1)}>Try again</button>
          </div> : null}
          {status === "ok" ? groups.map((group) => <section key={group.key} className={styles.group} aria-labelledby={`${titleId}-${group.key}`}>
            <h3 id={`${titleId}-${group.key}`} className={styles.groupTitle}>{group.label}</h3>
            <ul className={styles.list}>
              {group.items.map((item) => <li key={item.href}>
                <Link data-result href={item.href} className={styles.result} onClick={close}>
                  <span className={styles.resultTitle}>{item.title}</span>
                  {item.subline ? <span className={styles.resultMeta}>{item.subline}</span> : null}
                </Link>
              </li>)}
            </ul>
          </section>) : null}
        </div>
        <p className={styles.foot}><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p>
      </div> : null}
    </dialog>
  </>;
}
