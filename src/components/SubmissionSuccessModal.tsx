"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./SubmissionSuccessModal.module.css";

type SubmissionSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  email?: string;
  locale: "en" | "fr";
  variant?:
    | "default"
    | "confirmation-link"
    | "confirmation-link-recent"
    | "referrer-new"
    | "referrer-existing"
    | "referrer-new-company";
};

const translations = {
  en: {
    title: "Submission Received!",
    emailSent: "We've sent a confirmation email to your inbox.",
    emailSentTo: "We've sent a confirmation email to",
    emailSentLatest: "We've sent the latest confirmation link to your inbox.",
    emailSentLatestTo: "We've sent the latest confirmation link to",
    emailSentRecent: "We already sent a confirmation link recently.",
    emailSentRecentTo: "We already sent a confirmation link recently to",
    emailSentRecentSuffix: "Please use the latest email we already sent.",
    referrerNew:
      "You're all set! Check your email for what to expect next.",
    referrerExisting:
      "We found your existing account and sent you an email with the details. Our team will review any changes you submitted.",
    referrerNewCompany:
      "We've added a new company to your account and sent you an email with the details. It's pending approval.",
    cantFind: "Can't find it?",
    checkSpam: "Check your Spam or Junk folder",
    markNotSpam:
      'If you find it there, mark it as "Not Spam" to receive future emails from us',
    gotIt: "Got it",
  },
  fr: {
    title: "Soumission reçue !",
    emailSent: "Nous avons envoyé un courriel de confirmation.",
    emailSentTo: "Nous avons envoyé un courriel de confirmation à",
    emailSentLatest: "Nous avons envoyé le dernier lien de confirmation.",
    emailSentLatestTo: "Nous avons envoyé le dernier lien de confirmation à",
    emailSentRecent: "Nous avons déjà envoyé un lien de confirmation récemment.",
    emailSentRecentTo: "Nous avons déjà envoyé un lien de confirmation récemment à",
    emailSentRecentSuffix: "Veuillez utiliser le dernier courriel déjà envoyé.",
    referrerNew:
      "Vous êtes inscrit ! Consultez vos courriels pour la suite.",
    referrerExisting:
      "Nous avons trouvé votre compte existant et vous avons envoyé un courriel avec les détails. Notre équipe examinera vos modifications.",
    referrerNewCompany:
      "Nous avons ajouté une nouvelle entreprise à votre compte et vous avons envoyé un courriel avec les détails. Elle est en attente d'approbation.",
    cantFind: "Vous ne le trouvez pas ?",
    checkSpam: "Vérifiez votre dossier Spam ou Courrier indésirable",
    markNotSpam:
      'Si vous le trouvez là, marquez-le comme « Non spam » pour recevoir nos futurs courriels',
    gotIt: "Compris",
  },
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

function CheckmarkIcon() {
  return (
    <svg
      className={styles.checkmarkSvg}
      viewBox="0 0 52 52"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="26" cy="26" r="25" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14.5 27.5L22.5 35.5L37.5 18.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.checkmarkPath}
      />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg
      className={styles.envelopeIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6L12 13L2 6" />
    </svg>
  );
}

export function SubmissionSuccessModal({
  open,
  onClose,
  email,
  locale,
  variant = "default",
}: SubmissionSuccessModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const gotItBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const t = translations[locale];

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      // Focus the "Got it" button when modal opens
      requestAnimationFrame(() => {
        gotItBtnRef.current?.focus();
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

  const confirmationMessage = (() => {
    switch (variant) {
      case "confirmation-link-recent": {
        const base = email ? `${t.emailSentRecentTo} ${email}.` : t.emailSentRecent;
        return `${base} ${t.emailSentRecentSuffix}`;
      }
      case "confirmation-link":
        return email ? `${t.emailSentLatestTo} ${email}.` : t.emailSentLatest;
      case "referrer-new":
        return t.referrerNew;
      case "referrer-existing":
        return t.referrerExisting;
      case "referrer-new-company":
        return t.referrerNewCompany;
      default:
        return email ? `${t.emailSentTo} ${email}.` : t.emailSent;
    }
  })();

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
        aria-labelledby="success-modal-title"
        tabIndex={-1}
      >
        <div className={styles.content}>
          {/* Success Icon */}
          <div className={styles.iconWrapper}>
            <CheckmarkIcon />
          </div>

          {/* Title */}
          <h2 id="success-modal-title" className={styles.title}>
            {t.title}
          </h2>

          {/* Confirmation Message */}
          <p className={styles.confirmationMessage} role="status" aria-live="polite">
            {confirmationMessage}
          </p>

          {/* Helper Box */}
          <div className={styles.helperBox}>
            <div className={styles.helperHeader}>
              <EnvelopeIcon />
              <span className={styles.helperTitle}>{t.cantFind}</span>
            </div>
            <ul className={styles.helperList}>
              <li>{t.checkSpam}</li>
              <li>{t.markNotSpam}</li>
            </ul>
          </div>
        </div>

        {/* Footer with Got it button */}
        <div className={styles.footer}>
          <button
            ref={gotItBtnRef}
            type="button"
            className={styles.gotItBtn}
            onClick={onClose}
          >
            {t.gotIt}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}
