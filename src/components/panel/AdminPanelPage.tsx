'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDigitQuoStore } from '../../lib/store';
import { formatCurrency, formatDate, routeForRole } from '../../lib/utils';
import { DashboardShell } from './DashboardShell';
import { ActivityList, EmptyRow, Metric, ProductCell, StockBadge } from './Shared';
import { ToastRegion } from '../ui/ToastRegion';
import { ActivityIcon, BackIcon, GridIcon, PackageIcon, SaleIcon, ShieldIcon, UsersIcon, WalletIcon } from '../ui/icons';

type AdminSection = 'overview' | 'activity' | 'products' | 'transactions' | 'claims';

export function AdminPanelPage({ section }: { section: AdminSection }) {
  const store = useDigitQuoStore();
  const router = useRouter();
  
  useEffect(() => {
    if (store.loading) return;
    if (!store.user) {
      router.replace('/login');
      return;
    }
    if (!store.profile?.role) {
      router.replace('/login');
      return;
    }
    if (store.profile.role !== 'admin') {
      router.replace(routeForRole(store.profile.role));
    }
  }, [router, store.loading, store.profile?.role, store.user]);

  if (store.loading || !store.user || store.profile?.role !== 'admin') return <div style={{ padding: '40px' }}>Loading workspace...</div>;

  const sellers = new Set(store.products.map((product) => product.seller));
  const brokers = new Set(store.sales.map((sale) => sale.broker));
  const grossSales = store.sales.reduce((sum, sale) => sum + sale.total, 0);
  const unitsSold = store.sales.reduce((sum, sale) => sum + sale.quantity, 0);

  const pendingClaimsCount = store.claims.filter(c => c.status === 'pending').length;
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
        label="Private owner panel"
        nav={[
          ['/admin', 'Overview', <GridIcon key="grid" />],
          ['/admin/activity', 'All activity', <ActivityIcon key="activity" />],
          ['/admin/products', 'All products', <PackageIcon key="package" />],
          ['/admin/transactions', 'Transactions', <SaleIcon key="sale" />],
          ['/admin/claims', 'Claims & Payouts', <WalletIcon key="wallet" />],
          ['/', 'Back to website', <BackIcon key="back" />]
        ]}
        user={{ initials: 'OA', name: 'Owner Admin', role: 'Full platform access' }}
        title="Owner administration"
        actions={<button className="btn-panel btn-panel-secondary" type="button" onClick={store.logout}>Sign out</button>}
      >
        {section === 'overview' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Platform command centre</p>
                <h1 className="page-title">Every activity, organized by page.</h1>
                <p className="page-description">Monitor seller listings, broker transactions, inventory movement, and platform payouts from dedicated admin sections.</p>
              </div>
            </section>

            <div className="admin-notice">
              <ShieldIcon size={24} />
              <div><strong>Owner-only workspace</strong>This page is excluded from search indexing and is not linked from the public website. Production access must be protected with server-side authentication.</div>
            </div>

            <section className="metrics-grid" aria-label="Platform metrics">
              <Metric icon={<UsersIcon size={18} />} value={sellers.size + brokers.size} label="Active platform accounts" />
              <Metric icon={<PackageIcon size={18} />} value={store.products.length} label="Product listings" />
              <Metric icon={<SaleIcon size={18} />} value={formatCurrency(grossSales)} label="Gross sales volume" />
              <Metric icon={<WalletIcon size={18} />} value={pendingClaimsCount} label="Pending payouts" />
            </section>

            <section className="dashboard-grid">
              <article className="panel-card">
                <header className="panel-card-header">
                  <div>
                    <h2 className="panel-card-title">Inventory control</h2>
                    <p className="panel-card-subtitle">Review every seller listing on its own page</p>
                  </div>
                  <Link className="btn-panel btn-panel-secondary" href="/admin/products">View products</Link>
                </header>
                <div className="panel-card-body">
                  <p className="page-description">{store.products.length} products are published by {sellers.size} sellers.</p>
                </div>
              </article>
              <aside className="panel-card">
                <header className="panel-card-header">
                  <div>
                    <h2 className="panel-card-title">Payouts control</h2>
                    <p className="panel-card-subtitle">Manage broker commissions</p>
                  </div>
                  <Link className="btn-panel btn-panel-secondary" href="/admin/claims">View claims</Link>
                </header>
                <div className="panel-card-body">
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
                <p className="page-description">See product and transaction events from across the marketplace.</p>
              </div>
            </section>

            <section className="panel-card">
              <header className="panel-card-header">
                <div>
                  <h2 className="panel-card-title">Live activity trail</h2>
                  <p className="panel-card-subtitle">Product and transaction events</p>
                </div>
              </header>
              <div className="panel-card-body"><ActivityList items={store.activity.slice(0, 50)} /></div>
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

            <section className="panel-card">
              <header className="panel-card-header">
                <div>
                  <h2 className="panel-card-title">All marketplace products</h2>
                  <p className="panel-card-subtitle">Inventory published by every seller</p>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Seller</th><th>MRP</th><th>Selling price</th><th>Stock</th><th>Status</th><th>Added</th></tr></thead>
                  <tbody>
                    {store.products.length ? store.products.map((product) => (
                      <tr key={product.id}>
                        <td><ProductCell product={product} /></td>
                        <td>{product.seller}</td>
                        <td>{formatCurrency(product.mrp ?? product.price)}</td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>{product.stock}</td>
                        <td><StockBadge stock={product.stock} /></td>
                        <td>{formatDate(product.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={7} title="No products found" text="Seller listings will appear here." />}
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
                <h1 className="page-title">Broker transaction log.</h1>
                <p className="page-description">Audit customer sales recorded by brokers across the marketplace.</p>
              </div>
            </section>

            <section className="panel-card">
              <header className="panel-card-header">
                <div>
                  <h2 className="panel-card-title">All broker transactions</h2>
                  <p className="panel-card-subtitle">Complete customer sales visibility</p>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Broker</th><th>Customer</th><th>Quantity</th><th>Value</th><th>Date</th></tr></thead>
                  <tbody>
                    {store.sales.length ? store.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td><span className="cell-title">{sale.productName}</span><br /><span className="cell-meta">{sale.seller}</span></td>
                        <td>{sale.broker}</td>
                        <td>{sale.customer}</td>
                        <td>{sale.quantity}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>{formatDate(sale.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={6} title="No transaction activity" text="Sales recorded by brokers will appear here." />}
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

            <section className="panel-card" style={{ marginTop: '2rem' }}>
              <header className="panel-card-header">
                <div>
                  <h2 className="panel-card-title">All claim requests</h2>
                  <p className="panel-card-subtitle">Requested broker commissions</p>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Claim ID</th><th>Broker</th><th>Points (Value)</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {store.claims.length ? store.claims.map((claim) => (
                      <tr key={claim.id}>
                        <td><span className="cell-title">{claim.id}</span></td>
                        <td>{claim.broker}</td>
                        <td>{claim.points} ({formatCurrency(claim.points)})</td>
                        <td>
                          {claim.status === 'paid' ? 
                            <span className="badge badge-success">Paid out</span> : 
                            <span className="badge badge-warning">Pending</span>}
                        </td>
                        <td>{formatDate(claim.createdAt)}</td>
                        <td>
                          {claim.status === 'pending' && (
                            <button className="btn-panel btn-panel-secondary" style={{ padding: '4px 8px', fontSize: '13px' }} type="button" onClick={() => markAsPaid(claim.id, claim.broker, claim.points)}>
                              Mark as paid
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : <EmptyRow colSpan={6} title="No claims found" text="Broker payout requests will appear here." />}
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
