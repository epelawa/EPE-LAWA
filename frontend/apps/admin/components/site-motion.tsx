type LoaderProps = { label?: string };

export function TidegateSpinner({ label = "Loading EPE LAWA" }: LoaderProps) {
  return (
    <span className="tidegate-spinner" role="status" aria-live="polite" aria-label={label}>
      <span className="tidegate-spinner__outer" aria-hidden="true" />
      <span className="tidegate-spinner__inner" aria-hidden="true" />
      <span className="tidegate-spinner__keel" aria-hidden="true" />
    </span>
  );
}
