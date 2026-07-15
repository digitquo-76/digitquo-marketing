'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, ShieldIcon } from '../../../components/ui/icons';
import { PageSkeleton } from '../../../components/ui/PageSkeleton';
import { getAuthCallbackUrl, routeForProfile } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { ensureUserProfile } from '../../../lib/profile';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreateAccountPrompt, setShowCreateAccountPrompt] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function redirectExistingSession() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError) {
        setError(sessionError.message);
        setCheckingSession(false);
        return;
      }

      if (!session?.user) {
        setCheckingSession(false);
        return;
      }

      try {
        const profile = await ensureUserProfile(session.user);
        if (mounted) router.replace(routeForProfile(profile));
      } catch (profileError) {
        if (mounted) {
          setError(profileError instanceof Error ? profileError.message : 'Could not prepare your account profile.');
          setCheckingSession(false);
        }
      }
    }

    redirectExistingSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setShowCreateAccountPrompt(false);
    setSubmitting(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setSubmitting(false);
      const message = authError?.message || 'Login failed.';
      const invalidCredentials = message.toLowerCase().includes('invalid login credentials');
      setError(invalidCredentials ? 'We could not sign you in. Check your password, or create an account if you do not have one.' : message);
      setShowCreateAccountPrompt(invalidCredentials);
      return;
    }

    try {
      const profile = await ensureUserProfile(authData.user);
      router.push(routeForProfile(profile));
    } catch (profileError) {
      setSubmitting(false);
      setError(profileError instanceof Error ? profileError.message : 'Could not prepare your account profile.');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setNotice('');
    setShowCreateAccountPrompt(false);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthCallbackUrl(),
      },
    });
    if (error) setError(error.message);
  };

  const handlePasswordReset = async () => {
    setError('');
    setNotice('');
    setShowCreateAccountPrompt(false);

    const resetEmail = email.trim();
    if (!resetEmail) {
      setError('Enter your email address first, then request a password reset link.');
      return;
    }

    setResetSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: getAuthCallbackUrl(),
    });
    setResetSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setNotice('Password reset link sent. Check your email and open the link to set a new password.');
  };

  if (checkingSession) return <PageSkeleton variant="auth" />;

  return (
    <main className="auth-main">
      <section className="auth-dashboard">
        <aside className="auth-story" aria-label="DigitQuo Store marketplace highlights">
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
            <p className="auth-form-subtitle">Sign in to continue to your DigitQuo Store dashboard.</p>
          </div>

          <button type="button" onClick={handleGoogleLogin} className="btn-dashboard btn-dashboard-secondary" style={{ width: '100%', marginBottom: '20px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
             <div style={{ flex: 1, height: '1px', background: 'var(--dashboard-border)' }}></div>
             <span style={{ fontSize: '0.8rem', color: 'var(--dashboard-muted)' }}>OR</span>
             <div style={{ flex: 1, height: '1px', background: 'var(--dashboard-border)' }}></div>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                {error}
                {showCreateAccountPrompt && (
                  <>
                    {' '}
                    <Link href="/register" className="auth-link">Create an account</Link>
                  </>
                )}
              </div>
            )}
            {notice && <div className="auth-alert" role="status">{notice}</div>}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
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
                <button type="button" className="auth-link auth-link-button" onClick={handlePasswordReset} disabled={resetSubmitting}>
                  {resetSubmitting ? 'Sending reset...' : 'Forgot password?'}
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                suppressHydrationWarning
                className="auth-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit">
              {submitting ? 'Signing in...' : 'Sign in'} <ArrowRightIcon size={16} />
            </button>
          </form>

          <p className="auth-alt" style={{ marginTop: '30px' }}>
            New to DigitQuo Store?{' '}
            <Link href="/register" className="auth-link">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
