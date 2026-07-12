'use client';

export type AccountRole = 'seller' | 'broker' | 'admin';

export interface DigitQuoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AccountRole;
  businessName?: string;
  market?: string;
  createdAt: string;
}

export interface AuthSession {
  accountId: string;
  name: string;
  email: string;
  role: AccountRole;
}

const AUTH_KEYS = {
  accounts: 'digitquo_accounts_v1',
  session: 'digitquo_session_v1'
};

export const DEMO_PASSWORD = 'demo123';

export const DEMO_ACCOUNTS: DigitQuoAccount[] = [
  {
    id: 'demo_seller',
    name: 'My Store',
    email: 'seller@digitquo.com',
    password: DEMO_PASSWORD,
    role: 'seller',
    businessName: 'My Store',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo_broker',
    name: 'Partner Broker',
    email: 'broker@digitquo.com',
    password: DEMO_PASSWORD,
    role: 'broker',
    market: 'North India',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo_admin',
    name: 'Owner Admin',
    email: 'admin@digitquo.com',
    password: DEMO_PASSWORD,
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readAccounts(): DigitQuoAccount[] {
  if (!canUseStorage()) return [];
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEYS.accounts) || '[]') as DigitQuoAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: DigitQuoAccount[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(AUTH_KEYS.accounts, JSON.stringify(accounts));
}

export function getAccounts() {
  const customAccounts = readAccounts();
  const customEmails = new Set(customAccounts.map((account) => normalizeEmail(account.email)));
  return [...customAccounts, ...DEMO_ACCOUNTS.filter((account) => !customEmails.has(normalizeEmail(account.email)))];
}

export function loginAccount(email: string, password: string) {
  const account = getAccounts().find((item) => normalizeEmail(item.email) === normalizeEmail(email));
  if (!account || account.password !== password) {
    return { ok: false as const, message: 'Email or password is incorrect.' };
  }

  const session: AuthSession = {
    accountId: account.id,
    name: account.name,
    email: account.email,
    role: account.role
  };
  localStorage.setItem(AUTH_KEYS.session, JSON.stringify(session));
  return { ok: true as const, session };
}

export function registerAccount(account: Omit<DigitQuoAccount, 'id' | 'createdAt'>) {
  const email = normalizeEmail(account.email);
  if (getAccounts().some((item) => normalizeEmail(item.email) === email)) {
    return { ok: false as const, message: 'An account with this email already exists.' };
  }

  const nextAccount: DigitQuoAccount = {
    ...account,
    email,
    id: `acct_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString()
  };
  writeAccounts([nextAccount, ...readAccounts()]);

  const session: AuthSession = {
    accountId: nextAccount.id,
    name: nextAccount.name,
    email: nextAccount.email,
    role: nextAccount.role
  };
  localStorage.setItem(AUTH_KEYS.session, JSON.stringify(session));
  return { ok: true as const, session };
}

export function routeForRole(role: AccountRole) {
  if (role === 'admin') return '/admin';
  if (role === 'broker') return '/broker';
  return '/seller';
}
