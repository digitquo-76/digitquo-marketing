export const COMPANY_NAME = 'DigitQuo';
export const COMPANY_PHONE = '8177957990';
export const COMPANY_EMAIL = 'digitquo@gmail.com';
export const COMPANY_LOGO_PATH = '/digitquo-logo.jpeg';

export const COMPANY = {
  name: COMPANY_NAME,
  phone: COMPANY_PHONE,
  email: COMPANY_EMAIL,
  logoPath: COMPANY_LOGO_PATH
} as const;

export function getCompanyMailto(subject?: string) {
  return `mailto:${COMPANY_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}
