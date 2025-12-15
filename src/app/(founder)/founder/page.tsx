"use client";

import React from "react";

import { Topbar } from "@/components/founder/Topbar";
import { LogoutButton } from "./LogoutButton";

const cards = [
  { title: "Active candidates", value: "-", hint: "Realtime from Sheets" },
  { title: "Referrers", value: "-", hint: "Latest sync" },
  { title: "Applications", value: "-", hint: "Past 7 days" },
  { title: "Matches", value: "-", hint: "Ready to review" },
];

export default function FounderDashboard() {
  return (
    <div className="founder-page">
      <Topbar
        title="Ops Console"
        subtitle="Founder & Managing Director workspace"
        actions={<LogoutButton />}
      />

      <div className="founder-grid">
        {cards.map((card) => (
          <div key={card.title} className="founder-card">
            <div className="founder-card__title">{card.title}</div>
            <div className="founder-card__value">{card.value}</div>
            <div className="founder-card__meta">{card.hint}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
