'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDigitQuoStore } from '../../lib/store';
import { formatCurrency, formatDate, isProfileComplete, routeForProfile } from '../../lib/utils';
import { DashboardShell } from './DashboardShell';
import { ActivityList, EmptyRow, Metric, ProductCell, StockBadge } from './Shared';
import { ToastRegion } from '../ui/ToastRegion';
import { ActivityIcon, BackIcon, GridIcon, PackageIcon, SaleIcon, SearchIcon, ShieldIcon, UsersIcon, WalletIcon } from '../ui/icons';

type AdminSection = 'overview' | 'activity' | 'products' | 'transactions' | 'claims';

export function AdminDashboardPage({ section }: { section: AdminSection }) {
  const store = useDigitQuoStore();
  const router = useRouter();
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  
  useEffect(() => {
    if (store.loading) return;
    if (!store.user) {
      router.replace('/login');
      return;
    }
    if (!store.profile?.role || !isProfileComplete(store.profile)) {
      router.replace(routeForProfile(store.profile));
      return;
    }
    if (store.profile.role !== 'admin') {
      router.replace(routeForProfile(store.profile));
    }
  }, [router, store.loading, store.profile, store.user]);

  if (store.loading || !store.user || store.profile?.role !== 'admin' || !isProfileComplete(store.profile)) return <div style={{ padding: '40px' }}>Loading workspace...</div>;

  const sellers = new Set(store.products.map((product) => product.seller));
  const productCategories = Array.from(new Set(store.products.map((product) => product.category))).sort();
  const sellerNames = Array.from(sellers).sort();
  const filteredProducts = store.products.filter((product) => {
    const query = productSearch.trim().toLowerCase();
    const matchesSearch = `${product.name} ${product.seller} ${product.category} ${product.description}`.toLowerCase().includes(query);
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesSeller = sellerFilter === 'all' || product.seller === sellerFilter;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in-stock' && product.stock > 10) ||
      (stockFilter === 'low-stock' && product.stock > 0 && product.stock <= 10) ||
      (stockFilter === 'out-of-stock' && product.stock <= 0);
    return matchesSearch && matchesCategory && matchesSeller && matchesStock;
  });
  const brokers = new Set(store.sales.map((sale) => sale.broker));
  const grossSales = store.sales.reduce((sum, sale) => sum + sale.total, 0);
  const unitsSold = store.sales.reduce((sum, sale) => sum + sale.quantity, 0);

  const pendingClaimsCount = store.claims.filter(c => c.status === 'pending').length;
  const pendingClaims = store.claims.filter(c => c.status === 'pending');
  const totalPaidOut = store.claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.points, 0);

  const markAsPaid = async (claimId: string, broker: string, points: number) => {
    try {
      await store.updateClaimStatus(claimId, 'paid');
      await store.addActivity('sale', `Platform paid out ${points} pts to ${broker}.`);
      store.showToast('Claim marked as paid.', 'success');
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not update claim.', 'error');
    }
  };

  return (
    <>
      <DashboardShell
        label="Private owner dashboard"
        nav={[
          ['/admin', 'Overview', <GridIcon key="grid" />],
          ['/admin/activity', 'All activity', <ActivityIcon key="activity" />],
          ['/admin/products', 'All products', <PackageIcon key="package" />],
          ['/admin/transactions', 'Transactions', <SaleIcon key="sale" />],
          ['/admin/claims', 'Claims & Payouts', <WalletIcon key="wallet" />],
          ['/profile', 'My profile', <UsersIcon size={18} key="profile" />],
          ['/', 'Back to website', <BackIcon key="back" />]
        ]}
        user={{ initials: 'OA', name: 'Owner Admin', role: 'Full platform access' }}
        title="Owner administration"
        actions={<button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={store.logout}>Sign out</button>}
      >
        {section === 'overview' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Platform command centre</p>
                <h1 className="page-title">Every activity, organized by page.</h1>
                <p className="page-description">Monitor seller listings, broker orders, inventory movement, and platform payouts from dedicated admin sections.</p>
              </div>
            </section>

            <div className="admin-notice">
              <ShieldIcon size={24} />
              <div><strong>Owner-only workspace</strong>This page is excluded from search indexing and is not linked from the public website. Production access must be protected with server-side authentication.</div>
            </div>

            <section className="metrics-grid" aria-label="Platform metrics">
              <Metric icon={<UsersIcon size={18} />} value={sellers.size + brokers.size} label="Active platform accounts" />
              <Metric icon={<PackageIcon size={18} />} value={store.products.length} label="Product listings" />
              <Metric icon={<SaleIcon size={18} />} value={formatCurrency(grossSales)} label="Gross order value" />
              <Metric icon={<WalletIcon size={18} />} value={pendingClaimsCount} label="Pending payouts" />
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Inventory control</h2>
                    <p className="dashboard-card-subtitle">Review every seller listing on its own page</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/admin/products">View products</Link>
                </header>
                <div className="dashboard-card-body">
                  <p className="page-description">{store.products.length} products are published by {sellers.size} sellers.</p>
                </div>
              </article>
              <aside className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Payouts control</h2>
                    <p className="dashboard-card-subtitle">Manage broker commissions</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/admin/claims">View claims</Link>
                </header>
                <div className="dashboard-card-body">
                  <p className="page-description">{pendingClaimsCount} claims pending review. Total paid out to date: {formatCurrency(totalPaidOut)} (equiv. points).</p>
                </div>
              </aside>
            </section>
          </>
        )}

        {section === 'activity' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">All activity</p>
                <h1 className="page-title">Live activity trail.</h1>
                <p className="page-description">See product and order events from across the marketplace.</p>
              </div>
            </section>

            <section className="dashboard-card">
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">Live activity trail</h2>
                  <p className="dashboard-card-subtitle">Product and order events</p>
                </div>
              </header>
              <div className="dashboard-card-body"><ActivityList items={store.activity.slice(0, 50)} /></div>
            </section>
          </>
        )}

        {section === 'products' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">All products</p>
                <h1 className="page-title">Marketplace inventory.</h1>
                <p className="page-description">Review every product published by sellers, including stock state and creation date.</p>
              </div>
            </section>

            <section className="dashboard-card">
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">All marketplace products</h2>
                  <p className="dashboard-card-subtitle">{filteredProducts.length} of {store.products.length} products shown</p>
                </div>
                <div className="toolbar toolbar-wide">
                  <label className="search-wrap">
                    <SearchIcon size={15} />
                    <input className="search-input" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} type="search" placeholder="Search products" aria-label="Search all products" />
                  </label>
                  <select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter all products by category">
                    <option value="all">All categories</option>
                    {productCategories.map((categoryName) => <option value={categoryName} key={categoryName}>{categoryName}</option>)}
                  </select>
                  <select className="filter-select" value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)} aria-label="Filter products by seller">
                    <option value="all">All sellers</option>
                    {sellerNames.map((sellerName) => <option value={sellerName} key={sellerName}>{sellerName}</option>)}
                  </select>
                  <select className="filter-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filter all products by stock status">
                    <option value="all">All stock</option>
                    <option value="in-stock">In stock</option>
                    <option value="low-stock">Low stock</option>
                    <option value="out-of-stock">Out of stock</option>
                  </select>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Seller</th><th>MRP</th><th>Selling price</th><th>Stock</th><th>Status</th><th>Added</th></tr></thead>
                  <tbody>
                    {filteredProducts.length ? filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td><ProductCell product={product} /></td>
                        <td>{product.seller}</td>
                        <td>{formatCurrency(product.mrp ?? product.price)}</td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>{product.stock}</td>
                        <td><StockBadge stock={product.stock} /></td>
                        <td>{formatDate(product.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={7} title="No products found" text="Seller listings will appear here, or adjust your search and filters." />}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {section === 'transactions' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Transactions</p>
                <h1 className="page-title">Broker order log.</h1>
                <p className="page-description">Audit customer orders placed by brokers across the marketplace.</p>
              </div>
            </section>

            <section className="dashboard-card">
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">All broker orders</h2>
                  <p className="dashboard-card-subtitle">Complete customer order visibility</p>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Broker</th><th>Customer</th><th>Phone</th><th>Address</th><th>Quantity</th><th>Value</th><th>Date</th></tr></thead>
                  <tbody>
                    {store.sales.length ? store.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td><span className="cell-title">{sale.productName}</span><br /><span className="cell-meta">{sale.seller}</span></td>
                        <td>{sale.broker}</td>
                        <td>{sale.customer}</td>
                        <td>{sale.customerPhone || 'Not added'}</td>
                        <td>{sale.customerAddress || 'Not added'}</td>
                        <td>{sale.quantity}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>{formatDate(sale.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={8} title="No order activity" text="Orders placed by brokers will appear here." />}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {section === 'claims' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Payouts</p>
                <h1 className="page-title">Broker claims.</h1>
                <p className="page-description">Manage payout requests from brokers. Process payments and mark them as paid.</p>
              </div>
            </section>

            <section className="metrics-grid">
              <Metric icon={<WalletIcon size={18} />} value={pendingClaimsCount} label="Pending claims" />
              <Metric icon={<SaleIcon size={18} />} value={formatCurrency(totalPaidOut)} label="Total points paid out" />
            </section>

            <section className="dashboard-card" style={{ marginTop: '2rem' }}>
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">All claim requests</h2>
                  <p className="dashboard-card-subtitle">Requested broker commissions</p>
                </div>
              </header>
              {pendingClaims.length > 0 && (
                <div className="dashboard-card-body" style={{ paddingBottom: 0 }}>
                  {pendingClaims.slice(0, 3).map((claim) => (
                    <div className="claim-message" key={claim.id}>
                      <strong>{claim.broker} requested {claim.points} pts ({formatCurrency(claim.points)})</strong>
                      <p>Transfer manually using the payout details below, then mark the claim as paid.</p>
                      <PayoutDetails claim={claim} />
                    </div>
                  ))}
                </div>
              )}
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Claim ID</th><th>Broker</th><th>Points (Value)</th><th>Payout details</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {store.claims.length ? store.claims.map((claim) => (
                      <tr key={claim.id}>
                        <td><span className="cell-title">{claim.id}</span></td>
                        <td>{claim.broker}</td>
                        <td>{claim.points} ({formatCurrency(claim.points)})</td>
                        <td><PayoutDetails claim={claim} compact /></td>
                        <td>
                          {claim.status === 'paid' ? 
                            <span className="badge badge-success">Paid out</span> : 
                            <span className="badge badge-warning">Pending</span>}
                        </td>
                        <td>{formatDate(claim.createdAt)}</td>
                        <td>
                          {claim.status === 'pending' && (
                            <button className="btn-dashboard btn-dashboard-secondary" style={{ padding: '4px 8px', fontSize: '13px' }} type="button" onClick={() => markAsPaid(claim.id, claim.broker, claim.points)}>
                              Mark as paid
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : <EmptyRow colSpan={7} title="No claims found" text="Broker payout requests will appear here." />}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </DashboardShell>
      <ToastRegion toasts={store.toasts} />
    </>
  );
}

function PayoutDetails({ claim, compact = false }: { claim: any; compact?: boolean }) {
  const details = [
    ['Account holder', claim.payoutAccountName || 'Not added'],
    ['UPI ID', claim.payoutUpi || 'Not added'],
    ['Bank', claim.payoutBankName || 'Not added'],
    ['Account no.', claim.payoutAccountNumber || 'Not added'],
    ['IFSC', claim.payoutIfsc || 'Not added']
  ];

  if (compact) {
    return (
      <div className="cell-meta" style={{ minWidth: '220px', lineHeight: 1.55 }}>
        {details.map(([label, value]) => <div key={label}><strong>{label}:</strong> {value}</div>)}
      </div>
    );
  }

  return (
    <div className="payout-detail-grid">
      {details.map(([label, value]) => (
        <div className="payout-detail-item" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
