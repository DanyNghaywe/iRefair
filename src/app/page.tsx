'use client';

import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { RoleSelector } from '@/components/RoleSelector/RoleSelector';

export default function LandingPage() {
  return (
    <AppShell variant="transparent">
      <main className="role-picker role-picker--fullscreen">
        <section className="role-shell" aria-labelledby="role-selector-heading">
          <div className="select-panel">
            <h1 id="role-selector-heading" className="sr-only">
              iRefair — Get referred to jobs in Canada
            </h1>
            <RoleSelector />
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
