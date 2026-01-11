import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';

export default function TermsPage() {
  return (
    <AppShell>
      <main>
        <section className="card page-card legal-card" aria-labelledby="terms-title">
          <div className="card-header">
            <div>
              <p className="eyebrow">Terms</p>
              <h2 id="terms-title">Terms of use</h2>
              <p className="lead">Clear expectations for using iRefair.</p>
            </div>
          </div>

          <div className="legal-stack">
            <section>
              <h3>Service overview</h3>
              <p>
                iRefair is a community referral initiative. We help connect applicants and referrers, but we do not
                guarantee interviews, referrals, or hiring outcomes.
              </p>
            </section>

            <section>
              <h3>Your responsibilities</h3>
              <ul className="legal-list">
                <li>Provide accurate information and keep your details up to date.</li>
                <li>Ensure you have the right to share any data you submit.</li>
                <li>Follow your employer policies when making or requesting referrals.</li>
              </ul>
            </section>

            <section>
              <h3>Questions</h3>
              <p className="legal-contact">
                Email us at <a href="mailto:irefair.andbeyondconsulting@gmail.com">irefair.andbeyondconsulting@gmail.com</a>.
              </p>
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
