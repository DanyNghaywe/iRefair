"use client";

import React from "react";

import { ActionBtn } from "@/components/ActionBtn";

type EmptyStateVariant = "candidates" | "referrers" | "applications" | "matches" | "portal";

type EmptyStateProps = {
  variant: EmptyStateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

function CandidatesIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="empty-state__illustration"
    >
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
      <circle cx="40" cy="28" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
      <path
        d="M24 54c0-8.837 7.163-16 16-16s16 7.163 16 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      <circle cx="40" cy="28" r="3" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

function ReferrersIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="empty-state__illustration"
    >
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
      <circle cx="30" cy="32" r="7" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="50" cy="32" r="7" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
      <path
        d="M20 50c0-5.523 4.477-10 10-10h0c5.523 0 10 4.477 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M40 50c0-5.523 4.477-10 10-10h0c5.523 0 10 4.477 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M36 40l8 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.3"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
    </svg>
  );
}

function ApplicationsIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="empty-state__illustration"
    >
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
      <rect
        x="26"
        y="22"
        width="28"
        height="36"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.4"
      />
      <path
        d="M32 32h16M32 40h16M32 48h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
      <circle cx="48" cy="48" r="3" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

function MatchesIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="empty-state__illustration"
    >
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
      <circle cx="28" cy="40" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="52" cy="40" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
      <path
        d="M38 40h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
      <path
        d="M36 36l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 36l-4 4 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PortalIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="empty-state__illustration"
    >
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
      <rect
        x="24"
        y="26"
        width="32"
        height="28"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.4"
      />
      <path
        d="M24 34h32"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <circle cx="30" cy="30" r="1.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="35" cy="30" r="1.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="40" cy="30" r="1.5" fill="currentColor" fillOpacity="0.3" />
      <path
        d="M30 42h20M30 48h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

const illustrations: Record<EmptyStateVariant, () => React.ReactElement> = {
  candidates: CandidatesIllustration,
  referrers: ReferrersIllustration,
  applications: ApplicationsIllustration,
  matches: MatchesIllustration,
  portal: PortalIllustration,
};

export function EmptyState({
  variant,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const Illustration = illustrations[variant];

  return (
    <div className="empty-state">
      <Illustration />
      <div className="empty-state__content">
        <h3 className="empty-state__title">{title}</h3>
        <p className="empty-state__description">{description}</p>
        {actionLabel && (actionHref || onAction) ? (
          <div className="empty-state__action">
            {actionHref ? (
              <ActionBtn as="link" href={actionHref} variant="primary" size="sm">
                {actionLabel}
              </ActionBtn>
            ) : (
              <ActionBtn as="button" variant="primary" size="sm" onClick={onAction}>
                {actionLabel}
              </ActionBtn>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
