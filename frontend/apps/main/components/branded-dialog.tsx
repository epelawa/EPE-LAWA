"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * EPE LAWA branded modal.
 *
 * Built on the native `<dialog>` element so focus trapping, the top layer,
 * Escape handling and inert page content are browser guarantees rather than
 * hand-rolled approximations — only the chrome is ours. Never use `alert`,
 * `confirm` or `prompt` for member-facing decisions; mount this instead.
 */
export default function BrandedDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      const target = dialog.querySelector<HTMLElement>(
        "[data-autofocus], input:not([type=\"hidden\"]), textarea, select, a[href], button:not([disabled])",
      );
      target?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      if (open) onClose();
    };
    const handleBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleBackdrop);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleBackdrop);
    };
  }, [open, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={`ui-dialog${className ? ` ${className}` : ""}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="ui-dialog__surface">
        <div className="ui-dialog__head">
          <div>
            <h2 className="ui-dialog__title" id={titleId}>{title}</h2>
            {description ? <p className="ui-dialog__description" id={descriptionId}>{description}</p> : null}
          </div>
          <button className="ui-dialog__close" type="button" aria-label="Close dialog" onClick={onClose}>
            <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="ui-dialog__body">{children}</div>
      </div>
    </dialog>
  );
}
