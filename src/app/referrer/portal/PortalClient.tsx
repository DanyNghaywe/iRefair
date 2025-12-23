"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";

type PortalItem = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  position: string;
  iCrn: string;
  resumeFileName: string;
  resumeDownloadUrl?: string;
  status: string;
  ownerNotes: string;
};

type PortalResponse = {
  ok: true;
  referrer: { irref: string; name?: string; email?: string; company?: string };
  items: PortalItem[];
  total: number;
};

const actions: { code: string; label: string; hint: string }[] = [
  { code: "A", label: "I would like to meet them", hint: "Book meeting link is sent." },
  { code: "B", label: "Not a good fit", hint: "Auto email sent with polite rejection." },
  { code: "C", label: "CV not matching requirements", hint: "Guidance email sent." },
  { code: "D", label: "CV needs a few adjustments", hint: "Request to re-upload improved CV." },
  { code: "E", label: "CV uploaded but missing information", hint: "Request to update CV." },
  { code: "F", label: "He interviewed", hint: "Candidate receives update message." },
  { code: "G", label: "He got the job!", hint: "Triggers referral reward workflow." },
];

export default function PortalClient() {
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/referrer/portal/data", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Unable to load portal");
        }
        if (!cancelled) setData(json as PortalResponse);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFeedback = async (applicationId: string, action: string) => {
    setSubmittingId(applicationId);
    setError(null);
    try {
      const res = await fetch("/api/referrer/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to submit feedback");
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === applicationId
                  ? { ...item, status: json.status || item.status, ownerNotes: json.ownerNotes || item.ownerNotes }
                  : item,
              ),
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingId(null);
    }
  };

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => a.id.localeCompare(b.id));
  }, [data]);

  const header = (
    <section className="card page-card portal-card" aria-labelledby="portal-title">
      <div className="card-header portal-header">
        <div className="portal-header__copy">
          <p className="eyebrow">Referrer portal</p>
          <h2 id="portal-title">Track your referrals</h2>
          <p className="lead">Review candidates, download CVs, and send quick A-G feedback.</p>
        </div>
        {data ? (
          <dl className="portal-meta">
            <div className="portal-meta__item">
              <dt>Referrer</dt>
              <dd>
                {data.referrer.name || "Referrer"} - {data.referrer.irref}
              </dd>
            </div>
            <div className="portal-meta__item">
              <dt>Email</dt>
              <dd>{data.referrer.email || "No email on file"}</dd>
            </div>
            {data.referrer.company ? (
              <div className="portal-meta__item">
                <dt>Company</dt>
                <dd>{data.referrer.company}</dd>
              </div>
            ) : null}
            <div className="portal-meta__item">
              <dt>Total</dt>
              <dd>{data.total}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-state-card" aria-live="polite">
          <div className="portal-state">
            <div className="portal-state__icon portal-state__icon--loading" aria-hidden="true" />
            <div>
              <p className="portal-state__title">Loading portal</p>
              <p className="portal-state__message">Fetching your referrals and status updates.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-state-card portal-state-card--error" role="alert">
          <div className="portal-state">
            <div className="portal-state__icon portal-state__icon--error" aria-hidden="true" />
            <div>
              <p className="portal-state__title">We could not load the portal</p>
              <p className="portal-state__message">Error: {error}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-state-card">
          <div className="portal-state">
            <div className="portal-state__icon" aria-hidden="true" />
            <div>
              <p className="portal-state__title">No data available</p>
              <p className="portal-state__message">Please refresh to try again.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="portal-stack">
      {header}
      <section className="card page-card portal-card portal-table-card">
        <div className="portal-table-header">
          <div>
            <p className="portal-table-title">Applications</p>
            <p className="portal-table-sub">{sortedItems.length} active referrals</p>
          </div>
          <div className="portal-table-meta">
            <span className="portal-count-pill">{data.total} total</span>
          </div>
        </div>
        <div className="portal-table-wrapper">
          <div className="founder-table portal-table">
            <div className="founder-table__container portal-table__scroll">
              <table>
                <caption className="sr-only">Referrer portal applications</caption>
                <thead>
                  <tr>
                    <th className="portal-col-candidate">Candidate</th>
                    <th className="portal-col-position">Position / iRCRN</th>
                    <th className="portal-col-cv">CV</th>
                    <th className="portal-col-status">Status</th>
                    <th className="portal-col-feedback">Feedback (A-G)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="portal-table-empty">
                        <div className="portal-empty">
                          <svg
                            width="64"
                            height="64"
                            viewBox="0 0 64 64"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            className="portal-empty__icon portal-empty__icon--svg"
                          >
                            <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
                            <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
                            <rect
                              x="20"
                              y="18"
                              width="24"
                              height="28"
                              rx="3"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeOpacity="0.4"
                            />
                            <path
                              d="M26 26h12M26 32h12M26 38h8"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeOpacity="0.3"
                              strokeLinecap="round"
                            />
                            <circle cx="40" cy="38" r="2" fill="currentColor" fillOpacity="0.2" />
                          </svg>
                          <p className="portal-empty__title">No applications assigned</p>
                          <p className="portal-empty__message">
                            Candidate applications will appear here once they're assigned to you. Check back soon for new referrals to review.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((item) => (
                      <tr key={item.id}>
                        <td className="portal-col-candidate">
                          <div className="portal-cell-title">{item.candidateName || item.candidateId}</div>
                          <div className="portal-cell-sub">{item.candidateEmail}</div>
                          <div className="portal-cell-sub">{item.candidatePhone}</div>
                          <div className="portal-cell-meta">App ID: {item.id}</div>
                        </td>
                        <td className="portal-col-position">
                          <div className="portal-cell-title">{item.position}</div>
                          <div className="portal-cell-sub">iRCRN: {item.iCrn || "-"}</div>
                        </td>
                        <td className="portal-col-cv">
                          {item.resumeDownloadUrl ? (
                            <a href={item.resumeDownloadUrl} target="_blank" rel="noreferrer" className="portal-link">
                              Download CV
                            </a>
                          ) : (
                            <span className="portal-muted">No CV available</span>
                          )}
                        </td>
                        <td className="portal-col-status">
                          <div className="portal-cell-title">{item.status || "-"}</div>
                          <div className="portal-cell-meta">{item.ownerNotes || ""}</div>
                        </td>
                        <td className="portal-col-feedback">
                          <div className="portal-actions">
                            {actions.map((action) => {
                              const actionLabel = `${action.code} - ${action.label}. ${action.hint}`;
                              return (
                                <ActionBtn
                                  key={action.code}
                                  size="sm"
                                  variant="ghost"
                                  className="pill portal-action-btn"
                                  onClick={() => handleFeedback(item.id, action.code)}
                                  disabled={submittingId === item.id}
                                  title={actionLabel}
                                  aria-label={actionLabel}
                                >
                                  {action.code}
                                </ActionBtn>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
