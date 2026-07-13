import '../../styles/app.css';
import Link from 'next/link';
import { ArrowRightIcon, LogoMark } from '../../components/ui/icons';

export const metadata = {
  title: 'DigitQuo Store - Authentication',
  description: 'Log in or create an account for DigitQuo Store.'
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-route="landing" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="bg-effects" aria-hidden="true">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
          <div className="bg-grid" />
        </div>
        <div className="auth-shell">
          <div className="auth-topbar">
            <Link href="/" className="auth-home-link">
              <LogoMark />
              <span>DigitQuo Store</span>
            </Link>
            <Link href="/#roles" className="auth-mini-link">
              Explore roles <ArrowRightIcon size={14} />
            </Link>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
