'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageSkeleton } from '../../../../components/ui/PageSkeleton';
import { ensureUserProfile } from '../../../../lib/profile';
import { supabase } from '../../../../lib/supabase';
import { routeForProfile } from '../../../../lib/utils';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Finishing sign in...');
  const [failed, setFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    let mounted = true;

    async function finishAuth() {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const providerError =
        searchParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams.get('error_description') ||
        hashParams.get('error');

      if (providerError) {
        setMessage(formatAuthError(providerError));
        setFailed(true);
        return;
      }

      try {
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const authType = hashParams.get('type') || searchParams.get('type');
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (sessionError) throw sessionError;
          window.history.replaceState(null, '', window.location.pathname);
        }

        const code = searchParams.get('code');
        if (code && !accessToken) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState(null, '', window.location.pathname);
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('Sign in did not return a user.');

        if (authType === 'recovery') {
          if (mounted) router.replace('/reset-password');
          return;
        }

        const profile = await ensureUserProfile(user);
        if (mounted) router.replace(routeForProfile(profile));
      } catch (error) {
        if (mounted) {
          setMessage(formatAuthError(error instanceof Error ? error.message : 'Could not finish sign in.'));
          setFailed(true);
        }
      }
    }

    finishAuth();

    return () => {
      mounted = false;
    };
  }, [router, searchParams]);

  const resendConfirmation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmationEmail = email.trim();
    if (!confirmationEmail) return;

    setResending(true);
    setResendNotice('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: confirmationEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    setResending(false);

    if (error) {
      setResendNotice(error.message);
      return;
    }

    setResendNotice('A new confirmation link has been sent. Use only the newest email.');
  };

  return (
    <main className="auth-main">
      <section className="auth-dashboard">
        <aside className="auth-story" aria-label="Signing in">
          <div className="auth-story-content">
            <span className="auth-badge"><span className="badge-dot" /> Secure sign in</span>
            <h1 className="auth-title">Connecting your account.</h1>
            <p className="auth-copy">DigitQuo Store is verifying your secure sign-in link and preparing your workspace.</p>
          </div>
        </aside>
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <span className="auth-kicker">Authentication</span>
            <h2 className="auth-form-title">{message}</h2>
            <p className="auth-form-subtitle">
              {failed
                ? 'The link may have expired or already been used. Start sign in again, or request a fresh account-confirmation email below.'
                : 'You will be redirected automatically when this is complete.'}
            </p>
          </div>
          {failed && (
            <div className="auth-form">
              <div className="auth-field-row">
                <Link href="/login" className="btn btn-primary">Return to sign in</Link>
                <Link href="/register" className="btn btn-glass">Create account</Link>
              </div>
              <form className="auth-form" onSubmit={resendConfirmation}>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="confirmation-email">Need a new account-confirmation link?</label>
                  <input
                    id="confirmation-email"
                    className="auth-field"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <button className="btn btn-primary auth-submit" type="submit" disabled={resending}>
                  {resending ? 'Sending...' : 'Send a new confirmation link'}
                </button>
                {resendNotice && <div className="auth-alert" role="status">{resendNotice}</div>}
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('expired') || normalized.includes('invalid')) {
    return 'This sign-in link has expired or has already been used';
  }
  return message;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="auth" />}>
      <AuthCallback />
    </Suspense>
  );
}
