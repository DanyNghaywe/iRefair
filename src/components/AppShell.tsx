import React from "react";

import { ParticlesBackground } from "@/components/ParticlesBackground";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />
      <div className="board">{children}</div>
    </div>
  );
}
