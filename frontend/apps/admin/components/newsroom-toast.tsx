"use client";

import { useState, type ReactNode } from "react";
import styles from "./newsroom-toast.module.css";

export default function NewsroomToast({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return <div className={styles.toast}><div className={styles.content}>{children}</div><button type="button" className={styles.close} onClick={() => setVisible(false)} aria-label="Dismiss notification">×</button></div>;
}
