'use client';

import Link from 'next/link';
import { useDigitQuoStore } from '../../../lib/store';
import { DashboardShell } from '../../../components/panel/DashboardShell';
import { Metric, ActivityList, ProductCell, StockBadge, EmptyRow } from '../../../components/panel/Shared';
import { ToastRegion } from '../../../components/ui/ToastRegion';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { GridIcon, ActivityIcon, PackageIcon, SaleIcon, BackIcon, ShieldIcon } from '../../../components/ui/icons';

export default function AdminPage() {
  const store = useDigitQuoStore();
  const sellers = new Set(store.products.map((product) => product.seller));
  const brokers = new Set(store.sales.map((sale) => sale.broker));

  const resetData = () => {
    if (!window.confirm('Reset products, sales, and activity to the original demo data?')) return;
    store.resetDemoData();
    store.showToast('Demo data restored.', 'success');
  };

  return (
    <>
      <DashboardShell
        label="Private owner panel"
        nav={[
          ['#overview', 'Overview', <GridIcon key="grid" />],
          ['#activity', 'All activity', <ActivityIcon key="activity" />],
          ['#products', 'All products', <PackageIcon key="package" />],
          ['#transactions', 'Transactions', <SaleIcon key="sale" />],
          ['/', 'Back to website', <BackIcon key="back" />]
        ]}
        user={{ initials: 'OA', name: 'Owner Admin', role: 'Full platform access' }}
        title="Owner administration"
        actions={<button className="btn-panel btn-panel-secondary" type="button" onClick={resetData}>Reset demo data</button>}
      >
        <section className="page-heading" id="overview">
          <div><p className="eyebrow">Platform command centre</p><h1 className="page-title">Every activity, in one view.</h1><p className="page-description">Monitor seller listings, broker transactions, inventory movement, and the complete platform activity trail.</p></div>
        </section>

        <div className="admin-notice">
          <ShieldIcon size={24} />
          <div><strong>Owner-only workspace</strong>This page is excluded from search indexing and is not linked from the public website. Production access must be protected with server-side authentication.</div>
        </div>

        <section className="metrics-grid" aria-label="Platform metrics">
          <Metric icon="◎" value={sellers.size + brokers.size} label="Active platform accounts" />
          <Metric icon="▦" value={store.products.length} label="Product listings" />
          <Metric icon="◫" value={store.sales.reduce((sum, sale) => sum + sale.quantity, 0)} label="Units sold" />
          <Metric icon="₹" value={formatCurrency(store.sales.reduce((sum, sale) => sum + sale.total, 0))} label="Gross sales volume" />
        </section>

        <section className="dashboard-grid">
          <article className="panel-card" id="products">
            <header className="panel-card-header"><div><h2 className="panel-card-title">All marketplace products</h2><p className="panel-card-subtitle">Inventory published by every seller</p></div></header>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Status</th><th>Added</th></tr></thead>
                <tbody>
                  {store.products.map((product) => (
                    <tr key={product.id}>
                      <td><ProductCell product={product} /></td>
                      <td>{product.seller}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.stock}</td>
                      <td><StockBadge stock={product.stock} /></td>
                      <td>{formatDate(product.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <aside className="panel-card" id="activity">
            <header className="panel-card-header"><div><h2 className="panel-card-title">Live activity trail</h2><p className="panel-card-subtitle">Product and transaction events</p></div></header>
            <div className="panel-card-body"><ActivityList items={store.activity.slice(0, 12)} /></div>
          </aside>
        </section>

        <section className="panel-card" id="transactions">
          <header className="panel-card-header"><div><h2 className="panel-card-title">All broker transactions</h2><p className="panel-card-subtitle">Complete customer sales visibility</p></div></header>
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
      </DashboardShell>
      <ToastRegion toasts={store.toasts} />
    </>
  );
}
