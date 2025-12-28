import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';

export default function PrivacyPage() {
  return (
    <AppShell>
      <main>
        <section className="card page-card legal-card" aria-labelledby="privacy-title">
          <div className="card-header">
            <div>
              <p className="eyebrow">Privacy</p>
              <h2 id="privacy-title">Privacy policy</h2>
              <p className="lead">A short summary of how iRefair collects and uses data.</p>
            </div>
          </div>

          <div className="legal-stack">
            <section>
              <h3>Data we collect</h3>
              <ul className="legal-list">
                <li>Contact details: name, email, phone, and LinkedIn URL.</li>
                <li>Referral and company details: role focus, availability, and company info.</li>
                <li>Application data: iRAIN/iRCRN, position details, and uploaded CVs.</li>
              </ul>
            </section>

            <section>
              <h3>How CVs are stored and used</h3>
              <p>
                CVs are stored securely and used only to validate applications and support referrals. Access is limited
                to the iRefair operations team and is shared with a referrer or company only when needed for an applicant
                application.
              </p>
            </section>

            <section>
              <h3>Contact</h3>
              <p className="legal-contact">
                Email us at <a href="mailto:info@andbeyondca.com">info@andbeyondca.com</a> for data requests or questions.
              </p>
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
