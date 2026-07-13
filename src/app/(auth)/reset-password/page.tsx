'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, ShieldIcon } from '../../../components/ui/icons';
import { ensureUserProfile } from '../../../lib/profile';
import { supabase } from '../../../lib/supabase';
import { routeForProfile } from '../../../lib/utils';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      setCheckingSession(false);
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Both password fields must match.');
      return;
    }

    setSubmitting(true);
    const { data, error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError || !data.user) {
      setSubmitting(false);
      setError(updateError?.message || 'Could not update your password.');
      return;
    }

    try {
      const profile = await ensureUserProfile(data.user);
      router.replace(routeForProfile(profile));
    } catch (profileError) {
      setSubmitting(false);
      setError(profileError instanceof Error ? profileError.message : 'Password updated, but your profile could not be opened.');
    }
  };

  if (checkingSession) return <main className="auth-main"><div className="auth-loading">Checking reset link...</div></main>;

  return (
    <main className="auth-main">
      <section className="auth-dashboard">
        <aside className="auth-story" aria-label="Reset your password">
          <div className="auth-story-content">
            <span className="auth-badge"><span className="badge-dot" /> Account recovery</span>
            <h1 className="auth-title">Set a new password.</h1>
            <p className="auth-copy">Choose a fresh password to restore access to your DigitQuo Store workspace.</p>
          </div>
        </aside>

        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <span className="auth-kicker"><ShieldIcon size={14} /> Password reset</span>
            <h2 className="auth-form-title">Create your new password</h2>
            <p className="auth-form-subtitle">Use at least 8 characters. After saving, you will return to your dashboard.</p>
          </div>

          <form className="auth-form" onSubmit={updatePassword}>
            {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="auth-field"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="auth-field"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
              {submitting ? 'Saving password...' : 'Save password'} <ArrowRightIcon size={16} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
