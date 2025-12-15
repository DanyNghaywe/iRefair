"use client";

import React from "react";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

type Props = {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export function Badge({ children, tone = "neutral", className }: Props) {
  const classes = ["founder-badge", `founder-badge--${tone}`, className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
