import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AppProfile = {
  id: string;
  role: 'seller' | 'broker' | 'admin';
  email: string;
  display_name?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  market?: string | null;
  payout_account_name?: string | null;
  payout_bank_name?: string | null;
  payout_account_number?: string | null;
  payout_ifsc?: string | null;
  payout_upi?: string | null;
  onboarding_complete?: boolean | null;
};

function hasPayoutDetails(values: {
  payout_account_name?: string | null;
  payout_bank_name?: string | null;
  payout_account_number?: string | null;
  payout_ifsc?: string | null;
  payout_upi?: string | null;
}) {
  const accountName = String(values.payout_account_name || '').trim();
  const upi = String(values.payout_upi || '').trim();
  const bank = String(values.payout_bank_name || '').trim();
  const accountNumber = String(values.payout_account_number || '').trim();
  const ifsc = String(values.payout_ifsc || '').trim();

  return Boolean(accountName && (upi || (bank && accountNumber && ifsc)));
}

export async function ensureUserProfile(user: User): Promise<AppProfile> {
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as AppProfile;

  const metadata = user.user_metadata || {};
  const role = metadata.role === 'broker' ? 'broker' : 'seller';
  const businessName = role === 'seller' ? String(metadata.business_name || '').trim() : '';
  const market = role === 'broker' ? String(metadata.market || '').trim() : '';
  const payoutDetails = {
    payout_account_name: role === 'broker' ? String(metadata.payout_account_name || '').trim() : '',
    payout_bank_name: role === 'broker' ? String(metadata.payout_bank_name || '').trim() : '',
    payout_account_number: role === 'broker' ? String(metadata.payout_account_number || '').trim() : '',
    payout_ifsc: role === 'broker' ? String(metadata.payout_ifsc || '').trim().toUpperCase() : '',
    payout_upi: role === 'broker' ? String(metadata.payout_upi || '').trim() : '',
  };

  const profile = {
    id: user.id,
    role,
    email: user.email || '',
    display_name: String(metadata.full_name || metadata.name || '').trim() || user.email || '',
    business_name: businessName || null,
    business_type: role === 'seller' ? String(metadata.business_type || 'retail') : null,
    market: market || null,
    payout_account_name: payoutDetails.payout_account_name || null,
    payout_bank_name: payoutDetails.payout_bank_name || null,
    payout_account_number: payoutDetails.payout_account_number || null,
    payout_ifsc: payoutDetails.payout_ifsc || null,
    payout_upi: payoutDetails.payout_upi || null,
    onboarding_complete: Boolean((role === 'seller' && businessName) || (role === 'broker' && market && hasPayoutDetails(payoutDetails))),
  };

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert(profile)
    .select('*')
    .single();

  if (insertError) throw insertError;
  return created as AppProfile;
}
