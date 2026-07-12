'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, ShieldIcon } from '../../../components/ui/icons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.toLowerCase().includes('broker')) {
      router.push('/broker');
    } else {
      router.push('/seller');
    }
  };

  return (
    <main className="auth-main">
      <section className="auth-panel">
        <aside className="auth-story" aria-label="DigitQuo marketplace highlights">
          <div className="auth-story-content">
            <span className="auth-badge"><span className="badge-dot" /> Modern trade access</span>
            <h1 className="auth-title">Pick up right where your marketplace left off.</h1>
            <p className="auth-copy">
              Manage listings, broker requests, and growth insights from the same calm dashboard built for sellers and brokers.
            </p>
            <div className="auth-proof-grid">
              <div className="auth-proof-card">
                <span className="auth-proof-value">15k+</span>
                <span className="auth-proof-label">Products listed</span>
              </div>
              <div className="auth-proof-card">
                <span className="auth-proof-value">98%</span>
                <span className="auth-proof-label">Satisfaction</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <span className="auth-kicker"><ShieldIcon size={14} /> Secure sign in</span>
            <h2 className="auth-form-title">Welcome back</h2>
            <p className="auth-form-subtitle">Sign in to continue to your DigitQuo panel.</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                suppressHydrationWarning
                className="auth-field"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field-group">
              <div className="auth-field-row">
                <label className="auth-label" htmlFor="password">Password</label>
                <a href="#" className="auth-link">Forgot password?</a>
              </div>
              <input
                id="password"
                type="password"
                required
                suppressHydrationWarning
                className="auth-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit">
              Sign in <ArrowRightIcon size={16} />
            </button>
          </form>

          <p className="auth-alt">
            New to DigitQuo?{' '}
            <Link href="/register" className="auth-link">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
