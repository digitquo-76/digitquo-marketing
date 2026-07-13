import { LegalPage } from '../../../components/marketing/LegalPage';

export const metadata = {
  title: 'Cookie Policy - DigitQuo Store',
  description: 'How DigitQuo Store uses essential cookies and browser storage for authentication and platform security.'
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated="13 July 2026">
      <section>
        <h2>Essential cookies</h2>
        <p>DigitQuo Store uses essential cookies and browser storage to keep users signed in, protect account sessions, and route users to the correct dashboard.</p>
      </section>
      <section>
        <h2>Authentication storage</h2>
        <p>Supabase authentication session data is stored in secure browser-managed storage so sellers, brokers, and admins can access their workspace without signing in on every page.</p>
      </section>
      <section>
        <h2>Analytics and marketing cookies</h2>
        <p>The current app does not include third-party advertising cookies. If analytics or marketing tools are added later, this policy should be updated before those tools are enabled.</p>
      </section>
      <section>
        <h2>Managing cookies</h2>
        <p>You can clear cookies through your browser settings. Clearing essential cookies may sign you out or require you to authenticate again.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>For cookie questions, contact <a href="mailto:privacy@digitquo.in">privacy@digitquo.in</a>.</p>
      </section>
    </LegalPage>
  );
}
