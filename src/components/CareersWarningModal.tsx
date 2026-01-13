"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./CareersWarningModal.module.css";

type CareersWarningModalProps = {
  open: boolean;
  onClose: () => void;
  companyName: string;
  careersUrl: string;
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

function WarningIcon() {
  return (
    <svg
      className={styles.warningSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function CareersWarningModal({
  open,
  onClose,
  companyName,
  careersUrl,
}: CareersWarningModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleContinue = useCallback(() => {
    window.open(careersUrl, "_blank", "noopener,noreferrer");
    onClose();
  }, [careersUrl, onClose]);

  const handleGoToApply = useCallback(() => {
    onClose();
    router.push("/apply");
  }, [onClose, router]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      // Focus the Cancel button when modal opens
      requestAnimationFrame(() => {
        cancelBtnRef.current?.focus();
      });
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = getFocusableElements(dialogRef.current);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const modal = (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="careers-warning-title"
        aria-describedby="careers-warning-description"
        tabIndex={-1}
      >
        <div className={styles.content}>
          {/* Warning Icon */}
          <div className={styles.iconWrapper}>
            <WarningIcon />
          </div>

          {/* Title */}
          <h2 id="careers-warning-title" className={styles.title}>
            Before you go
          </h2>

          {/* Warning Box */}
          <div className={styles.warningBox}>
            <p id="careers-warning-description" className={styles.warningText}>
              Use the careers page only to find positions you&apos;re interested
              in. <strong>Do not apply directly on the company&apos;s website.</strong>{" "}
              Return to iRefair and use the Apply page to submit your
              application and receive a referral.
            </p>
          </div>
        </div>

        {/* Footer with Cancel, Apply, and Continue buttons */}
        <div className={styles.footer}>
          <button
            ref={cancelBtnRef}
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancel
          </button>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleGoToApply}
            >
              Apply Now
            </button>
            <button
              type="button"
              className={styles.continueBtn}
              onClick={handleContinue}
            >
              View Careers
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}
