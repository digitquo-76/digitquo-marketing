'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDigitQuoStore, CURRENT_BROKER, createSale } from '../../../lib/store';
import { DashboardShell } from '../../../components/panel/DashboardShell';
import { Metric, EmptyRow, ProductImage } from '../../../components/panel/Shared';
import { SaleModal } from '../../../components/panel/Modals';
import { ToastRegion } from '../../../components/ui/ToastRegion';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { GridIcon, SearchIcon, SaleIcon, HomeIcon } from '../../../components/ui/icons';

export default function BrokerPage() {
  const store = useDigitQuoStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [saleProduct, setSaleProduct] = useState<any>(null);

  const available = store.products.filter((product) => product.stock > 0);
  const categories = Array.from(new Set(available.map((product) => product.category))).sort();
  const sales = store.sales.filter((sale) => sale.broker === CURRENT_BROKER);
  const visible = available.filter((product) => {
    const matchesSearch = `${product.name} ${product.seller} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = category === 'all' || product.category === category;
    return matchesSearch && matchesCategory;
  });

  const recordSale = ({ productId, customer, quantity }: any) => {
    const index = store.products.findIndex((product) => product.id === productId);
    const product = store.products[index];
    if (!product || !customer || quantity < 1 || quantity > product.stock) {
      store.showToast('Enter a customer and a valid quantity.', 'error');
      return;
    }
    const sale = createSale(product, customer, quantity, CURRENT_BROKER);
    const nextProducts = [...store.products];
    nextProducts[index] = { ...product, stock: product.stock - quantity };
    store.setProducts(nextProducts);
    store.setSales([sale, ...store.sales]);
    store.addActivity('sale', `${CURRENT_BROKER} sold ${quantity} × ${product.name} to ${customer} for ${formatCurrency(sale.total)}.`);
    setSaleProduct(null);
    store.showToast(`Sale recorded: ${formatCurrency(sale.total)}.`, 'success');
  };

  return (
    <>
      <DashboardShell
        label="Broker panel"
        nav={[
          ['#overview', 'Overview', <GridIcon key="grid" />],
          ['#catalog', 'Product catalog', <SearchIcon size={18} key="search" />],
          ['#sales', 'My sales', <SaleIcon key="sale" />],
          ['/shopkeeper', 'View seller panel', <HomeIcon size={18} key="home" />]
        ]}
        user={{ initials: 'PB', name: 'Partner Broker', role: 'Broker account' }}
        title="Broker workspace"
        actions={<Link className="btn-panel btn-panel-secondary" href="/">View website</Link>}
      >
        <section className="page-heading" id="overview">
          <div><p className="eyebrow">Broker overview</p><h1 className="page-title">Find products. Make the sale.</h1><p className="page-description">Browse live inventory from every seller, choose the right products for your customers, and record each completed sale.</p></div>
          <a className="btn-panel btn-panel-primary" href="#catalog">Browse all products</a>
        </section>

        <section className="metrics-grid" aria-label="Broker metrics">
          <Metric icon="▦" value={available.length} label="Products available" />
          <Metric icon="⌂" value={new Set(available.map((product) => product.seller)).size} label="Active sellers" />
          <Metric icon="◈" value={new Set(available.map((product) => product.category)).size} label="Product categories" />
          <Metric icon="₹" value={formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0))} label="My recorded sales" />
        </section>

        <section className="panel-card" id="catalog">
          <header className="panel-card-header">
            <div><h2 className="panel-card-title">Seller product catalog</h2><p className="panel-card-subtitle">Live products available for customer sales</p></div>
            <div className="toolbar">
              <label className="search-wrap"><SearchIcon size={15} /><input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search catalog" aria-label="Search product catalog" /></label>
              <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter products by category">
                <option value="all">All categories</option>
                {categories.map((categoryName) => <option value={categoryName} key={categoryName}>{categoryName}</option>)}
              </select>
            </div>
          </header>
          <div className="panel-card-body">
            <div className="catalog-grid">
              {visible.length ? visible.map((product) => (
                <article className="catalog-card" key={product.id}>
                  <div className="catalog-visual"><ProductImage product={product} /></div>
                  <div className="catalog-body">
                    <p className="catalog-seller">{product.seller}</p>
                    <h3 className="catalog-name">{product.name}</h3>
                    <div className="catalog-meta">
                      <span className="catalog-price">{formatCurrency(product.price)}</span>
                      <span className="catalog-stock">{product.stock} available</span>
                    </div>
                    <button className="btn-panel btn-panel-primary" type="button" onClick={() => setSaleProduct(product)}>Record customer sale</button>
                  </div>
                </article>
              )) : <div className="empty-state"><strong>No matching products</strong><p>Try another search or category.</p></div>}
            </div>
          </div>
        </section>

        <section className="panel-card" id="sales">
          <header className="panel-card-header"><div><h2 className="panel-card-title">My recent customer sales</h2><p className="panel-card-subtitle">Transactions recorded from this broker account</p></div></header>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Customer</th><th>Quantity</th><th>Total</th><th>Date</th></tr></thead>
              <tbody>
                {sales.length ? sales.slice(0, 8).map((sale) => (
                  <tr key={sale.id}>
                    <td><span className="cell-title">{sale.productName}</span><br /><span className="cell-meta">{sale.seller}</span></td>
                    <td>{sale.customer}</td>
                    <td>{sale.quantity}</td>
                    <td>{formatCurrency(sale.total)}</td>
                    <td>{formatDate(sale.createdAt)}</td>
                  </tr>
                )) : <EmptyRow colSpan={5} title="No sales recorded yet" text="Choose a product above to record your first sale." />}
              </tbody>
            </table>
          </div>
        </section>
      </DashboardShell>
      <SaleModal product={saleProduct} onClose={() => setSaleProduct(null)} onSave={recordSale} />
      <ToastRegion toasts={store.toasts} />
    </>
  );
}
