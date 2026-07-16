import Link from 'next/link';
import { COMPANY_EMAIL, COMPANY_PHONE, getCompanyMailto } from '../../lib/company';
import { LogoMark } from '../ui/icons';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="logo">
              <LogoMark />
              <span className="logo-text">DigitQuo Store</span>
            </Link>
            <p className="footer-tagline">The smarter way to market and sell. Connecting sellers and brokers on one platform.</p>
          </div>
          <FooterCol title="Product" items={[['/#features', 'Features'], ['/#how-it-works', 'How It Works'], ['/register?role=seller', 'Seller signup'], ['/register?role=broker', 'Broker signup']]} />
          <FooterCol title="Company" items={[
            ['/#roles', 'Roles'],
            ['/login', 'Login'],
            ['/register', 'Create account'],
            [getCompanyMailto('DigitQuo Store sales inquiry'), COMPANY_EMAIL],
            [`tel:${COMPANY_PHONE}`, COMPANY_PHONE]
          ]} />
          <FooterCol title="Legal" items={[['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service'], ['/cookies', 'Cookie Policy']]} />
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 DigitQuo Store. All rights reserved.</p>
          <p>Made with passion for modern trade.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string, items: readonly [string, string][] | string[][] }) {
  return (
    <div className="footer-col">
      <h4 className="footer-heading">{title}</h4>
      <ul>{items.map(([href, label]) => <li key={label}>{href.startsWith('/') ? <Link href={href}>{label}</Link> : <a href={href}>{label}</a>}</li>)}</ul>
    </div>
  );
}
