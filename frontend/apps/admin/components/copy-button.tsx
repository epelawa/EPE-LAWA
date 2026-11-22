"use client";

import { useState, type ReactNode } from "react";
import { ClipboardIcon, CheckIcon } from "../../main/components/icons";

export default function CopyButton({
  text,
  children,
  className = "",
  onCopy,
}: {
  text: string;
  children?: ReactNode;
  className?: string;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      className={`btn-ghost ${className}`}
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {children || (copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />)}
      {copied ? " Copied!" : " Copy"}
    </button>
  );
}
