'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, HomeIcon, UsersIcon } from '../../../components/ui/icons';
import { routeForProfile } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { ensureUserProfile } from '../../../lib/profile';

type Role = 'seller' | 'broker';

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('seller');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('retail');
  const [market, setMarket] = useState('');
  const [payoutAccountName, setPayoutAccountName] = useState('');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [payoutIfsc, setPayoutIfsc] = useState('');
  const [payoutUpi, setPayoutUpi] = useState('');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      let profile;
      try {
        profile = await ensureUserProfile(session.user);
      } catch (profileError) {
        if (!mounted) return;
        setError(profileError instanceof Error ? profileError.message : 'Your profile could not be prepared.');
        setLoading(false);
        return;
      }

      if (!mounted) return;

      if (profile.onboarding_complete) {
        router.replace(routeForProfile(profile));
        return;
      }

      setUserId(session.user.id);
      setEmail(profile.email || session.user.email || '');
      setName(profile.display_name || session.user.user_metadata?.full_name || '');
      setRole(profile.role === 'broker' ? 'broker' : 'seller');
      setBusinessName(profile.business_name || '');
      setBusinessType(profile.business_type || 'retail');
      setMarket(profile.market || '');
      setPayoutAccountName(profile.payout_account_name || '');
      setPayoutBankName(profile.payout_bank_name || '');
      setPayoutAccountNumber(profile.payout_account_number || '');
      setPayoutIfsc(profile.payout_ifsc || '');
      setPayoutUpi(profile.payout_upi || '');
      setLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  const completeOnboarding = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!userId) {
      setError('You need to be signed in to finish onboarding.');
      return;
    }

    if (role === 'seller' && !businessName.trim()) {
      setError('Enter your business name to continue.');
      return;
    }

    if (role === 'broker' && !market.trim()) {
      setError('Enter your target market or region to continue.');
      return;
    }

    if (role === 'broker' && !hasPayoutDetails({ payoutAccountName, payoutBankName, payoutAccountNumber, payoutIfsc, payoutUpi })) {
      setError('Add the account holder name and either UPI ID or bank account details for manual payouts.');
      return;
    }

    setSubmitting(true);
    const displayName = role === 'seller' ? businessName.trim() : name.trim() || email;
    const update = {
      role,
      display_name: displayName,
      business_name: role === 'seller' ? businessName.trim() : null,
      business_type: role === 'seller' ? businessType : null,
      market: role === 'broker' ? market.trim() : null,
      payout_account_name: role === 'broker' ? payoutAccountName.trim() : null,
      payout_bank_name: role === 'broker' ? payoutBankName.trim() : null,
      payout_account_number: role === 'broker' ? payoutAccountNumber.trim() : null,
      payout_ifsc: role === 'broker' ? payoutIfsc.trim().toUpperCase() : null,
      payout_upi: role === 'broker' ? payoutUpi.trim() : null,
      onboarding_complete: true,
    };

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)
      .select('role,onboarding_complete')
      .single();

    if (updateError || !data) {
      setSubmitting(false);
      setError(updateError?.message || 'Could not save your profile details.');
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: displayName,
        role,
        business_name: update.business_name,
        business_type: update.business_type,
        market: update.market,
        payout_account_name: update.payout_account_name,
        payout_bank_name: update.payout_bank_name,
        payout_account_number: update.payout_account_number,
        payout_ifsc: update.payout_ifsc,
        payout_upi: update.payout_upi,
      }
    });

    router.replace(routeForProfile(data));
  };

  if (loading) return <main className="auth-main"><div className="auth-loading">Loading profile...</div></main>;

  return (
    <main className="auth-main">
      <section className="auth-dashboard">
        <aside className="auth-story" aria-label="Complete your profile">
          <div className="auth-story-content">
            <span className="auth-badge"><span className="badge-dot" /> One last step</span>
            <h1 className="auth-title">Finish your DigitQuo Store profile.</h1>
            <p className="auth-copy">Google gives us your identity. This step tells DigitQuo Store which workspace to open and what details to attach to your account.</p>
          </div>
        </aside>

        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <span className="auth-kicker">{role === 'seller' ? <HomeIcon size={14} /> : <UsersIcon size={14} />} Onboarding</span>
            <h2 className="auth-form-title">Choose your workspace</h2>
            <p className="auth-form-subtitle">Your dashboard will be based on this role.</p>
          </div>

          <form className="auth-form" onSubmit={completeOnboarding}>
            {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}

            <div className="auth-role-toggle" aria-label="Choose account role">
              <button type="button" className={`auth-role-option${role === 'seller' ? ' active' : ''}`} onClick={() => setRole('seller')}>Seller</button>
              <button type="button" className={`auth-role-option${role === 'broker' ? ' active' : ''}`} onClick={() => setRole('broker')}>Broker</button>
            </div>

            {role === 'broker' && (
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="name">Full name</label>
                <input id="name" className="auth-field" value={name} onChange={(event) => setName(event.target.value)} placeholder="John Doe" />
              </div>
            )}

            {role === 'seller' ? (
              <div className="auth-dynamic-fields">
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="businessName">Business name</label>
                  <input id="businessName" className="auth-field" required value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Acme Corp" />
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
            ) : (
              <div className="auth-dynamic-fields">
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="market">Target market / region</label>
                  <input id="market" className="auth-field" required value={market} onChange={(event) => setMarket(event.target.value)} placeholder="e.g. North India" />
                </div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="payoutAccountName">Account holder name</label>
                  <input id="payoutAccountName" className="auth-field" required value={payoutAccountName} onChange={(event) => setPayoutAccountName(event.target.value)} placeholder="Name on bank account or UPI" />
                </div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="payoutUpi">UPI ID</label>
                  <input id="payoutUpi" className="auth-field" value={payoutUpi} onChange={(event) => setPayoutUpi(event.target.value)} placeholder="name@bank" />
                </div>
                <div className="auth-form-divider"><span>Or add bank account details</span></div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="payoutBankName">Bank name</label>
                  <input id="payoutBankName" className="auth-field" value={payoutBankName} onChange={(event) => setPayoutBankName(event.target.value)} placeholder="Bank name" />
                </div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="payoutAccountNumber">Account number</label>
                  <input id="payoutAccountNumber" className="auth-field" inputMode="numeric" value={payoutAccountNumber} onChange={(event) => setPayoutAccountNumber(event.target.value)} placeholder="Account number" />
                </div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="payoutIfsc">IFSC code</label>
                  <input id="payoutIfsc" className="auth-field" value={payoutIfsc} onChange={(event) => setPayoutIfsc(event.target.value.toUpperCase())} placeholder="IFSC code" />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary auth-submit">
              {submitting ? 'Saving profile...' : 'Finish setup'} <ArrowRightIcon size={16} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function hasPayoutDetails(values: { payoutAccountName: string; payoutBankName: string; payoutAccountNumber: string; payoutIfsc: string; payoutUpi: string }) {
  const accountName = values.payoutAccountName.trim();
  const upi = values.payoutUpi.trim();
  const bank = values.payoutBankName.trim();
  const accountNumber = values.payoutAccountNumber.trim();
  const ifsc = values.payoutIfsc.trim();

  return Boolean(accountName && (upi || (bank && accountNumber && ifsc)));
}
