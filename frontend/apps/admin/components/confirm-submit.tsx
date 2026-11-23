"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton } from "@epelawa/ui";
import BrandedDialog from "./branded-dialog";
import { pushToast } from "../../main/components/toast";

export default function ConfirmSubmit({
  message,
  children,
  className,
  confirmFirst = true,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  successMessage,
  errorMessage,
  ...rest
}: {
  message: string;
  children: ReactNode;
  className?: string;
  confirmFirst?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [isConfirming, startConfirming] = useTransition();
  const busy = pending || isConfirming;

  if (!confirmFirst) {
    return (
      <button ref={buttonRef} type="submit" className={className} aria-busy={pending} disabled={pending} data-pending-self-managed="true" {...rest}>
        {pending ? "Working" : children}
      </button>
    );
  }

  const handleConfirm = async () => {
    setOpen(false);
    const button = buttonRef.current;
    if (button?.form && button.isConnected) {
      startConfirming(async () => {
        try {
          await button.form?.requestSubmit(button);
          if (successMessage) {
            pushToast("success", successMessage);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "An error occurred";
          if (errorMessage) {
            pushToast("error", errorMessage);
          } else {
            pushToast("error", message);
          }
        }
      });
    }
  };

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
        {pending ? "Working" : children}
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
            disabled={isConfirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirm}
            disabled={isConfirming}
            aria-busy={isConfirming}
          >
            {isConfirming ? "Working" : confirmLabel}
          </button>
        </div>
      </BrandedDialog>
    </>
  );
}
