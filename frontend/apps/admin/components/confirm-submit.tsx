"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import BrandedDialog from "./branded-dialog";

export default function ConfirmSubmit({
  message,
  children,
  className,
  confirmFirst = true,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  ...rest
}: {
  message: string;
  children: ReactNode;
  className?: string;
  confirmFirst?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const busy = pending || open;

  if (!confirmFirst) {
    return (
      <button ref={buttonRef} type="submit" className={className} aria-busy={pending} disabled={pending} data-pending-self-managed="true" {...rest}>
        {pending ? "Working…" : children}
      </button>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-haspopup="dialog"
        disabled={busy}
        onClick={() => setOpen(true)}
        {...rest}
      >
        {pending ? "Working…" : children}
      </button>
      <BrandedDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm this action"
        description="This action runs after you confirm. It cannot be taken back from this screen."
      >
        <p>{message}</p>
        <div className="ui-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setOpen(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            data-autofocus
            onClick={() => {
              setOpen(false);
              const button = buttonRef.current;
              if (button?.form && button.isConnected) button.form.requestSubmit(button);
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </BrandedDialog>
    </>
  );
}
