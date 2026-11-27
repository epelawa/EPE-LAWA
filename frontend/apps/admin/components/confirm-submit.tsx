"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton } from "@epelawa/ui";
import BrandedDialog from "./branded-dialog";

export default function ConfirmSubmit({
  message, children, className, confirmFirst = true, confirmLabel = "Confirm",
  cancelLabel = "Cancel", name, value,
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
  const { pending, data } = useFormStatus();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);
  const ownPending = pending && submitted.current && (!name || data?.get(name) === value);

  useEffect(() => {
    if (pending || !submitted.current) return;
    submitted.current = false;
    if (open) setOpen(false);
  }, [pending, open]);

  if (!confirmFirst) return <SubmitButton className={className} name={name} value={value}>{children}</SubmitButton>;

  function close() {
    if (!pending) setOpen(false);
  }

  function submitConfirmed() {
    const form = trigger.current?.form;
    if (!form || submitted.current || pending) return;
    // Create a real submitter only after confirmation. A permanent hidden
    // submit button could let Enter in a text field bypass the dialog.
    const submitter = document.createElement("button");
    submitter.type = "submit";
    submitter.hidden = true;
    if (name) submitter.name = name;
    if (value !== undefined) submitter.value = value;
    form.append(submitter);
    try {
      form.requestSubmit(submitter);
    } finally {
      submitter.remove();
    }
    // Close even if browser validation prevented submission. React owns the
    // real pending state; requestSubmit does not report action success.
    submitted.current = true;
    setOpen(false);
  }

  return <>
    {/* Block implicit Enter submission on forms that require confirmation. */}
    <button type="submit" disabled hidden aria-hidden="true" />
    <button ref={trigger} type="button" className={className} aria-haspopup="dialog"
      aria-busy={ownPending} disabled={pending} onClick={() => setOpen(true)}>
      {ownPending && <span className="ep-btn__spinner" aria-hidden="true" />}
      {ownPending ? "Working…" : children}
    </button>
    <BrandedDialog open={open} onClose={close} title="Confirm this action" description={message}>
      <div className="ui-actions">
        <button type="button" className="btn-secondary" onClick={close}>{cancelLabel}</button>
        <button type="button" className="btn-primary" onClick={submitConfirmed}>{confirmLabel}</button>
      </div>
    </BrandedDialog>
  </>;
}
