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
  return /^(https?:\/\/|data:image\/)/i.test(url) ? url : '';
}

export function routeForRole(role: string) {
  if (role === 'admin') return '/admin';
  if (role === 'broker') return '/broker';
  return '/seller';
}
