"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./CenteredModal.module.css";

type CenteredModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function CenteredModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: CenteredModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      dialogRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const sizeClass = size === "sm" ? styles.sm : size === "lg" ? styles.lg : styles.md;

  const modal = (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-hidden="true">
      <div
        ref={dialogRef}
        className={`${styles.modal} ${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <div>
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id="modal-description" className={styles.description}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.content}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}
