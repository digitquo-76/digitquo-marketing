'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ensureUserProfile } from '../../../../lib/profile';
import { supabase } from '../../../../lib/supabase';
import { routeForProfile } from '../../../../lib/utils';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Finishing sign in...');

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
        setMessage(providerError);
        return;
      }

      try {
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
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
          throw new Error('This sign-in link was created for an older auth flow. Please start login or signup again.');
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('Sign in did not return a user.');

        const profile = await ensureUserProfile(user);
        if (mounted) router.replace(routeForProfile(profile));
      } catch (error) {
        if (mounted) {
          setMessage(error instanceof Error ? error.message : 'Could not finish sign in.');
        }
      }
    }

    finishAuth();

    return () => {
      mounted = false;
    };
  }, [router, searchParams]);

  return (
    <main className="auth-main">
      <section className="auth-dashboard">
        <aside className="auth-story" aria-label="Signing in">
          <div className="auth-story-content">
            <span className="auth-badge"><span className="badge-dot" /> Secure sign in</span>
            <h1 className="auth-title">Connecting your account.</h1>
            <p className="auth-copy">DigitQuo Store is verifying your Google sign in and preparing your workspace.</p>
          </div>
        </aside>
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <span className="auth-kicker">Authentication</span>
            <h2 className="auth-form-title">{message}</h2>
            <p className="auth-form-subtitle">You will be redirected automatically when this is complete.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="auth-main"><div className="auth-loading">Finishing sign in...</div></main>}>
      <AuthCallback />
    </Suspense>
  );
}
