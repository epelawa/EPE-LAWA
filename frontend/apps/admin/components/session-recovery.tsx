"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Browser recovery feature is disabled to reduce form height
// This component now returns null and does nothing
export function recoveryKey(_actor: string, _article: string) { return ""; }
export function clearSessionRecovery(_actor: string | undefined, _article: string) {}

export type DraftSaveState = "saving" | "saved" | "error";

export default function SessionRecovery({ form, actor, article, revision, saved = false, onDraftState }: { form: RefObject<HTMLFormElement | null>; actor?: string; article: string; revision: string; saved?: boolean; onDraftState?: (state: DraftSaveState, savedAt?: number) => void }): null {
  return null;
}
