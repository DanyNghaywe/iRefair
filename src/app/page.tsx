'use client';

import { useRouter } from 'next/navigation';
import { ParticlesBackground } from '@/components/ParticlesBackground';

const personas = [
  {
    id: 'candidate',
    label: 'Candidate',
    description: 'Request referrals and share your background to be matched.',
    badgeClass: 'candidate',
  },
  {
    id: 'referrer',
    label: 'Referrer',
    description: 'Offer introductions or referrals to roles and teams you support.',
    badgeClass: 'referrer',
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />

      <div className="board">
        <main>
          <section className="card landing-card" aria-labelledby="persona-heading">
            <p className="eyebrow">Get started</p>
            <h1 id="persona-heading">I am a...</h1>
            <p className="lead landing-lead">
              Choose the path that fits you. We&apos;ll guide you to request a referral or offer one.
            </p>

            <div className="persona-grid" role="list">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  className="persona-pill persona-pill--large"
                  role="listitem"
                  onClick={() => router.push(`/${persona.id}`)}
                >
                  <div className={`pill-badge ${persona.badgeClass}`} aria-hidden="true" />
                  <div>
                    <p className="pill-label">{persona.label}</p>
                    <p className="pill-sub">{persona.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
