import { createClient } from '@supabase/supabase-js';
import type { SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const authCookieName = 'digitquo_supabase_auth';
const cookieChunkSize = 3000;
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

function writeCookie(name: string, value: string, maxAge = 604800) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function removeCookie(name: string) {
  writeCookie(name, '', 0);
}

function clearChunkedCookie(key: string) {
  removeCookie(key);
  const chunkCount = Number(readCookie(`${key}.chunks`) || maxCookieChunks);
  for (let index = 0; index < Math.max(chunkCount, maxCookieChunks); index += 1) {
    removeCookie(`${key}.${index}`);
  }
  removeCookie(`${key}.chunks`);
}

const cookieStorage: SupportedStorage = {
  getItem(key: string) {
    if (typeof document === 'undefined') return null;
    const singleCookieValue = readCookie(key);
    if (singleCookieValue) return singleCookieValue;

    const chunkCount = Number(readCookie(`${key}.chunks`) || 0);
    if (!chunkCount) return null;

    let value = '';
    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = readCookie(`${key}.${index}`);
      if (chunk === null) return null;
      value += chunk;
    }

    return value;
  },
  setItem(key: string, value: string) {
    if (typeof document === 'undefined') return;
    clearChunkedCookie(key);

    if (value.length <= cookieChunkSize) {
      writeCookie(key, value);
      return;
    }

    const chunks = value.match(new RegExp(`.{1,${cookieChunkSize}}`, 'g')) || [];
    writeCookie(`${key}.chunks`, String(chunks.length));
    chunks.forEach((chunk, index) => writeCookie(`${key}.${index}`, chunk));
  },
  removeItem(key: string) {
    if (typeof document === 'undefined') return;
    clearChunkedCookie(key);
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: false,
    persistSession: true,
    storage: cookieStorage,
    storageKey: authCookieName
  }
});
