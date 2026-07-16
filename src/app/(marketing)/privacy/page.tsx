import { LegalPage } from '../../../components/marketing/LegalPage';
import { COMPANY_EMAIL } from '../../../lib/company';

export const metadata = {
  title: 'Privacy Policy - DigitQuo Store',
  description: 'How DigitQuo Store collects, uses, and protects account, product, order, and payment information.'
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="13 July 2026">
      <section>
        <h2>Information we collect</h2>
        <p>We collect account details, role and onboarding information, product listings, order details, payout claims, and support messages that users provide while using DigitQuo Store.</p>
      </section>
      <section>
        <h2>How we use information</h2>
        <ul>
          <li>To create seller, broker, and admin workspaces.</li>
          <li>To show products, process paid orders, notify sellers, and send broker invoices.</li>
          <li>To protect the platform from unauthorized access, fraud, and misuse.</li>
          <li>To improve product reliability, support, and marketplace operations.</li>
        </ul>
      </section>
      <section>
        <h2>Payments and providers</h2>
        <p>Payments are processed through Razorpay. Transactional emails are sent through Resend. Authentication and marketplace data are managed through Supabase. These providers process data needed to deliver their services.</p>
      </section>
      <section>
        <h2>Data sharing</h2>
        <p>We share order details between the broker placing an order and the seller fulfilling it. We do not sell personal information.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>For privacy questions, contact <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  );
}
