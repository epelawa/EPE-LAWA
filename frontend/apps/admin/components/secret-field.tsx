"use client";

import { useState } from "react";
import CopyButton from "./copy-button";

/**
 * A credential the owner copies into another service. Hidden by default (only
 * the last four characters show) so it is not exposed on a shared screen;
 * Copy always copies the full value.
 */
export default function SecretField({ value, label }: { value: string; label: string }) {
  const [shown, setShown] = useState(false);
  const masked = `${"•".repeat(16)}${value.slice(-4)}`;
  return (
    <div className="ui-row gap-2" style={{ flexWrap: "wrap", alignItems: "center" }}>
      <code
        className="input font-mono text-sm p-2 bg-gray-100 rounded"
        style={{ overflowWrap: "anywhere", flex: "1 1 260px", minWidth: 0 }}
        aria-label={shown ? label : `${label} (hidden)`}
        translate="no"
      >
        {shown ? value : masked}
      </code>
      <button type="button" className="btn-ghost" aria-pressed={shown} onClick={() => setShown((v) => !v)}>
        {shown ? "Hide" : "Show"}
      </button>
      <CopyButton text={value} />
    </div>
  );
}
