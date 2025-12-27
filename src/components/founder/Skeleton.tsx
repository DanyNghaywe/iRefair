"use client";

import React from "react";

import styles from "./Skeleton.module.css";

export type SkeletonVariant = "text" | "avatar" | "button" | "card" | "input" | "heading" | "tableCell";
export type SkeletonSize = "sm" | "md" | "lg";

type Props = {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: SkeletonVariant;
  size?: SkeletonSize;
  /** Number of skeleton lines to render (for text variant) */
  count?: number;
  /** Use pulse animation instead of shimmer */
  pulse?: boolean;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({ className, width, height, variant, size = "md", count = 1, pulse }: Props) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;

  const variantClass = variant ? styles[variant] : "";
  const sizeClass = getSizeClass(variant, size);
  const animClass = pulse ? styles.pulse : "";

  const baseClass = cx(styles.skeleton, variantClass, sizeClass, animClass, className);

  // Render multiple lines for text variant
  if (variant === "text" && count > 1) {
    return (
      <div className={styles.stack} aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={baseClass}
            style={{
              ...style,
              width: i === count - 1 ? "70%" : width,
            }}
          />
        ))}
      </div>
    );
  }

  return <span className={baseClass} style={style} aria-hidden="true" />;
}

function getSizeClass(variant: SkeletonVariant | undefined, size: SkeletonSize): string {
  if (variant === "avatar") {
    if (size === "sm") return styles.avatarSm;
    if (size === "lg") return styles.avatarLg;
    return styles.avatarMd;
  }

  if (variant === "button" && size === "sm") {
    return styles.buttonSm;
  }

  if (variant === "heading") {
    if (size === "sm") return styles.headingSm;
    if (size === "lg") return styles.headingLg;
  }

  return "";
}

/** Pre-composed skeleton for stat cards */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cx(styles.stack, className)} aria-hidden="true">
      <Skeleton variant="text" width="60%" />
      <Skeleton height={48} width={80} />
      <Skeleton variant="text" width="40%" />
    </div>
  );
}

/** Pre-composed skeleton for detail page fields */
export function SkeletonField({ className }: { className?: string }) {
  return (
    <div className={cx(styles.detailField, className)} aria-hidden="true">
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="input" />
    </div>
  );
}

/** Pre-composed skeleton for detail page with multiple fields */
export function SkeletonDetailGrid({ fields = 6, className }: { fields?: number; className?: string }) {
  return (
    <div className={cx(styles.detailGrid, className)} aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonField key={i} />
      ))}
    </div>
  );
}

/** Pre-composed skeleton for portal table rows */
export function SkeletonPortalRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cx(styles.portalRows, className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.portalRow}>
          <Skeleton variant="avatar" size="sm" />
          <div className={styles.stack} style={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
          <Skeleton variant="button" size="sm" width={80} />
        </div>
      ))}
    </div>
  );
}

/** Layout helpers */
export function SkeletonStack({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx(styles.stack, className)} aria-hidden="true">
      {children}
    </div>
  );
}

export function SkeletonRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx(styles.row, className)} aria-hidden="true">
      {children}
    </div>
  );
}
