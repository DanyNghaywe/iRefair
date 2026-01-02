"use client";

import Link from "next/link";

import { Topbar } from "@/components/founder/Topbar";

export default function ArchivePage() {
  return (
    <div className="founder-page">
      <Topbar title="Archive" subtitle="View and manage archived records" />

      <div className="field-grid field-grid--three">
        <Link href="/founder/archive/applicants" className="card card--link">
          <h3 className="card__title">Archived Applicants</h3>
          <p className="field-hint">
            View applicants that have been archived along with their related applications.
          </p>
        </Link>

        <Link href="/founder/archive/referrers" className="card card--link">
          <h3 className="card__title">Archived Referrers</h3>
          <p className="field-hint">
            View referrers that have been archived along with their related applications.
          </p>
        </Link>

        <Link href="/founder/archive/applications" className="card card--link">
          <h3 className="card__title">Archived Applications</h3>
          <p className="field-hint">
            View all archived applications, including those archived via cascade.
          </p>
        </Link>
      </div>
    </div>
  );
}
