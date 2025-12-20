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
      <div className="founder-login-screen" aria-labelledby="founder-login-title">
        <main className="founder-login-main">
          <section className="founder-login-card founder-auth">
            <div className="founder-login-header">
              <div className="founder-login-brand">
                <span className="founder-login-brand__text">IREFair</span>
              </div>
              <h1 id="founder-login-title">Login</h1>
            </div>

            <Suspense fallback={<div className="founder-login-loading">Loading...</div>}>
              <LoginForm />
            </Suspense>
          </section>
        </main>
      </div>
    </AppShell>
  );
}
