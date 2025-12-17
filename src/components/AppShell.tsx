import React from "react";

import { ParticlesBackground } from "@/components/ParticlesBackground";

type AppShellProps = {
  children: React.ReactNode;
  variant?: "default" | "wide";
};

export function AppShell({ children, variant = "default" }: AppShellProps) {
  const boardClass = variant === "wide" ? "board board--wide" : "board";

  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />
      <div className={boardClass}>{children}</div>
    </div>
  );
}
