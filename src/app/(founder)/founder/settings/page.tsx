"use client";

import { useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";
import { Topbar } from "@/components/founder/Topbar";

export default function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formatMessage, setFormatMessage] = useState<string | null>(null);
  const [formatLoading, setFormatLoading] = useState(false);
  const [lastBootstrap, setLastBootstrap] = useState<string | null>(null);
  const [lastFormat, setLastFormat] = useState<string | null>(null);

  const runBootstrap = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/founder/bootstrap", { cache: "no-store" });
      const data = await response.json();
      if (data?.ok) {
        setMessage(`Bootstrap complete. Created: ${data.createdSheets?.length || 0}, columns updated.`);
        setLastBootstrap(new Date().toLocaleString());
      } else {
        setMessage(data?.error || "Bootstrap failed.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Bootstrap failed.");
    } finally {
      setLoading(false);
    }
  };

  const runFormat = async () => {
    setFormatLoading(true);
    setFormatMessage(null);
    try {
      const response = await fetch("/api/founder/admin/format-sheets", { cache: "no-store" });
      const data = await response.json();
      if (data?.ok) {
        setFormatMessage("Formatting complete.");
        setLastFormat(new Date().toLocaleString());
      } else {
        setFormatMessage(data?.error || "Formatting failed.");
      }
    } catch (error) {
      console.error(error);
      setFormatMessage("Formatting failed.");
    } finally {
      setFormatLoading(false);
    }
  };

  return (
    <div className="founder-page">
      <Topbar title="Settings" subtitle="Maintenance tools for founder" />

      <div className="glass-card founder-card">
        <div className="founder-card__header">
          <div>
            <div className="founder-card__title">Sheets maintenance</div>
            <p className="founder-card__meta">
              Run bootstrap to ensure headers, admin columns, and Matches sheet exist.
            </p>
          </div>
          <ActionBtn as="button" variant="primary" onClick={runBootstrap} disabled={loading}>
            {loading ? "Running..." : "Run bootstrap"}
          </ActionBtn>
        </div>
        <p className="founder-card__meta">Formatting actions will be wired in a later prompt.</p>
        <div className="founder-toolbar">
          {message ? <div className="founder-pill founder-pill--muted">{message}</div> : null}
          {lastBootstrap ? <div className="founder-pill">Last run: {lastBootstrap}</div> : null}
        </div>
      </div>

      <div className="glass-card founder-card">
        <div className="founder-card__header">
          <div>
            <div className="founder-card__title">Format sheets</div>
            <p className="founder-card__meta">Reapply column widths, banding, and header styling.</p>
          </div>
          <ActionBtn as="button" variant="ghost" onClick={runFormat} disabled={formatLoading}>
            {formatLoading ? "Formatting..." : "Format sheets"}
          </ActionBtn>
        </div>
        <div className="founder-toolbar">
          {formatMessage ? <div className="founder-pill founder-pill--muted">{formatMessage}</div> : null}
          {lastFormat ? <div className="founder-pill">Last run: {lastFormat}</div> : null}
        </div>
      </div>
    </div>
  );
}
