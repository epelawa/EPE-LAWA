"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export type ErrorProps = {
  error: Error;
  reset?: () => void;
  fallback?: ReactNode;
  className?: string;
};

export function ErrorDisplay({
  error,
  reset,
  fallback = null,
  className = "",
}: ErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`ep-error-display ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="ep-error-display__header">
        <h2 className="ep-error-display__title">Something went wrong</h2>
        {reset && (
          <button
            type="button"
            onClick={reset}
            className="ep-error-display__retry"
          >
            Try again
          </button>
        )}
      </div>

      <div className="ep-error-display__content">
        <p className="ep-error-display__message">{error.message || "An unexpected error occurred"}</p>
        
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="ep-error-display__details-toggle"
          aria-expanded={showDetails}
        >
          {showDetails ? "Hide details" : "Show details"}
        </button>

        {showDetails && (
          <pre className="ep-error-display__details">
            {error.stack || error.toString()}
          </pre>
        )}
      </div>

      {fallback && (
        <div className="ep-error-display__fallback">
          {fallback}
        </div>
      )}
    </div>
  );
}

export type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  className?: string;
};

export class ErrorBoundary extends ErrorDisplay {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught an error:", error, info);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorDisplay
          error={this.state.error}
          reset={() => this.setState({ error: null })}
          fallback={this.props.fallback}
          className={this.props.className}
        />
      );
    }
    return this.props.children;
  }
}

export function NotFoundError({
  resource = "page",
  message,
  action,
  className = "",
}: {
  resource?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`ep-not-found ${className}`}
      role="alert"
      aria-live="polite"
    >
      <h2 className="ep-not-found__title">
        {resource ? `${resource.charAt(0).toUpperCase() + resource.slice(1)} not found` : "Not found"}
      </h2>
      {message && (
        <p className="ep-not-found__message">{message}</p>
      )}
      {action && (
        <div className="ep-not-found__action">{action}</div>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ep-empty-state ${className}`} role="status" aria-live="polite">
      {icon && (
        <div className="ep-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="ep-empty-state__title">{title}</h3>
      {description && (
        <p className="ep-empty-state__description">{description}</p>
      )}
      {action && (
        <div className="ep-empty-state__action">{action}</div>
      )}
    </div>
  );
}

export function Toast({
  message,
  type = "info",
  onClose,
  duration = 5000,
  className = "",
}: {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  onClose?: () => void;
  duration?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`ep-toast ep-toast--${type} ${className}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="ep-toast__icon" aria-hidden="true">
        {type === "success" && "✓"}
        {type === "warning" && "⚠"}
        {type === "error" && "✗"}
        {type === "info" && "ℹ"}
      </span>
      <span className="ep-toast__message">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          className="ep-toast__close"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function ToastContainer({
  children,
  position = "top-right",
  className = "",
}: {
  children: ReactNode;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
}) {
  return (
    <div className={`ep-toast-container ep-toast-container--${position} ${className}`}>
      {children}
    </div>
  );
}
