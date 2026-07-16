import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const authCookieName = 'digitquo_supabase_auth';
const maxCookieChunks = 20;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.warn('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const encodedName = encodeURIComponent(name);
  const cookie = document.cookie.split('; ').find((row) => row.startsWith(`${encodedName}=`));
  if (!cookie) return null;
  return decodeURIComponent(cookie.split('=').slice(1).join('='));
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function clearChunkedCookie(key: string) {
  removeCookie(key);
  const chunkCount = Number(readCookie(`${key}.chunks`) || maxCookieChunks);
  for (let index = 0; index < Math.max(chunkCount, maxCookieChunks); index += 1) {
    removeCookie(`${key}.${index}`);
  }
  removeCookie(`${key}.chunks`);
}

function migrateLegacyCookieSession() {
  if (typeof window === 'undefined') return;
  try {
    let legacyValue = readCookie(authCookieName);
    const chunkCount = Number(readCookie(`${authCookieName}.chunks`) || 0);
    if (window.localStorage.getItem(authCookieName)) {
      if (legacyValue || chunkCount > 0) clearChunkedCookie(authCookieName);
      return;
    }

    if (!legacyValue && chunkCount > 0) {
      legacyValue = Array.from({ length: chunkCount }, (_, index) => readCookie(`${authCookieName}.${index}`) || '').join('');
    }

    if (legacyValue) {
      window.localStorage.setItem(authCookieName, legacyValue);
      clearChunkedCookie(authCookieName);
    }
  } catch {
    // Supabase will fall back to its normal in-memory behavior when storage is unavailable.
  }
}

migrateLegacyCookieSession();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: false,
    persistSession: true,
    storageKey: authCookieName
  }
});
