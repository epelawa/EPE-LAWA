"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./article-composer-modal.module.css";

type ComposerContextValue = (trigger: HTMLElement) => void;
const ComposerContext = createContext<ComposerContextValue | null>(null);

export function ComposerTrigger({ children, className }: { children: ReactNode; className: string }) {
  const openComposer = useContext(ComposerContext);
  if (!openComposer) throw new Error("ComposerTrigger must be used inside ComposerModal.");
  return <button type="button" className={className} onClick={(event) => openComposer(event.currentTarget)}>{children}</button>;
}

export default function ComposerModal({ title, defaultOpen = false, composer, children }: {
  title: string;
  defaultOpen?: boolean;
  composer: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);
  function openFrom(trigger: HTMLElement) {
    returnFocusRef.current = trigger;
    setOpen(true);
  }
  function close() {
    dialogRef.current?.close();
    setOpen(false);
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  }
  return (
    <ComposerContext.Provider value={openFrom}>
      {children}
      {open ? (
        <dialog
          ref={dialogRef}
          className={styles.modal}
          aria-label={title}
          onCancel={(event) => { event.preventDefault(); close(); }}
          onClose={() => setOpen(false)}
        >
          <div className={styles.head}>
            <h2 className={styles.heading}>{title}</h2>
            <button type="button" className={styles.close} aria-label="Close composer" onClick={close}>&times;</button>
          </div>
          <div className={styles.body}>{composer}</div>
        </dialog>
      ) : null}
    </ComposerContext.Provider>
  );
}
