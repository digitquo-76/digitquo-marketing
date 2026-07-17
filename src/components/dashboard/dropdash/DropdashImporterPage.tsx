'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDigitQuoStore } from '../../../lib/store';
import { formatCurrency, isProfileComplete, routeForProfile } from '../../../lib/utils';
import {
  calculateImportedProductPrice,
  IMPORT_COMMISSION_RATE_ON_MARKUP,
  IMPORT_MARKUP_RATE,
  IMPORT_PRICE_ADD_ON
} from '../../../lib/importPricing';
import { supabase } from '../../../lib/supabase';
import { DashboardShell } from '../DashboardShell';
import { PageSkeleton } from '../../ui/PageSkeleton';
import { ToastRegion } from '../../ui/ToastRegion';
import { ActivityIcon, BackIcon, GridIcon, LayersIcon, PackageIcon, SaleIcon, UsersIcon, WalletIcon } from '../../ui/icons';

type ImportProduct = {
  id: string;
  name: string;
  category: string;
  mrp: number;
  commission: number;
  stock: number;
  image: string;
  imageCount?: number;
  sourceUrl: string;
};

type ImportResult = {
  dryRun: boolean;
  seller: string;
  sourceUrl: string;
  pagesScanned: number;
  totalPages: number;
  totalRecords: number;
  cappedAtPageLimit: boolean;
  scanned: number;
  imported: number;
  created: number;
  updated: number;
  categories: string[];
  detailWarnings: number;
  detailWarningIds: string[];
  products: ImportProduct[];
};

const TARGET_SELLER_EMAIL = 'ebrahimsekh06s@gmail.com';

