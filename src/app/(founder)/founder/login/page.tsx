import type { Metadata } from "next";
import { Suspense } from "react";

import { AppShell } from "@/components/AppShell";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Founder login | iRefair",
  description: "Secure access for the Founder & Managing Director at iRefair.",
};

export default function FounderLoginPage() {
  return (
    <AppShell>
      <main>
        <section className="card page-card" aria-labelledby="founder-login-title">
          <div className="card-header">
            <div>
              <p className="eyebrow">Founder access</p>
              <h2 id="founder-login-title">Log in</h2>
              <p className="lead">Access the founder console using your secure credentials.</p>
            </div>
          </div>

          <Suspense fallback={<div className="card__body">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </section>
      </main>
    </AppShell>
  );
}
