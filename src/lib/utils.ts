export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

export function relativeTime(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  
  return formatDate(value);
}

export function formatNumber(num: number): string {
  return num >= 1000 ? num.toLocaleString() : num.toString();
}

export function safeImageUrl(url: string): string {
  const value = String(url || '').trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) return value;
  return '';
}

export function getProductImages(value: string): string[] {
  const raw = String(value || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => safeImageUrl(String(item || ''))).filter(Boolean);
    }
  } catch {
    // Legacy products stored one plain image URL/data URI in this field.
  }

  const image = safeImageUrl(raw);
  return image ? [image] : [];
}

export function serializeProductImages(images: string[]): string {
  const clean = images.map((image) => safeImageUrl(image)).filter(Boolean);
  if (!clean.length) return '';
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}

export function getAuthCallbackUrl() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(currentOrigin);
  const origin = isLocalOrigin ? currentOrigin : configuredOrigin || currentOrigin;

  return `${origin}/auth/callback`;
}

export function routeForRole(role: string) {
  if (role === 'admin') return '/admin';
  if (role === 'broker') return '/broker';
  return '/seller';
}

export type ProfileRouteState = {
  role?: string | null;
  onboarding_complete?: boolean | null;
};

export function isProfileComplete(profile?: ProfileRouteState | null) {
  return Boolean(profile?.onboarding_complete || profile?.role === 'admin');
}

export function routeForProfile(profile?: ProfileRouteState | null) {
  if (!profile?.role || !isProfileComplete(profile)) return '/onboarding';
  return routeForRole(profile.role);
}