export function DropdashImporterPage() {
  const store = useDigitQuoStore({ loadWorkspace: false });
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState('https://app.dropdash.co/home');
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startPage, setStartPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(5);
  const [connected, setConnected] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [connectionWorking, setConnectionWorking] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [resultUsedConnection, setResultUsedConnection] = useState(false);
  const [error, setError] = useState('');

  const allowed = Boolean(
    store.profile?.role === 'admin' ||
    store.profile?.email?.toLowerCase() === TARGET_SELLER_EMAIL
  );

  useEffect(() => {
    if (store.loading) return;
    if (!store.user) {
      router.replace('/login');
      return;
    }
    if (!store.profile?.role || !isProfileComplete(store.profile)) {
      router.replace(routeForProfile(store.profile));
    }
  }, [router, store.loading, store.profile, store.user]);

  useEffect(() => {
    if (store.loading || !store.user || !allowed) {
      setConnectionLoading(false);
      return;
    }

    let cancelled = false;

    async function loadConnection() {
      setConnectionLoading(true);
      setConnectionError('');
      try {
        const response = await authorizedDropdashRequest('/api/import/dropdash/connect');
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Could not check the Dropdash connection.');
        if (!cancelled) setConnected(Boolean(payload?.connected));
      } catch (nextError) {
        if (!cancelled) {
          setConnected(false);
          setConnectionError(nextError instanceof Error ? nextError.message : 'Could not check the Dropdash connection.');
        }
      } finally {
        if (!cancelled) setConnectionLoading(false);
      }
    }

    void loadConnection();
    return () => {
      cancelled = true;
    };
  }, [allowed, store.loading, store.user]);

  const sample = useMemo(() => calculateImportedProductPrice(165), []);

  if (store.loading || !store.user || !store.profile?.role || !isProfileComplete(store.profile)) {
    return <PageSkeleton variant="dashboard" />;
  }

  const nav = store.profile.role === 'admin' ? adminNav : sellerNav;
  const displayName = store.profile.business_name || store.profile.display_name || store.profile.email || 'Importer';
  const roleLabel = store.profile.role === 'admin' ? 'Full platform access' : 'Seller import access';
  const initials = getInitials(displayName);

  const requestOtp = async () => {
    const normalizedMobileNo = mobileNo.replace(/\D/g, '');
    if (!/^\d{10}$/.test(normalizedMobileNo)) {
      setConnectionError('Enter a valid 10-digit Dropdash mobile number.');
      return;
    }

    setConnectionWorking(true);
    setConnectionError('');
    try {
      const response = await authorizedDropdashRequest('/api/import/dropdash/connect/request-otp', {
        method: 'POST',
        body: JSON.stringify({ mobileNo: normalizedMobileNo })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Could not request the Dropdash OTP.');
      setMobileNo(normalizedMobileNo);
      setOtp('');
      setOtpRequested(true);
      store.showToast('Dropdash OTP sent.', 'success');
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Could not request the Dropdash OTP.';
      setConnectionError(message);
      store.showToast(message, 'error');
    } finally {
      setConnectionWorking(false);
    }
  };

  const verifyOtp = async () => {
    const normalizedMobileNo = mobileNo.replace(/\D/g, '');
    const normalizedOtp = otp.replace(/\D/g, '');
    if (!/^\d{10}$/.test(normalizedMobileNo) || !/^\d{6}$/.test(normalizedOtp)) {
      setConnectionError('Enter the 6-digit OTP sent to your Dropdash mobile number.');
      return;
    }

    setConnectionWorking(true);
    setConnectionError('');
    try {
      const response = await authorizedDropdashRequest('/api/import/dropdash/connect/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ mobileNo: normalizedMobileNo, otp: normalizedOtp })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.connected) throw new Error(payload?.error || 'Could not connect to Dropdash.');
      setConnected(true);
      setMobileNo('');
      setOtp('');
      setOtpRequested(false);
      store.showToast('Dropdash connected securely.', 'success');
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Could not connect to Dropdash.';
      setConnectionError(message);
      store.showToast(message, 'error');
    } finally {
      setConnectionWorking(false);
    }
  };

  const disconnect = async () => {
    setConnectionWorking(true);
    setConnectionError('');
    try {
      const response = await authorizedDropdashRequest('/api/import/dropdash/connect', { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Could not disconnect Dropdash.');
      setConnected(false);
      setMobileNo('');
      setOtp('');
      setOtpRequested(false);
      setResult(null);
      setResultUsedConnection(false);
      store.showToast('Dropdash disconnected.', 'success');
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Could not disconnect Dropdash.';
      setConnectionError(message);
      store.showToast(message, 'error');
    } finally {
      setConnectionWorking(false);
    }
  };

  const runImport = async (dryRun: boolean) => {
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      if (!dryRun && !connected) throw new Error('Connect your Dropdash account before importing products.');
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again before importing products.');

      const response = await fetch('/api/import/dropdash', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceUrl,
          startPage,
          pageLimit,
          productName: productName.trim(),
          categoryId: categoryId ? Number(categoryId) : undefined,
          dryRun
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Could not import products.');

      setResult(payload);
      setResultUsedConnection(connected);
      store.showToast(dryRun ? 'Preview loaded.' : 'Dropdash products imported.', 'success');
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Could not import products.';
      setError(message);
      store.showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void runImport(false);
  };

  return (
    <>
      <DashboardShell
        label={store.profile.role === 'admin' ? 'Private owner dashboard' : 'Seller workspace'}
        nav={nav}
        user={{ initials, name: displayName, role: roleLabel }}
        title="Dropdash importer"
        actions={<button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={store.logout}>Sign out</button>}
      >
        {!allowed ? (
          <section className="dashboard-card">
            <div className="dashboard-card-body empty-state">
              <strong>Importer access is restricted</strong>
              <p>This page only allows admins or {TARGET_SELLER_EMAIL} to import Dropdash products.</p>
            </div>
          </section>
        ) : (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Hidden importer</p>
                <h1 className="page-title">Bring Dropdash products into DigitQuo.</h1>
                <p className="page-description">Search the Dropdash catalog, preview matching products, then import them under {TARGET_SELLER_EMAIL}.</p>
              </div>
            </section>

            <div className="importer-layout">
              <section className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Import settings</h2>
                    <p className="dashboard-card-subtitle">Runs on demand from this hidden page</p>
                  </div>
                </header>
                <form className="dashboard-card-body importer-form" onSubmit={submit}>
                  <div className="importer-rule-card">
                    <div className="importer-rule">
                      <span>Secure Dropdash connection</span>
                      <strong>{connectionLoading ? 'Checking connection...' : connected ? 'Connected' : 'Not connected'}</strong>
                      <p className="page-description">Public preview is available with the primary product image. Connect by OTP to preview and import complete galleries and variants. The Dropdash access token is kept in an encrypted HttpOnly session cookie and is never stored in this page or browser storage.</p>
                    </div>
                    {!connectionLoading && !connected && (
                      <div className="form-grid">
                        <label className="form-group">
                          <span className="form-label">Dropdash mobile number</span>
                          <input
                            className="form-control"
                            value={mobileNo}
                            onChange={(event) => setMobileNo(event.target.value.replace(/\D/g, '').slice(0, 10))}
                            type="tel"
                            inputMode="numeric"
                            autoComplete="off"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            placeholder="10-digit mobile number"
                          />
                        </label>
                        {otpRequested && (
                          <label className="form-group">
                            <span className="form-label">One-time password</span>
                            <input
                              className="form-control"
                              value={otp}
                              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              pattern="[0-9]{6}"
                              maxLength={6}
                              placeholder="6-digit OTP"
                            />
                          </label>
                        )}
                      </div>
                    )}
                    {!connectionLoading && (
                      <div className="importer-actions">
                        {connected ? (
                          <button className="btn-dashboard btn-dashboard-secondary" type="button" disabled={connectionWorking || submitting} onClick={() => void disconnect()}>
                            {connectionWorking ? 'Disconnecting...' : 'Disconnect Dropdash'}
                          </button>
                        ) : otpRequested ? (
                          <>
                            <button className="btn-dashboard btn-dashboard-secondary" type="button" disabled={connectionWorking} onClick={() => void requestOtp()}>Resend OTP</button>
                            <button className="btn-dashboard btn-dashboard-primary" type="button" disabled={connectionWorking || otp.length !== 6} onClick={() => void verifyOtp()}>{connectionWorking ? 'Connecting...' : 'Verify and connect'}</button>
                          </>
                        ) : (
                          <button className="btn-dashboard btn-dashboard-primary" type="button" disabled={connectionWorking || mobileNo.length !== 10} onClick={() => void requestOtp()}>{connectionWorking ? 'Sending OTP...' : 'Send OTP'}</button>
                        )}
                      </div>
                    )}
                    {connectionError && <p className="importer-error">{connectionError}</p>}
                  </div>
                  <label className="form-group full">
                    <span className="form-label">Dropdash URL</span>
                    <input className="form-control" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required type="url" placeholder="https://app.dropdash.co/home" />
                  </label>
                  <div className="form-grid">
                    <label className="form-group">
                      <span className="form-label">Product search (optional)</span>
                      <input className="form-control" value={productName} onChange={(event) => setProductName(event.target.value)} maxLength={120} placeholder="Search product name" />
                    </label>
                    <label className="form-group">
                      <span className="form-label">Category ID (optional)</span>
                      <input className="form-control" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} type="number" min="1" step="1" placeholder="Dropdash category ID" />
                    </label>
                    <label className="form-group">
                      <span className="form-label">Start page</span>
                      <input className="form-control" value={startPage} onChange={(event) => setStartPage(Number(event.target.value))} type="number" min="1" step="1" />
                    </label>
                    <label className="form-group">
                      <span className="form-label">Pages to scan</span>
                      <input className="form-control" value={pageLimit} onChange={(event) => setPageLimit(Number(event.target.value))} type="number" min="1" max="50" step="1" />
                    </label>
                  </div>
                  <div className="importer-actions">
                    <button className="btn-dashboard btn-dashboard-secondary" type="button" disabled={submitting || connectionLoading || connectionWorking} onClick={() => void runImport(true)}>{connected ? 'Preview' : 'Preview primary images'}</button>
                    <button className="btn-dashboard btn-dashboard-primary" type="submit" disabled={submitting || connectionLoading || connectionWorking || !connected}>{submitting ? 'Working...' : 'Import products'}</button>
                  </div>
                  {error && <p className="importer-error">{error}</p>}
                </form>
              </section>

              <aside className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Pricing rule</h2>
                    <p className="dashboard-card-subtitle">Applied to every imported item</p>
                  </div>
                </header>
                <div className="dashboard-card-body importer-rule-card">
                  <div className="importer-rule">
                    <span>Product price</span>
                    <strong>(Dropdash price + Rs {IMPORT_PRICE_ADD_ON}) + {IMPORT_MARKUP_RATE * 100}%</strong>
                  </div>
                  <div className="importer-rule">
                    <span>Broker commission</span>
                    <strong>{IMPORT_COMMISSION_RATE_ON_MARKUP * 100}% of the {IMPORT_MARKUP_RATE * 100}% markup</strong>
                  </div>
                  <div className="importer-rule">
                    <span>Product stock</span>
                    <strong>Imported from the current Dropdash inventory</strong>
                  </div>
                  <p className="page-description">Example with a Dropdash price of Rs 165: product MRP becomes {formatMoney(sample.mrp)}, broker commission becomes {formatMoney(sample.commission)}.</p>
                </div>
              </aside>
            </div>

            {result && (
              <section className="dashboard-card importer-results">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">{result.dryRun ? 'Preview results' : 'Import results'}</h2>
                    <p className="dashboard-card-subtitle">
                      {result.scanned} products scanned across {result.pagesScanned} page{result.pagesScanned === 1 ? '' : 's'}{result.totalRecords > 0 ? ` from ${result.totalRecords} matching records` : ''}
                    </p>
                  </div>
                </header>
                <div className="dashboard-card-body importer-summary-grid">
                  <SummaryStat label="Seller" value={result.seller} />
                  <SummaryStat label="Scanned" value={String(result.scanned)} />
                  <SummaryStat label="Imported" value={String(result.imported)} />
                  <SummaryStat label="Created / updated" value={result.dryRun ? 'Preview only' : `${result.created} / ${result.updated}`} />
                </div>
                {result.categories.length > 0 && (
                  <div className="importer-note">
                    {result.dryRun ? 'Categories detected' : 'Categories available to product forms'}: {result.categories.join(', ')}
                  </div>
                )}
                {result.dryRun && !resultUsedConnection && (
                  <div className="importer-note">This public preview includes primary images only. Connect Dropdash by OTP, then preview again to load complete image galleries and product variants before importing.</div>
                )}
                {result.cappedAtPageLimit && (
                  <div className="importer-note">More Dropdash results are available. Increase pages to scan, or run the next batch from a later start page.</div>
                )}
                {result.detailWarnings > 0 && (
                  <div className="importer-note">
                    Dropdash did not return complete images or variants for {result.detailWarnings} product{result.detailWarnings === 1 ? '' : 's'}. Existing product details were kept where available; re-run the import later to retry them.
                    {result.detailWarningIds.length > 0 && <> Affected IDs: {result.detailWarningIds.join(', ')}.</>}
                  </div>
                )}
                <div className="table-wrap">
                  <table className="data-table importer-table">
                    <thead><tr><th>Product</th><th>Category</th><th>MRP</th><th>Commission</th><th>Images</th><th>Stock</th></tr></thead>
                    <tbody>
                      {result.products.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <div className="product-cell">
                              <span className="product-thumb">{product.image ? <img src={product.image} alt="" /> : 'IMG'}</span>
                              <span>
                                <span className="cell-title">{product.name}</span>
                                <br />
                                <a className="cell-meta" href={product.sourceUrl} target="_blank" rel="noreferrer">{product.id}</a>
                              </span>
                            </div>
                          </td>
                          <td>{product.category}</td>
                          <td>{formatCurrency(product.mrp)}</td>
                          <td>{formatMoney(product.commission)}</td>
                          <td>{product.imageCount || 0}</td>
                          <td>{product.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </DashboardShell>
      <ToastRegion toasts={store.toasts} />
    </>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="importer-summary-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const adminNav: [string, string, React.ReactNode][] = [
  ['/admin', 'Overview', <GridIcon key="grid" />],
  ['/admin/activity', 'All activity', <ActivityIcon key="activity" />],
  ['/admin/products', 'All products', <PackageIcon key="package" />],
  ['/admin/categories', 'Categories', <LayersIcon key="categories" />],
  ['/admin/transactions', 'Transactions', <SaleIcon key="sale" />],
  ['/admin/claims', 'Claims & Payouts', <WalletIcon key="wallet" />],
  ['/profile', 'My profile', <UsersIcon size={18} key="profile" />],
  ['/', 'Back to website', <BackIcon key="back" />]
];

const sellerNav: [string, string, React.ReactNode][] = [
  ['/seller', 'Overview', <GridIcon key="grid" />],
  ['/seller/products', 'My products', <PackageIcon key="package" />],
  ['/seller/orders', 'Orders', <SaleIcon key="sale" />],
  ['/seller/analytics', 'Analytics', <ActivityIcon key="activity" />],
  ['/profile', 'My profile', <UsersIcon size={18} key="profile" />],
  ['/', 'Back to website', <BackIcon key="back" />]
];

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Math.round(Number(value || 0)));
}

function getInitials(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return 'DI';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
}

async function authorizedDropdashRequest(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Please sign in again before connecting Dropdash.');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers
  });
}
