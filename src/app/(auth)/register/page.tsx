'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, HomeIcon, UsersIcon } from '../../../components/ui/icons';
import { getAuthCallbackUrl, routeForProfile } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { ensureUserProfile } from '../../../lib/profile';

function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<'account' | 'details'>('account');
  const [role, setRole] = useState<'seller' | 'broker'>('seller');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('retail');
  const [market, setMarket] = useState('');
  const [payoutAccountName, setPayoutAccountName] = useState('');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [payoutIfsc, setPayoutIfsc] = useState('');
  const [payoutUpi, setPayoutUpi] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const registrationInFlight = useRef(false);

  useEffect(() => {
    const roleParam = new URLSearchParams(window.location.search).get('role');
    if (roleParam === 'broker' || roleParam === 'seller') setRole(roleParam);
  }, []);

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
    if (registrationInFlight.current) return;

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

    if (role === 'broker' && !hasPayoutDetails({ payoutAccountName, payoutBankName, payoutAccountNumber, payoutIfsc, payoutUpi })) {
      setError('Add the account holder name and either UPI ID or bank account details for manual payouts.');
      return;
    }

    setSubmitting(true);
    registrationInFlight.current = true;
    const displayName = role === 'seller' ? businessName.trim() : name.trim();

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          full_name: displayName,
          role,
          business_name: role === 'seller' ? businessName.trim() : null,
          business_type: role === 'seller' ? businessType : null,
          market: role === 'broker' ? market.trim() : null,
          payout_account_name: role === 'broker' ? payoutAccountName.trim() : null,
          payout_bank_name: role === 'broker' ? payoutBankName.trim() : null,
          payout_account_number: role === 'broker' ? payoutAccountNumber.trim() : null,
          payout_ifsc: role === 'broker' ? payoutIfsc.trim().toUpperCase() : null,
          payout_upi: role === 'broker' ? payoutUpi.trim() : null,
        }
      }
    });

    if (authError || !data.user) {
      setSubmitting(false);
      registrationInFlight.current = false;
      setError(formatRegistrationError(authError?.message));
      return;
    }

    if (!data.session) {
      setSubmitting(false);
      registrationInFlight.current = false;
      setNotice('Account created. Check your email to confirm your account, then sign in.');
      return;
    }

    try {
      const profile = await ensureUserProfile(data.user);
      router.push(routeForProfile(profile));
    } catch (profileError) {
      setSubmitting(false);
      registrationInFlight.current = false;
      setError(profileError instanceof Error ? profileError.message : 'Could not prepare your account profile.');
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setNotice('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthCallbackUrl(),
      },
    });
    if (authError) setError(authError.message);
  };

  return (
    <main className="auth-main">
      <section className="auth-dashboard">
        <aside className="auth-story" aria-label="DigitQuo Store account benefits">
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
            <button type="button" onClick={handleGoogleSignup} className="btn-dashboard btn-dashboard-secondary" style={{ width: '100%', marginBottom: '20px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
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
                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="payoutAccountName">Account holder name</label>
                      <input id="payoutAccountName" type="text" required className="auth-field" placeholder="Name on bank account or UPI" value={payoutAccountName} onChange={(event) => setPayoutAccountName(event.target.value)} />
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="payoutUpi">UPI ID</label>
                      <input id="payoutUpi" type="text" className="auth-field" placeholder="name@bank" value={payoutUpi} onChange={(event) => setPayoutUpi(event.target.value)} />
                    </div>
                    <div className="auth-form-divider"><span>Or add bank account details</span></div>
                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="payoutBankName">Bank name</label>
                      <input id="payoutBankName" type="text" className="auth-field" placeholder="Bank name" value={payoutBankName} onChange={(event) => setPayoutBankName(event.target.value)} />
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="payoutAccountNumber">Account number</label>
                      <input id="payoutAccountNumber" type="text" inputMode="numeric" className="auth-field" placeholder="Account number" value={payoutAccountNumber} onChange={(event) => setPayoutAccountNumber(event.target.value)} />
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="payoutIfsc">IFSC code</label>
                      <input id="payoutIfsc" type="text" className="auth-field" placeholder="IFSC code" value={payoutIfsc} onChange={(event) => setPayoutIfsc(event.target.value.toUpperCase())} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn-dashboard btn-dashboard-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('account')} disabled={submitting}>Back</button>
                  <button type="submit" className="btn btn-primary auth-submit" style={{ flex: 1 }} disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'} <ArrowRightIcon size={16} /></button>
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

function formatRegistrationError(message?: string) {
  if (!message) return 'Registration failed.';

  if (message.toLowerCase().includes('security purposes')) {
    return 'Your account request is already being processed. Please check your email, or try again in a minute.';
  }

  return message;
}

function hasPayoutDetails(values: { payoutAccountName: string; payoutBankName: string; payoutAccountNumber: string; payoutIfsc: string; payoutUpi: string }) {
  const accountName = values.payoutAccountName.trim();
  const upi = values.payoutUpi.trim();
  const bank = values.payoutBankName.trim();
  const accountNumber = values.payoutAccountNumber.trim();
  const ifsc = values.payoutIfsc.trim();

  return Boolean(accountName && (upi || (bank && accountNumber && ifsc)));
}

export default function RegisterPage() {
  return <RegisterForm />;
}
