'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDigitQuoStore } from '../../lib/store';
import { Product } from '../../types';
import { formatCurrency, formatDate, isProfileComplete, routeForProfile } from '../../lib/utils';
import { DashboardShell } from './DashboardShell';
import { ActivityList, EmptyRow, Metric, ProductCell, StockBadge } from './Shared';
import { ProductModal } from './Modals';
import { ToastRegion } from '../ui/ToastRegion';
import { ActivityIcon, EditIcon, GridIcon, PackageIcon, SaleIcon, SearchIcon, TrashIcon, UsersIcon } from '../ui/icons';

type SellerSection = 'overview' | 'products' | 'orders' | 'activity';

export function SellerDashboardPage({ section }: { section: SellerSection }) {
  const store = useDigitQuoStore();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

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
    if (store.profile.role !== 'seller') {
      router.replace(routeForProfile(store.profile));
    }
  }, [router, store.loading, store.profile, store.user]);

  if (store.loading || !store.user || store.profile?.role !== 'seller' || !isProfileComplete(store.profile)) return <div style={{ padding: '40px' }}>Loading workspace...</div>;

  const currentSeller = store.currentSellerName;
  const myProducts = store.products.filter((product) => product.seller === currentSeller);
  const myProductIds = new Set(myProducts.map((product) => product.id));
  const mySales = store.sales.filter((sale) => myProductIds.has(sale.productId) || sale.seller === currentSeller);
  const visibleProducts = myProducts.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  const activity = store.activity.filter((item) => item.message.includes(currentSeller) || item.type === 'sale').slice(0, 12);
  const lowStockCount = myProducts.filter((product) => product.stock > 0 && product.stock <= 10).length;
  const inventoryCount = myProducts.reduce((sum, product) => sum + product.stock, 0);
  const salesValue = mySales.reduce((sum, sale) => sum + sale.total, 0);
  const latestOrders = mySales.slice(0, 5);

  const openAddProduct = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const saveProduct = async (values: any) => {
    try {
      if (editing) {
        await store.updateProduct({ ...editing, ...values });
        await store.addActivity('product', `${currentSeller} updated ${values.name}.`);
        store.showToast('Product updated successfully.', 'success');
      } else {
        await store.addProduct({
          name: values.name,
          category: values.category,
          price: Number(values.price),
          mrp: Number(values.mrp) || Number(values.price),
          stock: Number(values.stock),
          seller: currentSeller,
          image: values.image || '',
          description: values.description || ''
        });
        await store.addActivity('product', `${currentSeller} published ${values.name}.`);
        store.showToast('Product is now available to brokers.', 'success');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not save product.', 'error');
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Remove "${product.name}" from your listings?`)) return;
    try {
      await store.deleteProduct(product.id);
      await store.addActivity('product', `${currentSeller} removed ${product.name}.`);
      store.showToast('Product removed.', 'success');
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not remove product.', 'error');
    }
  };

  return (
    <>
      <DashboardShell
        label="Seller dashboard"
        nav={[
          ['/seller', 'Overview', <GridIcon key="grid" />],
          ['/seller/products', 'My products', <PackageIcon key="package" />],
          ['/seller/orders', 'Orders', <SaleIcon key="orders" />],
          ['/seller/activity', 'Activity', <ActivityIcon key="activity" />],
          ['/profile', 'My profile', <UsersIcon size={18} key="profile" />]
        ]}
        user={{ initials: currentSeller.slice(0,2).toUpperCase(), name: currentSeller, role: 'Seller account' }}
        title="Seller workspace"
        actions={(
          <div className="topbar-actions">
            <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={store.logout} style={{ marginRight: '10px' }}>Sign out</button>
            <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={openAddProduct}>+ Add product</button>
          </div>
        )}
      >
        {section === 'overview' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Store overview</p>
                <h1 className="page-title">Manage what you sell.</h1>
                <p className="page-description">Publish products for brokers to discover, keep stock accurate, and follow every order from one workspace.</p>
              </div>
              <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={openAddProduct}>+ Add new product</button>
            </section>

            <section className="metrics-grid" aria-label="Store metrics">
              <Metric icon={<PackageIcon size={18} />} value={myProducts.length} label="Published products" />
              <Metric icon={<GridIcon />} value={inventoryCount} label="Units in inventory" />
              <Metric icon={<ActivityIcon size={18} />} value={lowStockCount} label="Low-stock products" />
              <Metric icon={<SaleIcon size={18} />} value={mySales.length} label="Orders placed" />
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Product workspace</h2>
                    <p className="dashboard-card-subtitle">Open the listings page to edit prices, stock, and visibility</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/seller/products">View products</Link>
                </header>
                <div className="dashboard-card-body">
                  <p className="page-description">You have {myProducts.length} live listings and {lowStockCount} low-stock products.</p>
                </div>
              </article>
              <aside className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Recent movement</h2>
                    <p className="dashboard-card-subtitle">Latest product and order updates</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/seller/activity">View activity</Link>
                </header>
                <div className="dashboard-card-body">
                  <ActivityList items={activity.slice(0, 4)} />
                </div>
              </aside>
              <article className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Latest orders</h2>
                    <p className="dashboard-card-subtitle">Customer details sent by brokers</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/seller/orders">View orders</Link>
                </header>
                <div className="dashboard-card-body">
                  {latestOrders.length ? (
                    <div className="mini-list">
                      {latestOrders.map((order) => (
                        <div className="mini-row" key={order.id}>
                          <span><strong>{order.productName}</strong><br />{order.customer}</span>
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="page-description">Orders placed by brokers will appear here.</p>
                  )}
                </div>
              </article>
            </section>
          </>
        )}

        {section === 'products' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Product listings</p>
                <h1 className="page-title">My products.</h1>
                <p className="page-description">Edit the catalog brokers see, update stock, and remove listings that are no longer available.</p>
              </div>
              <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={openAddProduct}>+ Add product</button>
            </section>

            <section className="dashboard-card">
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">My product listings</h2>
                  <p className="dashboard-card-subtitle">Products visible to the broker network</p>
                </div>
                <div className="toolbar">
                  <label className="search-wrap">
                    <SearchIcon size={15} />
                    <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search products" aria-label="Search my products" />
                  </label>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Category</th><th>MRP</th><th>Selling price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {visibleProducts.length ? visibleProducts.map((product) => (
                      <tr key={product.id}>
                        <td><ProductCell product={product} /></td>
                        <td>{product.category}</td>
                        <td>{formatCurrency(product.mrp ?? product.price)}</td>
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
                    )) : <EmptyRow colSpan={7} title="No products found" text="Add your first product or adjust your search." />}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {section === 'orders' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Customer orders</p>
                <h1 className="page-title">Orders from brokers.</h1>
                <p className="page-description">See each placed order with the customer details the broker collected.</p>
              </div>
            </section>

            <section className="metrics-grid" aria-label="Order metrics">
              <Metric icon={<SaleIcon size={18} />} value={mySales.length} label="Total orders" />
              <Metric icon={<GridIcon />} value={formatCurrency(salesValue)} label="Order value" />
            </section>

            <section className="dashboard-card" style={{ marginTop: '2rem' }}>
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">Placed orders</h2>
                  <p className="dashboard-card-subtitle">Customer details visible to this seller account</p>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Broker</th><th>Customer</th><th>Phone</th><th>Address</th><th>Notes</th><th>Quantity</th><th>Total</th><th>Date</th></tr></thead>
                  <tbody>
                    {mySales.length ? mySales.map((order) => (
                      <tr key={order.id}>
                        <td><span className="cell-title">{order.productName}</span><br /><span className="cell-meta">{order.id}</span></td>
                        <td>{order.broker}</td>
                        <td>{order.customer}</td>
                        <td>{order.customerPhone || 'Not added'}</td>
                        <td>{order.customerAddress || 'Not added'}</td>
                        <td>{order.orderNotes || 'None'}</td>
                        <td>{order.quantity}</td>
                        <td>{formatCurrency(order.total)}</td>
                        <td>{formatDate(order.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={9} title="No orders yet" text="Orders placed by brokers for your products will appear here." />}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {section === 'activity' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Store activity</p>
                <h1 className="page-title">Follow every update.</h1>
                <p className="page-description">Track product changes, broker orders, and the actions affecting your store.</p>
              </div>
            </section>

            <section className="dashboard-card">
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">Recent activity</h2>
                  <p className="dashboard-card-subtitle">Updates affecting your store</p>
                </div>
              </header>
              <div className="dashboard-card-body"><ActivityList items={activity} /></div>
            </section>
          </>
        )}
      </DashboardShell>
      <ProductModal open={modalOpen} product={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={saveProduct} showToast={store.showToast} />
      <ToastRegion toasts={store.toasts} />
    </>
  );
}
