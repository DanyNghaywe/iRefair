import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';

export default function ContactPage() {
  return (
    <AppShell>
      <main>
        <section className="card page-card legal-card" aria-labelledby="contact-title">
          <div className="card-header">
            <div>
              <p className="eyebrow">Contact</p>
              <h2 id="contact-title">Contact iRefair</h2>
              <p className="lead">We are here to help with questions or data requests.</p>
            </div>
          </div>

          <div className="legal-stack">
            <section>
              <h3>Email</h3>
              <p className="legal-contact">
                Reach us at <a href="mailto:irefair.andbeyondconsulting@gmail.com">irefair.andbeyondconsulting@gmail.com</a>.
              </p>
            </section>

            <section>
              <h3>What to include</h3>
              <ul className="legal-list">
                <li>Your iRAIN or iRREF if available.</li>
                <li>The topic (support, privacy, or feedback).</li>
              </ul>
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
