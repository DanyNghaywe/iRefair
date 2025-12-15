"use client";

import React from "react";

type Props = {
  className?: string;
  width?: string | number;
  height?: string | number;
};

export function Skeleton({ className, width, height }: Props) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;

  const classes = ["founder-skeleton", className].filter(Boolean).join(" ");
  return <span className={classes} style={style} aria-hidden="true" />;
}
