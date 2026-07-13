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
  onboarding_complete?: boolean | null;
};

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

  const profile = {
    id: user.id,
    role,
    email: user.email || '',
    display_name: String(metadata.full_name || metadata.name || '').trim() || user.email || '',
    business_name: businessName || null,
    business_type: role === 'seller' ? String(metadata.business_type || 'retail') : null,
    market: market || null,
    onboarding_complete: Boolean((role === 'seller' && businessName) || (role === 'broker' && market)),
  };

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert(profile)
    .select('*')
    .single();

  if (insertError) throw insertError;
  return created as AppProfile;
}
