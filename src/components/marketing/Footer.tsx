import Link from 'next/link';
import { LogoMark, TwitterIcon, LinkedInIcon, InstagramIcon } from '../ui/icons';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#" className="logo">
              <LogoMark />
              <span className="logo-text">DigitQuo</span>
            </a>
            <p className="footer-tagline">The smarter way to market and sell. Connecting sellers and brokers on one platform.</p>
            <div className="footer-socials">
              <a href="#" className="social-link" aria-label="Twitter"><TwitterIcon /></a>
              <a href="#" className="social-link" aria-label="LinkedIn"><LinkedInIcon /></a>
              <a href="#" className="social-link" aria-label="Instagram"><InstagramIcon /></a>
            </div>
          </div>
          <FooterCol title="Product" items={[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['#', 'Pricing'], ['#', 'API']]} />
          <FooterCol title="Company" items={[['#', 'About'], ['#', 'Careers'], ['#', 'Blog'], ['#contact', 'Contact']]} />
          <FooterCol title="Legal" items={[['#', 'Privacy Policy'], ['#', 'Terms of Service'], ['#', 'Cookie Policy']]} />
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 DigitQuo. All rights reserved.</p>
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
      <ul>{items.map(([href, label]) => <li key={label}><a href={href}>{label}</a></li>)}</ul>
    </div>
  );
}
