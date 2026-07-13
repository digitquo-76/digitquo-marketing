import { LegalPage } from '../../../components/marketing/LegalPage';

export const metadata = {
  title: 'Terms of Service - DigitQuo Store',
  description: 'The core terms for using DigitQuo Store seller, broker, and admin marketplace tools.'
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="13 July 2026">
      <section>
        <h2>Using DigitQuo Store</h2>
        <p>DigitQuo Store provides marketplace software for sellers to publish products and brokers to place paid customer orders. Users are responsible for keeping account information accurate and credentials secure.</p>
      </section>
      <section>
        <h2>Seller responsibilities</h2>
        <ul>
          <li>Publish accurate product details, prices, stock, and images.</li>
          <li>Fulfill paid orders according to the details shared by brokers.</li>
          <li>Keep business and contact information current.</li>
        </ul>
      </section>
      <section>
        <h2>Broker responsibilities</h2>
        <ul>
          <li>Collect accurate customer, phone, address, and order details.</li>
          <li>Place orders only for genuine customer demand.</li>
          <li>Follow payout and commission rules shown in the dashboard.</li>
        </ul>
      </section>
      <section>
        <h2>Payments and orders</h2>
        <p>Broker orders must be paid and verified before they are saved as marketplace orders. Rewards or payout claims may be reviewed before payment.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>For terms questions, contact <a href="mailto:legal@digitquo.in">legal@digitquo.in</a>.</p>
      </section>
    </LegalPage>
  );
}
