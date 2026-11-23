"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
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

  // Extract button variant from className
  const getVariant = (cls?: string): "primary" | "secondary" | "danger" | "ghost" => {
    if (cls?.includes("btn-danger")) return "danger";
    if (cls?.includes("btn-secondary")) return "secondary";
    if (cls?.includes("btn-ghost")) return "ghost";
    return "primary";
  };

  const variant = getVariant(className);
  const btnClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    ghost: "btn-ghost",
  }[variant];

  if (!confirmFirst) {
    return (
      <button 
        ref={buttonRef} 
        type="submit" 
        className={`${btnClass} ${pending ? "btn-busy" : ""} ${className || ""}`.trim()}
        aria-busy={pending} 
        disabled={pending} 
        data-pending-self-managed="true" 
        {...rest}
      >
        {children}
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
        className={`${btnClass} ${busy ? "btn-busy" : ""} ${className || ""}`.trim()}
        aria-haspopup="dialog"
        disabled={busy}
        onClick={() => setOpen(true)}
        {...rest}
      >
        {children}
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
            className={`btn-primary ${isConfirming ? "btn-busy" : ""}`}
            onClick={handleConfirm}
            disabled={isConfirming}
            aria-busy={isConfirming}
          >
            {confirmLabel}
          </button>
        </div>
      </BrandedDialog>
    </>
  );
}
