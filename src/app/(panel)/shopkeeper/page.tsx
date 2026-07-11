'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDigitQuoStore, CURRENT_SHOPKEEPER, createProduct } from '../../../lib/store';
import { DashboardShell } from '../../../components/panel/DashboardShell';
import { Metric, ActivityList, ProductCell, StockBadge, EmptyRow } from '../../../components/panel/Shared';
import { ProductModal } from '../../../components/panel/Modals';
import { ToastRegion } from '../../../components/ui/ToastRegion';
import { formatCurrency } from '../../../lib/utils';
import { GridIcon, PackageIcon, ActivityIcon, SearchIcon, EditIcon, TrashIcon } from '../../../components/ui/icons';

export default function ShopkeeperPage() {
  const store = useDigitQuoStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const myProducts = store.products.filter((product) => product.seller === CURRENT_SHOPKEEPER);
  const myProductIds = new Set(myProducts.map((product) => product.id));
  const mySales = store.sales.filter((sale) => myProductIds.has(sale.productId) || sale.seller === CURRENT_SHOPKEEPER);
  const visibleProducts = myProducts.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  const activity = store.activity.filter((item) => item.message.includes(CURRENT_SHOPKEEPER) || item.type === 'sale').slice(0, 6);

  const openAddProduct = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const saveProduct = (values: any) => {
    if (editing) {
      store.setProducts(store.products.map((product) => (
        product.id === editing.id && product.seller === CURRENT_SHOPKEEPER ? { ...product, ...values } : product
      )));
      store.addActivity('product', `${CURRENT_SHOPKEEPER} updated ${values.name}.`);
      store.showToast('Product updated successfully.', 'success');
    } else {
      store.setProducts([createProduct(values.name, values.category, values.price, values.stock, CURRENT_SHOPKEEPER, values.image, values.description), ...store.products]);
      store.addActivity('product', `${CURRENT_SHOPKEEPER} published ${values.name}.`);
      store.showToast('Product is now available to brokers.', 'success');
    }
    setModalOpen(false);
    setEditing(null);
  };

  const deleteProduct = (product: any) => {
    if (!window.confirm(`Remove "${product.name}" from your listings?`)) return;
    store.setProducts(store.products.filter((item) => item.id !== product.id));
    store.addActivity('product', `${CURRENT_SHOPKEEPER} removed ${product.name}.`);
    store.showToast('Product removed.', 'success');
  };

  return (
    <>
      <DashboardShell
        label="Seller panel"
        nav={[
          ['#overview', 'Overview', <GridIcon key="grid" />],
          ['#products', 'My products', <PackageIcon key="package" />],
          ['#activity', 'Activity', <ActivityIcon key="activity" />],
          ['/broker', 'View broker panel', <SearchIcon size={18} key="search" />]
        ]}
        user={{ initials: 'MS', name: 'My Store', role: 'Seller account' }}
        title="Seller workspace"
        actions={(
          <div className="topbar-actions">
            <Link className="btn-panel btn-panel-secondary" href="/">View website</Link>
            <button className="btn-panel btn-panel-primary" type="button" onClick={openAddProduct}>+ Add product</button>
          </div>
        )}
      >
        <section className="page-heading" id="overview">
          <div>
            <p className="eyebrow">Store overview</p>
            <h1 className="page-title">Manage what you sell.</h1>
            <p className="page-description">Publish products for brokers to discover, keep stock accurate, and follow every sale from one workspace.</p>
          </div>
          <button className="btn-panel btn-panel-primary" type="button" onClick={openAddProduct}>+ Add new product</button>
        </section>

        <section className="metrics-grid" aria-label="Store metrics">
          <Metric icon="▦" value={myProducts.length} label="Published products" />
          <Metric icon="◫" value={myProducts.reduce((sum, product) => sum + product.stock, 0)} label="Units in inventory" />
          <Metric icon="!" value={myProducts.filter((product) => product.stock > 0 && product.stock <= 10).length} label="Low-stock products" />
          <Metric icon="₹" value={formatCurrency(mySales.reduce((sum, sale) => sum + sale.total, 0))} label="Sales value generated" />
        </section>

        <section className="dashboard-grid">
          <article className="panel-card" id="products">
            <header className="panel-card-header">
              <div><h2 className="panel-card-title">My product listings</h2><p className="panel-card-subtitle">Products visible to the broker network</p></div>
              <div className="toolbar">
                <label className="search-wrap">
                  <SearchIcon size={15} />
                  <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search products" aria-label="Search my products" />
                </label>
              </div>
            </header>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {visibleProducts.length ? visibleProducts.map((product) => (
                    <tr key={product.id}>
                      <td><ProductCell product={product} /></td>
                      <td>{product.category}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.stock}</td>
                      <td><StockBadge stock={product.stock} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="icon-button" type="button" aria-label={`Edit ${product.name}`} onClick={() => { setEditing(product); setModalOpen(true); }}><EditIcon /></button>
                          <button className="icon-button delete" type="button" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product)}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={6} title="No products found" text="Add your first product or adjust your search." />}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="panel-card" id="activity">
            <header className="panel-card-header"><div><h2 className="panel-card-title">Recent activity</h2><p className="panel-card-subtitle">Updates affecting your store</p></div></header>
            <div className="panel-card-body"><ActivityList items={activity} /></div>
          </aside>
        </section>
      </DashboardShell>
      <ProductModal open={modalOpen} product={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={saveProduct} showToast={store.showToast} />
      <ToastRegion toasts={store.toasts} />
    </>
  );
}
