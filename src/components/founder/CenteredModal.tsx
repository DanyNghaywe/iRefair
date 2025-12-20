"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ActionBtn } from "@/components/ActionBtn";

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  footerMeta?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  footer?: React.ReactNode;
};

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function CenteredModal({
  open,
  title,
  subtitle,
  onClose,
  actions,
  footerMeta,
  children,
  bodyClassName,
  footer,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget =
      panelRef.current?.querySelector<HTMLElement>(focusableSelector) || panelRef.current;
    focusTarget?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
      lastActiveRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const modal = (
    <div className={`centered-modal ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="centered-modal__overlay" onClick={onClose} />
      <section
        ref={panelRef}
        className="centered-modal__panel"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="centered-modal__header">
          <div>
            {title ? <h2 className="centered-modal__title">{title}</h2> : null}
            {subtitle ? <p className="centered-modal__subtitle">{subtitle}</p> : null}
          </div>
          <div className="centered-modal__header-actions">
            <ActionBtn as="button" variant="ghost" onClick={onClose} aria-label="Close modal">
              X
            </ActionBtn>
          </div>
        </header>

        <div
          className={`centered-modal__body ${bodyClassName ?? "centered-modal__grid"}`.trim()}
        >
          {children}
        </div>

        {footer ? (
          <footer className="centered-modal__footer">{footer}</footer>
        ) : (
          <footer className="centered-modal__footer">
            <div className="centered-modal__footer-meta">{footerMeta}</div>
            <div className="centered-modal__footer-actions">{actions}</div>
          </footer>
        )}
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
