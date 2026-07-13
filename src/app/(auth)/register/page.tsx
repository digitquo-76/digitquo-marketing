'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRightIcon, HomeIcon, UsersIcon } from '../../../components/ui/icons';
import { routeForProfile } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { ensureUserProfile } from '../../../lib/profile';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'account' | 'details'>('account');
  const [role, setRole] = useState<'seller' | 'broker'>('seller');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('retail');
  const [market, setMarket] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'broker' || roleParam === 'seller') setRole(roleParam);
  }, [searchParams]);

  const continueToDetails = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!name.trim() || !email.trim() || password.length < 8) {
      setError('Enter your name, email, and a password with at least 8 characters.');
      return;
    }

    setStep('details');
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (role === 'seller' && !businessName.trim()) {
      setError('Enter your business name to create a seller profile.');
      return;
    }

    if (role === 'broker' && !market.trim()) {
      setError('Enter your target market or region to create a broker profile.');
      return;
    }

    setSubmitting(true);
    const displayName = role === 'seller' ? businessName.trim() : name.trim();

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
          role,
          business_name: role === 'seller' ? businessName.trim() : null,
          business_type: role === 'seller' ? businessType : null,
          market: role === 'broker' ? market.trim() : null,
        }
      }
    });

    if (authError || !data.user) {
      setSubmitting(false);
      setError(authError?.message || 'Registration failed.');
      return;
    }

    if (!data.session) {
      setSubmitting(false);
      setNotice('Account created. Check your email to confirm your account, then sign in.');
      return;
    }

    try {
      const profile = await ensureUserProfile(data.user);
      router.push(routeForProfile(profile));
    } catch (profileError) {
      setSubmitting(false);
      setError(profileError instanceof Error ? profileError.message : 'Could not prepare your account profile.');
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setNotice('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (authError) setError(authError.message);
  };

  return (
    <main className="auth-main">
      <section className="auth-panel">
        <aside className="auth-story" aria-label="DigitQuo account benefits">
          <div className="auth-story-content">
            <span className="auth-badge"><span className="badge-dot" /> Early access is open</span>
            <h1 className="auth-title">Start trading from the side that fits your business.</h1>
            <p className="auth-copy">Create your login first, then complete the seller or broker profile that matches your work.</p>
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
              {step === 'account' ? <UsersIcon size={14} /> : role === 'seller' ? <HomeIcon size={14} /> : <UsersIcon size={14} />}
              {step === 'account' ? 'Account setup' : 'Profile details'}
            </span>
            <h2 className="auth-form-title">{step === 'account' ? 'Create your login' : 'Choose your role'}</h2>
            <p className="auth-form-subtitle">
              {step === 'account'
                ? 'Use an email or Gmail address with a secure password, or continue with Google.'
                : 'Tell us whether you are joining as a seller or broker.'}
            </p>
          </div>

          {step === 'account' && (
            <button type="button" onClick={handleGoogleSignup} className="btn-panel btn-panel-secondary" style={{ width: '100%', marginBottom: '20px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              Continue with Google
            </button>
          )}

          <form onSubmit={step === 'account' ? continueToDetails : handleRegister} className="auth-form">
            {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}
            {notice && <div className="auth-alert" role="status">{notice}</div>}

            {step === 'account' && (
              <>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="name">Full name</label>
                  <input id="name" type="text" required autoComplete="name" className="auth-field" placeholder="John Doe" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="email">Email or Gmail address</label>
                  <input id="email" type="email" required autoComplete="email" className="auth-field" placeholder="name@gmail.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="password">Password</label>
                  <input id="password" type="password" required minLength={8} autoComplete="new-password" className="auth-field" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary auth-submit">Continue <ArrowRightIcon size={16} /></button>
              </>
            )}

            {step === 'details' && (
              <>
                <div className="auth-role-toggle" aria-label="Choose account role">
                  <button type="button" className={`auth-role-option${role === 'seller' ? ' active' : ''}`} onClick={() => setRole('seller')}>Seller</button>
                  <button type="button" className={`auth-role-option${role === 'broker' ? ' active' : ''}`} onClick={() => setRole('broker')}>Broker</button>
                </div>

                {role === 'seller' && (
                  <div className="auth-dynamic-fields">
                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="businessName">Business name</label>
                      <input id="businessName" type="text" required className="auth-field" placeholder="Acme Corp" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="businessType">Business type</label>
                      <select id="businessType" className="auth-select" value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
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
                      <input id="market" type="text" required className="auth-field" placeholder="e.g. North India" value={market} onChange={(event) => setMarket(event.target.value)} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn-panel btn-panel-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('account')}>Back</button>
                  <button type="submit" className="btn btn-primary auth-submit" style={{ flex: 1 }}>{submitting ? 'Creating account...' : 'Create account'} <ArrowRightIcon size={16} /></button>
                </div>
              </>
            )}
          </form>

          <p className="auth-alt">Already have an account? <Link href="/login" className="auth-link">Sign in</Link></p>
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
