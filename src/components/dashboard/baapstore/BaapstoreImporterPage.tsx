'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDigitQuoStore } from '../../../lib/store';
import { formatCurrency, isProfileComplete, routeForProfile } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { DashboardShell } from '../DashboardShell';
import { PageSkeleton } from '../../ui/PageSkeleton';
import { ToastRegion } from '../../ui/ToastRegion';
import { ActivityIcon, BackIcon, GridIcon, LayersIcon, PackageIcon, SaleIcon, ShieldIcon, UsersIcon, WalletIcon } from '../../ui/icons';

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
  mode: string;
  pagesScanned: number;
  totalPages: number;
  cappedAtPageLimit: boolean;
  scanned: number;
  imported: number;
  created: number;
  updated: number;
  categories: string[];
  imageDetailWarnings: number;
  imageDetailWarningIds: string[];
  products: ImportProduct[];
};

const TARGET_SELLER_EMAIL = 'ebrahimsekh06s@gmail.com';
const PRICE_ADD_ON = 40;
const MARKUP_RATE = 0.15;
const COMMISSION_RATE_ON_MARKUP = 0.8;

export function BaapstoreImporterPage() {
  const store = useDigitQuoStore({ loadWorkspace: false });
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState('https://www.baapstore.com/products');
  const [mode, setMode] = useState<'single-page' | 'listing-pages'>('listing-pages');
  const [startPage, setStartPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(5);
  const [stock, setStock] = useState(25);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
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

  const sample = useMemo(() => calculatePrice(165), []);

  if (store.loading || !store.user || !store.profile?.role || !isProfileComplete(store.profile)) {
    return <PageSkeleton variant="dashboard" />;
  }

  const nav = store.profile.role === 'admin' ? adminNav : sellerNav;
  const displayName = store.profile.business_name || store.profile.display_name || store.profile.email || 'Importer';
  const roleLabel = store.profile.role === 'admin' ? 'Full platform access' : 'Seller import access';
  const initials = getInitials(displayName);

  const runImport = async (dryRun: boolean) => {
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again before importing products.');

      const response = await fetch('/api/import/baapstore', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceUrl,
          mode,
          startPage,
          pageLimit,
          stock,
          dryRun
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Could not import products.');

      setResult(payload);
      store.showToast(dryRun ? 'Preview loaded.' : 'Baapstore products imported.', 'success');
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
    runImport(false);
  };

  return (
    <>
      <DashboardShell
        label={store.profile.role === 'admin' ? 'Private owner dashboard' : 'Seller workspace'}
        nav={nav}
        user={{ initials, name: displayName, role: roleLabel }}
        title="Baapstore importer"
        actions={<button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={store.logout}>Sign out</button>}
      >
        {!allowed ? (
          <section className="dashboard-card">
            <div className="dashboard-card-body empty-state">
              <strong>Importer access is restricted</strong>
              <p>This page only allows admins or {TARGET_SELLER_EMAIL} to import Baapstore products.</p>
            </div>
          </section>
        ) : (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Hidden importer</p>
                <h1 className="page-title">Bring Baapstore products into DigitQuo.</h1>
                <p className="page-description">Paste a Baapstore listing URL, preview the products, then import them under {TARGET_SELLER_EMAIL}.</p>
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
                  <label className="form-group full">
                    <span className="form-label">Baapstore URL</span>
                    <input className="form-control" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required placeholder="https://www.baapstore.com/products" />
                  </label>
                  <div className="form-grid">
                    <label className="form-group">
                      <span className="form-label">Import mode</span>
                      <select className="form-control" value={mode} onChange={(event) => setMode(event.target.value as 'single-page' | 'listing-pages')}>
                        <option value="single-page">This exact page only</option>
                        <option value="listing-pages">Multiple pages from this listing</option>
                      </select>
                    </label>
                    <label className="form-group">
                      <span className="form-label">Start page</span>
                      <input className="form-control" value={startPage} onChange={(event) => setStartPage(Number(event.target.value))} type="number" min="1" step="1" />
                    </label>
                    <label className="form-group">
                      <span className="form-label">Pages to scan</span>
                      <input className="form-control" value={pageLimit} onChange={(event) => setPageLimit(Number(event.target.value))} type="number" min="1" max="50" step="1" disabled={mode === 'single-page'} />
                    </label>
                    <label className="form-group">
                      <span className="form-label">Default stock</span>
                      <input className="form-control" value={stock} onChange={(event) => setStock(Number(event.target.value))} type="number" min="0" step="1" />
                    </label>
                  </div>
                  <div className="importer-actions">
                    <button className="btn-dashboard btn-dashboard-secondary" type="button" disabled={submitting} onClick={() => runImport(true)}>Preview</button>
                    <button className="btn-dashboard btn-dashboard-primary" type="submit" disabled={submitting}>{submitting ? 'Working...' : 'Import products'}</button>
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
                    <strong>(Baapstore price + Rs {PRICE_ADD_ON}) + 15%</strong>
                  </div>
                  <div className="importer-rule">
                    <span>Broker commission</span>
                    <strong>80% of the 15% markup</strong>
                  </div>
                  <p className="page-description">Example with a Baapstore price of Rs 165: product MRP becomes {formatMoney(sample.mrp)}, broker commission becomes {formatMoney(sample.commission)}.</p>
                </div>
              </aside>
            </div>

            {result && (
              <section className="dashboard-card importer-results">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">{result.dryRun ? 'Preview results' : 'Import results'}</h2>
                    <p className="dashboard-card-subtitle">{result.scanned} products found across {result.pagesScanned} page{result.pagesScanned === 1 ? '' : 's'}</p>
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
                {result.cappedAtPageLimit && (
                  <div className="importer-note">This listing has {result.totalPages} pages. Increase pages to scan, or run the next batch from a later start page.</div>
                )}
                {result.imageDetailWarnings > 0 && (
                  <div className="importer-note">
                    Baapstore did not return a complete gallery for {result.imageDetailWarnings} product{result.imageDetailWarnings === 1 ? '' : 's'}. Existing image galleries were kept where available; re-run the import later to retry them.
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

function calculatePrice(sourcePrice: number) {
  const subtotal = sourcePrice + PRICE_ADD_ON;
  const markup = subtotal * MARKUP_RATE;
  return {
    mrp: Math.round(subtotal + markup),
    commission: Math.round(markup * COMMISSION_RATE_ON_MARKUP)
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Math.round(Number(value || 0)));
}

function getInitials(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return 'BI';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
}
