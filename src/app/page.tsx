'use client';

import Image from 'next/image';
import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { RoleSelector } from '@/components/RoleSelector/RoleSelector';

export default function LandingPage() {
  return (
    <AppShell variant="transparent">
      <main className="role-picker role-picker--fullscreen">
        <section className="role-shell" aria-labelledby="role-heading">
          <header className="role-shell__header">
            <Image
              src="/irefair-logo.png"
              alt="iRefair"
              width={120}
              height={120}
              priority
              className="role-shell__logo"
            />
            <h1 id="role-heading" className="title-animate title-gradient heading-display">
              Choose your path
            </h1>
          </header>

          <div className="select-panel">
            <RoleSelector />
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
