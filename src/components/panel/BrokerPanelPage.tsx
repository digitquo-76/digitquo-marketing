'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CURRENT_BROKER, createSale, useDigitQuoStore } from '../../lib/store';
import { Product } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DashboardShell } from './DashboardShell';
import { EmptyRow, Metric, ProductImage } from './Shared';
import { SaleModal } from './Modals';
import { ToastRegion } from '../ui/ToastRegion';
import { GridIcon, HomeIcon, PackageIcon, SaleIcon, SearchIcon, UsersIcon } from '../ui/icons';

type BrokerSection = 'overview' | 'catalog' | 'sales';

export function BrokerPanelPage({ section }: { section: BrokerSection }) {
  const store = useDigitQuoStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);

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
    store.addActivity('sale', `${CURRENT_BROKER} sold ${quantity} x ${product.name} to ${customer} for ${formatCurrency(sale.total)}.`);
    setSaleProduct(null);
    store.showToast(`Sale recorded: ${formatCurrency(sale.total)}.`, 'success');
  };

  return (
    <>
      <DashboardShell
        label="Broker panel"
        nav={[
          ['/broker', 'Overview', <GridIcon key="grid" />],
          ['/broker/catalog', 'Product catalog', <SearchIcon size={18} key="search" />],
          ['/broker/sales', 'My sales', <SaleIcon key="sale" />],
          ['/seller', 'View seller panel', <HomeIcon size={18} key="home" />]
        ]}
        user={{ initials: 'PB', name: 'Partner Broker', role: 'Broker account' }}
        title="Broker workspace"
        actions={<Link className="btn-panel btn-panel-secondary" href="/">View website</Link>}
      >
        {section === 'overview' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Broker overview</p>
                <h1 className="page-title">Find products. Make the sale.</h1>
                <p className="page-description">Browse live inventory from every seller, choose the right products for your customers, and record each completed sale.</p>
              </div>
              <Link className="btn-panel btn-panel-primary" href="/broker/catalog">Browse all products</Link>
            </section>

            <section className="metrics-grid" aria-label="Broker metrics">
              <Metric icon={<PackageIcon size={18} />} value={available.length} label="Products available" />
              <Metric icon={<UsersIcon size={18} />} value={new Set(available.map((product) => product.seller)).size} label="Active sellers" />
              <Metric icon={<GridIcon />} value={new Set(available.map((product) => product.category)).size} label="Product categories" />
              <Metric icon={<SaleIcon size={18} />} value={formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0))} label="My recorded sales" />
            </section>

            <section className="dashboard-grid">
              <article className="panel-card">
                <header className="panel-card-header">
                  <div>
                    <h2 className="panel-card-title">Catalog workspace</h2>
                    <p className="panel-card-subtitle">Search live inventory and record customer sales</p>
                  </div>
                  <Link className="btn-panel btn-panel-secondary" href="/broker/catalog">Open catalog</Link>
                </header>
                <div className="panel-card-body">
                  <p className="page-description">{available.length} products are currently available from {new Set(available.map((product) => product.seller)).size} sellers.</p>
                </div>
              </article>
              <aside className="panel-card">
                <header className="panel-card-header">
                  <div>
                    <h2 className="panel-card-title">Sales workspace</h2>
                    <p className="panel-card-subtitle">Review customer transactions you recorded</p>
                  </div>
                  <Link className="btn-panel btn-panel-secondary" href="/broker/sales">View sales</Link>
                </header>
                <div className="panel-card-body">
                  <p className="page-description">{sales.length} broker sales recorded for {formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0))}.</p>
                </div>
              </aside>
            </section>
          </>
        )}

        {section === 'catalog' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Product catalog</p>
                <h1 className="page-title">Browse seller inventory.</h1>
                <p className="page-description">Search available products, filter by category, and record a customer sale from any catalog card.</p>
              </div>
            </section>

            <section className="panel-card">
              <header className="panel-card-header">
                <div>
                  <h2 className="panel-card-title">Seller product catalog</h2>
                  <p className="panel-card-subtitle">Live products available for customer sales</p>
                </div>
                <div className="toolbar">
                  <label className="search-wrap">
                    <SearchIcon size={15} />
                    <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search catalog" aria-label="Search product catalog" />
                  </label>
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
          </>
        )}

        {section === 'sales' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Broker sales</p>
                <h1 className="page-title">My customer sales.</h1>
                <p className="page-description">Review transactions recorded from this broker account.</p>
              </div>
              <Link className="btn-panel btn-panel-primary" href="/broker/catalog">Record another sale</Link>
            </section>

            <section className="panel-card">
              <header className="panel-card-header">
                <div>
                  <h2 className="panel-card-title">My recent customer sales</h2>
                  <p className="panel-card-subtitle">Transactions recorded from this broker account</p>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Customer</th><th>Quantity</th><th>Total</th><th>Date</th></tr></thead>
                  <tbody>
                    {sales.length ? sales.map((sale) => (
                      <tr key={sale.id}>
                        <td><span className="cell-title">{sale.productName}</span><br /><span className="cell-meta">{sale.seller}</span></td>
                        <td>{sale.customer}</td>
                        <td>{sale.quantity}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>{formatDate(sale.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={5} title="No sales recorded yet" text="Open the catalog to record your first sale." />}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </DashboardShell>
      <SaleModal product={saleProduct} onClose={() => setSaleProduct(null)} onSave={recordSale} />
      <ToastRegion toasts={store.toasts} />
    </>
  );
}
