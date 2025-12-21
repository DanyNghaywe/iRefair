"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PortalItem = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  position: string;
  iCrn: string;
  resumeFileName: string;
  resumeUrl?: string;
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

type PortalClientProps = {
  token: string;
};

export default function PortalClient({ token }: PortalClientProps) {
  const searchParams = useSearchParams();
  const resolvedToken = token || searchParams?.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!resolvedToken) {
        setError("Missing token");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/referrer/portal/data?token=${encodeURIComponent(resolvedToken)}`,
          {
          cache: "no-store",
          },
        );
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
  }, [resolvedToken]);

  const handleFeedback = async (applicationId: string, action: string) => {
    setSubmittingId(applicationId);
    setError(null);
    try {
      const res = await fetch("/api/referrer/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resolvedToken, applicationId, action }),
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

  if (!resolvedToken) {
    return <div style={{ padding: "24px" }}>Missing token.</div>;
  }

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading portal...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "#b00020" }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>No data available.</div>;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto", color: "#0f172a" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>Referrer portal</h1>
        <p style={{ margin: "4px 0 0 0", color: "#475569" }}>
          {data.referrer.name || "Referrer"} - {data.referrer.irref} -{" "}
          {data.referrer.email || "No email"}
        </p>
        {data.referrer.company ? (
          <p style={{ margin: "4px 0 0 0", color: "#475569" }}>Company: {data.referrer.company}</p>
        ) : null}
      </header>

      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "780px" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              <th style={th}>Candidate</th>
              <th style={th}>Position / iRCRN</th>
              <th style={th}>CV</th>
              <th style={th}>Status</th>
              <th style={th}>Feedback (A-G)</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{item.candidateName || item.candidateId}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{item.candidateEmail}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{item.candidatePhone}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>App ID: {item.id}</div>
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{item.position}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    iRCRN: {item.iCrn || "-"}
                  </div>
                </td>
                <td style={td}>
                  {item.resumeUrl ? (
                    <a href={item.resumeUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                      View / Download
                    </a>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>No CV link</span>
                  )}
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{item.status || "-"}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>{item.ownerNotes || ""}</div>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {actions.map((action) => (
                      <button
                        key={action.code}
                        onClick={() => handleFeedback(item.id, action.code)}
                        disabled={submittingId === item.id}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          background: submittingId === item.id ? "#e2e8f0" : "#fff",
                          cursor: "pointer",
                          fontSize: "12px",
                          minWidth: "46px",
                        }}
                        title={`${action.code} - ${action.label}. ${action.hint}`}
                      >
                        {action.code}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.items.length === 0 ? <p style={{ marginTop: "12px", color: "#94a3b8" }}>No applications yet.</p> : null}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  fontSize: "13px",
  color: "#475569",
  borderBottom: "1px solid #e2e8f0",
  fontWeight: 700,
};

const td: React.CSSProperties = {
  padding: "12px",
  verticalAlign: "top",
  fontSize: "13px",
  color: "#0f172a",
};
