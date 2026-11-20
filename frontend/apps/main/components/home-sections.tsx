import type { ReactNode } from "react";
import Reveal from "./reveal";

export function HomeSectionReveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal className="home-section-reveal" delay={delay}>
      {children}
    </Reveal>
  );
}
