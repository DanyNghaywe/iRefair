'use client';

import { useRouter } from 'next/navigation';
import { ParticlesBackground } from '@/components/ParticlesBackground';

const roles = [
  {
    id: 'candidate',
    label: 'Candidate',
    description: 'I want to request referrals',
    path: '/candidate',
  },
  {
    id: 'referrer',
    label: 'Referrer',
    description: 'I can refer candidates into my company',
    path: '/referrer',
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />

      <div className="board">
        <main className="role-picker">
          <section className="card role-picker-card" aria-labelledby="role-heading">
            <p className="eyebrow">Start with your role</p>
            <h1 id="role-heading">I am a...</h1>
            <p className="lead role-subtitle">Choose how you want to use iRefair.</p>

            <div className="role-options" role="list">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-option role-option--${role.id}`}
                  role="listitem"
                  onClick={() => router.push(role.path)}
                >
                  <span className="role-option-title">{role.label}</span>
                  <span className="role-option-sub">{role.description}</span>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
