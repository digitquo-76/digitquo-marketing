'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRightIcon, HomeIcon, UsersIcon } from '../../../components/ui/icons';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<'seller' | 'broker'>('seller');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('retail');
  const [market, setMarket] = useState('');

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'broker' || roleParam === 'seller') {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'broker') {
      router.push('/broker');
    } else {
      router.push('/seller');
    }
  };

  return (
    <main className="auth-main">
      <section className="auth-panel">
        <aside className="auth-story" aria-label="DigitQuo account benefits">
          <div className="auth-story-content">
            <span className="auth-badge"><span className="badge-dot" /> Early access is open</span>
            <h1 className="auth-title">Start trading from the side that fits your business.</h1>
            <p className="auth-copy">
              Create a seller or broker profile, then jump into the panel designed around your day-to-day workflow.
            </p>
            <div className="auth-proof-grid">
              <div className="auth-proof-card">
                <span className="auth-proof-value">2.5k+</span>
                <span className="auth-proof-label">Sellers</span>
              </div>
              <div className="auth-proof-card">
                <span className="auth-proof-value">800+</span>
                <span className="auth-proof-label">Active brokers</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <span className="auth-kicker">
              {role === 'seller' ? <HomeIcon size={14} /> : <UsersIcon size={14} />}
              Create profile
            </span>
            <h2 className="auth-form-title">Create an account</h2>
            <p className="auth-form-subtitle">Join DigitQuo as a seller or broker.</p>
          </div>

          <div className="auth-role-toggle" aria-label="Choose account role">
            <button
              type="button"
              className={`auth-role-option${role === 'seller' ? ' active' : ''}`}
              onClick={() => setRole('seller')}
            >
              Seller
            </button>
            <button
              type="button"
              className={`auth-role-option${role === 'broker' ? ' active' : ''}`}
              onClick={() => setRole('broker')}
            >
              Broker
            </button>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                required
                suppressHydrationWarning
                className="auth-field"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                suppressHydrationWarning
                className="auth-field"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {role === 'seller' && (
              <div className="auth-dynamic-fields">
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="businessName">Business name</label>
                  <input
                    id="businessName"
                    type="text"
                    required
                    className="auth-field"
                    placeholder="Acme Corp"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="businessType">Business type</label>
                  <select
                    id="businessType"
                    className="auth-select"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="manufacturer">Manufacturer</option>
                  </select>
                </div>
              </div>
            )}

            {role === 'broker' && (
              <div className="auth-dynamic-fields">
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="market">Target market / region</label>
                  <input
                    id="market"
                    type="text"
                    required
                    className="auth-field"
                    placeholder="e.g. North India"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary auth-submit">
              Create account <ArrowRightIcon size={16} />
            </button>
          </form>

          <p className="auth-alt">
            Already have an account?{' '}
            <Link href="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="auth-loading">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
