"use client";

import { useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
import { Topbar } from "@/components/founder/Topbar";

const translations = {
  en: {
    title: "Settings",
    subtitle: "Maintenance tools for founder",
    sheetsMaintenance: "Sheets maintenance",
    sheetsMaintenanceDesc: "Run bootstrap to ensure headers and admin columns exist.",
    runBootstrap: "Run bootstrap",
    running: "Running...",
    bootstrapComplete: "Bootstrap complete.",
    bootstrapCreated: "Created:",
    columnsUpdated: "columns updated.",
    bootstrapFailed: "Bootstrap failed.",
    formattingNote: "Formatting actions will be wired in a later prompt.",
    lastRun: "Last run:",
    formatSheets: "Format sheets",
    formatSheetsDesc: "Reapply column widths, banding, and header styling.",
    formatSheetsBtn: "Format sheets",
    formatting: "Formatting...",
    formattingComplete: "Formatting complete.",
    formattingFailed: "Formatting failed.",
  },
  fr: {
    title: "Param\u00e8tres",
    subtitle: "Outils de maintenance pour le fondateur",
    sheetsMaintenance: "Maintenance des feuilles",
    sheetsMaintenanceDesc: "Ex\u00e9cutez le bootstrap pour vous assurer que les en-t\u00eates et les colonnes d'administration existent.",
    runBootstrap: "Ex\u00e9cuter le bootstrap",
    running: "Ex\u00e9cution...",
    bootstrapComplete: "Bootstrap termin\u00e9.",
    bootstrapCreated: "Cr\u00e9\u00e9s :",
    columnsUpdated: "colonnes mises \u00e0 jour.",
    bootstrapFailed: "\u00c9chec du bootstrap.",
    formattingNote: "Les actions de formatage seront connect\u00e9es dans une prochaine \u00e9tape.",
    lastRun: "Derni\u00e8re ex\u00e9cution :",
    formatSheets: "Formater les feuilles",
    formatSheetsDesc: "R\u00e9appliquer les largeurs de colonnes, les bandes et le style des en-t\u00eates.",
    formatSheetsBtn: "Formater les feuilles",
    formatting: "Formatage...",
    formattingComplete: "Formatage termin\u00e9.",
    formattingFailed: "\u00c9chec du formatage.",
  },
};

export default function SettingsPage() {
  const { language } = useLanguage();
  const t = translations[language];
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
        setMessage(`${t.bootstrapComplete} ${t.bootstrapCreated} ${data.createdSheets?.length || 0}, ${t.columnsUpdated}`);
        setLastBootstrap(new Date().toLocaleString());
      } else {
        setMessage(data?.error || t.bootstrapFailed);
      }
    } catch (error) {
      console.error(error);
      setMessage(t.bootstrapFailed);
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
        setFormatMessage(t.formattingComplete);
        setLastFormat(new Date().toLocaleString());
      } else {
        setFormatMessage(data?.error || t.formattingFailed);
      }
    } catch (error) {
      console.error(error);
      setFormatMessage(t.formattingFailed);
    } finally {
      setFormatLoading(false);
    }
  };

  return (
    <div className="founder-page">
      <Topbar title={t.title} subtitle={t.subtitle} />

      <div className="glass-card founder-card">
        <div className="founder-card__header">
          <div>
            <div className="founder-card__title">{t.sheetsMaintenance}</div>
            <p className="founder-card__meta">
              {t.sheetsMaintenanceDesc}
            </p>
          </div>
          <ActionBtn as="button" variant="primary" onClick={runBootstrap} disabled={loading}>
            {loading ? t.running : t.runBootstrap}
          </ActionBtn>
        </div>
        <p className="founder-card__meta">{t.formattingNote}</p>
        <div className="founder-toolbar">
          {message ? <div className="founder-pill founder-pill--muted">{message}</div> : null}
          {lastBootstrap ? <div className="founder-pill">{t.lastRun} {lastBootstrap}</div> : null}
        </div>
      </div>

      <div className="glass-card founder-card">
        <div className="founder-card__header">
          <div>
            <div className="founder-card__title">{t.formatSheets}</div>
            <p className="founder-card__meta">{t.formatSheetsDesc}</p>
          </div>
          <ActionBtn as="button" variant="ghost" onClick={runFormat} disabled={formatLoading}>
            {formatLoading ? t.formatting : t.formatSheetsBtn}
          </ActionBtn>
        </div>
        <div className="founder-toolbar">
          {formatMessage ? <div className="founder-pill founder-pill--muted">{formatMessage}</div> : null}
          {lastFormat ? <div className="founder-pill">{t.lastRun} {lastFormat}</div> : null}
        </div>
      </div>
    </div>
  );
}
