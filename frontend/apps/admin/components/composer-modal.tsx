"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./article-composer-modal.module.css";

export default function ComposerModal({ triggerLabel, title, children, defaultOpen = false }: { triggerLabel: string; title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);
  function close() {
    dialogRef.current?.close();
    setOpen(false);
  }
  return (
    <>
      <button type="button" className="ep-button ep-button--primary" onClick={() => setOpen(true)}>{triggerLabel}</button>
      {open ? (
        <dialog
          ref={dialogRef}
          className={styles.modal}
          aria-label={title}
          onCancel={(event) => { event.preventDefault(); close(); }}
        >
          <div className={styles.head}>
            <h2 className={styles.heading}>{title}</h2>
            <button type="button" className={styles.close} aria-label="Close composer" onClick={close}>&times;</button>
          </div>
          <div className={styles.body}>{children}</div>
        </dialog>
      ) : null}
    </>
  );
}
