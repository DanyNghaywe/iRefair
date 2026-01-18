import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { AppShell } from "@/components/AppShell";
import "./login.css";
import { Skeleton, SkeletonStack } from "@/components/founder/Skeleton";
import LoginForm from "./LoginForm";
import { LoginTitle } from "./LoginTitle";

export const metadata: Metadata = {
  title: "Founder login | iRefair",
  description: "Secure access for the Founder & Managing Director at iRefair.",
};

export default function FounderLoginPage() {
  return (
    <AppShell variant="transparent">
      <div className="founder-login-screen" aria-labelledby="founder-login-title">
        <main className="founder-login-main">
          <section className="glass-card founder-login-card founder-auth">
            <div className="founder-login-header">
              <div className="founder-login-brand">
                <Image
                  src="/irefair-large.png"
                  alt="iRefair"
                  width={80}
                  height={80}
                  priority
                  className="founder-login-brand__logo"
                />
              </div>
              <h1 id="founder-login-title">
                <LoginTitle />
              </h1>
            </div>

            <Suspense
              fallback={
                <SkeletonStack>
                  <Skeleton variant="input" />
                  <Skeleton variant="input" />
                  <Skeleton variant="button" />
                </SkeletonStack>
              }
            >
              <LoginForm />
            </Suspense>
          </section>
        </main>
      </div>
    </AppShell>
  );
}
