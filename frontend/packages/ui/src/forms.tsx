"use client";

import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  TextareaHTMLAttributes,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type FocusEvent,
  type FocusEventHandler,
} from "react";
import { useFormStatus } from "react-dom";

/** Shared rule set for live field validation. No browser-native popups. */
export type FieldRules = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  number?: { min?: number; max?: number; integer?: boolean };
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns "" when the value passes, otherwise a human error message. */
export function validateField(value: string, rules: FieldRules | undefined): string {
  if (!rules) return "";
  const text = value ?? "";
  if (rules.required && text.trim() === "") return rules.message ?? "This field is required.";
  if (text === "") return "";
  if (rules.maxLength !== undefined && text.length > rules.maxLength) {
    return rules.message ?? `Keep this under ${rules.maxLength} characters.`;
  }
  if (rules.minLength !== undefined && text.length < rules.minLength) {
    return rules.message ?? `Use at least ${rules.minLength} characters.`;
  }
  if (rules.email && !EMAIL_RE.test(text)) return rules.message ?? "Enter a valid email address.";
  if (rules.url && !/^https?:\/\/[^\s]+\.[^\s]+/.test(text)) {
    return rules.message ?? "Enter a full link starting with https://";
  }
  if (rules.pattern && !rules.pattern.test(text)) {
    return rules.message ?? "This value is not in the expected format.";
  }
  if (rules.number) {
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return rules.message ?? "Enter a number.";
    if (rules.number.integer && !Number.isInteger(parsed)) return rules.message ?? "Use a whole number.";
    if (rules.number.min !== undefined && parsed < rules.number.min) {
      return rules.message ?? `Must be ${rules.number.min} or more.`;
    }
    if (rules.number.max !== undefined && parsed > rules.number.max) {
      return rules.message ?? `Must be ${rules.number.max} or less.`;
    }
  }
  return "";
}

/**
 * Validates one live control against its own markup attributes
 * (required / minLength / maxLength / type) so generic editors and
 * breadth-first sweeps can reuse the same rules without native popups.
 */
export function controlError(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const rules: FieldRules = {};
  if (el.hasAttribute("required")) rules.required = true;
  const min = el.getAttribute("minlength") ?? el.getAttribute("minLength");
  if (min && Number.isFinite(Number(min))) rules.minLength = Number(min);
  const max = el.getAttribute("maxlength") ?? el.getAttribute("maxLength");
  if (max && Number.isFinite(Number(max))) rules.maxLength = Number(max);
  const type = (el as HTMLInputElement).type;
  if (type === "email") rules.email = true;
  if (type === "url") rules.url = true;
  return validateField(el.value, rules);
}

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type FieldChangeEvent = ChangeEvent<FieldElement>;

type LiveFieldControlProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "onBlur"> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "onBlur"> & {
    onChange?: ChangeEventHandler<FieldElement>;
    onBlur?: FocusEventHandler<HTMLElement>;
  };

type LiveFieldProps = {
  label: string;
  optional?: boolean;
  hint?: string;
  rules?: FieldRules;
  value: string;
  onChange: (event: FieldChangeEvent) => void;
  children: ReactElement<LiveFieldControlProps>;
};

/**
 * Wraps one input and validates it on every keystroke after first blur.
 * The error message shakes once when the field turns invalid, then glows red –
 * it never re-shakes on every keystroke. Rendered inline, never window.alert.
 */
export function LiveField({ label, optional, hint, rules, value, onChange, children }: LiveFieldProps) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const lastErrorRef = useRef("");

  useEffect(() => {
    if (!touched) return;
    const next = validateField(value, rules);
    setError(next);
    if (next !== "" && lastErrorRef.current === "") {
      setShaking(true);
      const timer = window.setTimeout(() => setShaking(false), 420);
      lastErrorRef.current = next;
      return () => window.clearTimeout(timer);
    }
    lastErrorRef.current = next;
  }, [value, rules, touched]);

  const commit: ChangeEventHandler<FieldElement> = (event) => {
    if (!touched) setTouched(true);
    onChange(event);
  };

  const blur: FocusEventHandler<HTMLElement> = (event) => {
    setTouched(true);
    setError(validateField(value, rules));
    if (isValidElement(children)) {
      const child = children as ReactElement<Partial<LiveFieldControlProps>>;
      child.props.onBlur?.(event);
    }
  };

  const flagged = touched && error !== "";

  return (
    <div className={`ep-live-field${flagged ? " ep-live-field--invalid" : ""}`}>
      <label className="ep-live-field__label">
        {label}
        {optional ? (
          <span className="ep-live-field__optional">Optional</span>
        ) : (
          <span className="ep-live-field__required">Required</span>
        )}
      </label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Partial<LiveFieldControlProps>>, {
            className: `${(children.props as { className?: string }).className ?? ""}${
              flagged ? " ep-live-field__control--invalid" : ""
            }`,
            "aria-invalid": flagged,
            onChange: commit,
            onBlur: blur,
          })
        : children}
      <p className={`ep-live-field__message${shaking ? " ep-shake" : ""}`} aria-live="polite">
        {flagged ? error : hint ?? ""}
      </p>
    </div>
  );
}

/** Submit button that rolls a spinner while the surrounding form action is pending. */
export function SubmitButton({
  children,
  pendingLabel = "Working\u2026",
  variant = "primary",
  className = "",
  disabled,
  useLegacyClasses = false,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  useLegacyClasses?: boolean;
}) {
  const { pending } = useFormStatus();
  
  // If legacy classes are requested, use btn- classes for admin compatibility
  if (useLegacyClasses) {
    const btnClass = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      danger: "btn-danger",
    }[variant];
    return (
      <button
        type="submit"
        disabled={pending || disabled}
        className={`${btnClass} ${pending ? "btn-busy" : ""} ${className}`.trim()}
        aria-busy={pending}
        {...rest}
      >
        {children}
      </button>
    );
  }
  
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`ep-btn ep-btn--${variant}${pending ? " ep-btn--pending" : ""} ${className}`.trim()}
      aria-busy={pending}
      {...rest}
    >
      {pending ? (
        <>
          <span className="ep-btn__spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Save-state pill for autosaving composers: "Saving\u2026" \u2192 "Saved" \u2192 timestamp. */
export function SaveState({
  state,
  savedAt,
}: {
  state: "idle" | "saving" | "saved" | "error";
  savedAt?: string | null;
}) {
  if (state === "idle") return null;
  return (
    <span className={`ep-save ep-save--${state}`} role="status" aria-live="polite">
      <span className="ep-save__dot" aria-hidden="true" />
      {state === "saving" ? "Saving\u2026" : state === "saved" ? "Saved" : "Saving failed"}
      {state === "saved" && savedAt ? <span className="ep-save__time">{savedAt}</span> : null}
    </span>
  );
}
