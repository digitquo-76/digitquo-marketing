'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useDigitQuoStore } from '../../lib/store';
import { normalizeProductOptionGroups, optionGroupsEqual } from '../../lib/productOptions';
import { PRODUCT_DESCRIPTION_MAX_LENGTH, normalizeProductDescription } from '../../lib/productDescription';
import { mergeProductCategoryNames } from '../../lib/categories';
import { useProductCategories } from '../../lib/useProductCategories';
import type { Product, ProductOptionGroup } from '../../types';
import { getMonthlyTrend, getProductPerformance } from '../../lib/analytics';
import { formatCurrency, formatDate, isProfileComplete, routeForProfile } from '../../lib/utils';
import { DashboardShell } from './DashboardShell';
import { AnalyticsBarChart, AnalyticsRanking } from './Analytics';
import { EmptyRow, Metric, ProductCell, ProductImageCarousel, StockBadge } from './Shared';
import { PageSkeleton } from '../ui/PageSkeleton';
import { ToastRegion } from '../ui/ToastRegion';
import { BackIcon, ChartIcon, EditIcon, GridIcon, PackageIcon, SaleIcon, SearchIcon, TrashIcon, UsersIcon } from '../ui/icons';
import {
  createProductOptionGroupDrafts,
  parseProductOptionGroupDrafts,
  ProductOptionGroupsEditor,
  SelectedProductOptionsSummary,
  type ProductOptionGroupDraft
} from './ProductOptionGroupsEditor';

const ProductModal = dynamic(() => import('./Modals').then((module) => module.ProductModal), { ssr: false });

type SellerSection = 'overview' | 'products' | 'orders' | 'analytics' | 'product';
type ProductSaveValues = {
  name: string;
  category: string;
  mrp: number;
  commission: number;
  stock: number;
  image?: string;
  description: string;
  optionGroups?: ProductOptionGroup[];
  optionLabel?: string;
  optionValues?: string[];
};

export function SellerDashboardPage({ section, productId }: { section: SellerSection; productId?: string }) {
  const store = useDigitQuoStore({
    loadProducts: section === 'overview' || section === 'products' || section === 'product',
    loadSales: section === 'overview' || section === 'orders' || section === 'analytics' || section === 'product',
    productImages: section === 'products' ? 'all' : section === 'product' ? 'active' : 'none',
    productId
  });
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const categoryCatalog = useProductCategories({ enabled: Boolean(store.user) && (modalOpen || section === 'product') });

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

  if (store.loading || !store.user || store.profile?.role !== 'seller' || !isProfileComplete(store.profile)) return <PageSkeleton variant="dashboard" />;

  const currentSeller = store.currentSellerName;
  const myProducts = store.products.filter((product) => product.seller === currentSeller);
  const categoryOptions = mergeProductCategoryNames(
    categoryCatalog.categories.map((category) => category.name),
    myProducts.map((product) => product.category)
  );
  const myProductIds = new Set(myProducts.map((product) => product.id));
  const mySales = store.sales.filter((sale) => myProductIds.has(sale.productId) || sale.seller === currentSeller);
  const productCategories = Array.from(new Set(myProducts.map((product) => product.category))).sort();
  const visibleProducts = myProducts.filter((product) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in-stock' && product.stock > 10) ||
      (stockFilter === 'low-stock' && product.stock > 0 && product.stock <= 10) ||
      (stockFilter === 'out-of-stock' && product.stock <= 0);
    return matchesSearch && matchesCategory && matchesStock;
  });
  const lowStockCount = myProducts.filter((product) => product.stock > 0 && product.stock <= 10).length;
  const inventoryCount = myProducts.reduce((sum, product) => sum + product.stock, 0);
  const salesValue = mySales.reduce((sum, sale) => sum + sale.total, 0);
  const unitsSold = mySales.reduce((sum, sale) => sum + sale.quantity, 0);
  const averageOrderValue = mySales.length ? salesValue / mySales.length : 0;
  const latestOrders = mySales.slice(0, 5);
  const salesTrend = mySales.length ? getMonthlyTrend(mySales, (sale) => sale.total) : [];
  const topProducts = getProductPerformance(mySales)
    .sort((first, second) => second.orderValue - first.orderValue)
    .slice(0, 5)
    .map((product) => ({
      label: product.label,
      value: product.orderValue,
      detail: `${product.units} ${product.units === 1 ? 'unit' : 'units'} · ${product.orders} ${product.orders === 1 ? 'order' : 'orders'}`
    }));
  const activeProduct = productId ? myProducts.find((product) => product.id === productId) : null;
  const activeProductSales = activeProduct ? mySales.filter((sale) => sale.productId === activeProduct.id) : [];
  const activeProductOrderValue = activeProductSales.reduce((sum, sale) => sum + sale.total, 0);
  const activeProductUnitsSold = activeProductSales.reduce((sum, sale) => sum + sale.quantity, 0);

  const openAddProduct = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const updateExistingProduct = async (product: Product, values: ProductSaveValues) => {
    try {
      await store.updateProduct({
        ...product,
        ...values,
        mrp: Number(values.mrp),
        commission: Number(values.commission),
        stock: Number(values.stock),
        image: values.image ?? product.image,
        description: values.description || '',
        optionGroups: values.optionGroups || [],
        optionLabel: values.optionLabel || '',
        optionValues: values.optionValues || []
      });
      await store.addActivity('product', `${currentSeller} updated ${values.name}.`);
      store.showToast('Product updated successfully.', 'success');
      return true;
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not save product.', 'error');
      return false;
    }
  };

  const saveProduct = async (values: ProductSaveValues) => {
    if (editing) {
      await updateExistingProduct(editing, values);
      return;
    }

    try {
      await store.addProduct({
        name: values.name,
        category: values.category,
        mrp: Number(values.mrp),
        commission: Number(values.commission),
        stock: Number(values.stock),
        seller: currentSeller,
        image: values.image || '',
        description: values.description || '',
        optionGroups: values.optionGroups || [],
        optionLabel: values.optionLabel || '',
        optionValues: values.optionValues || []
      });
      store.showToast('Product is now available to brokers.', 'success');

      try {
        await store.addActivity('product', `${currentSeller} published ${values.name}.`);
      } catch {
        // The product is already saved; activity logging is secondary.
      }
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not save product.', 'error');
    }
  };

  const deleteProduct = async (product: Product, afterDeleteHref?: string) => {
    if (!window.confirm(`Remove "${product.name}" from your listings?`)) return;
    try {
      await store.deleteProduct(product.id);
      await store.addActivity('product', `${currentSeller} removed ${product.name}.`);
      store.showToast('Product removed.', 'success');
      if (afterDeleteHref) router.push(afterDeleteHref);
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
          ['/seller/analytics', 'Analytics', <ChartIcon size={18} key="analytics" />],
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
              <Metric icon={<ChartIcon size={18} />} value={lowStockCount} label="Low-stock products" />
              <Metric icon={<SaleIcon size={18} />} value={mySales.length} label="Orders placed" />
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Product workspace</h2>
                    <p className="dashboard-card-subtitle">Open the listings page to edit MRP, commission, stock, and visibility</p>
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
                    <h2 className="dashboard-card-title">Sales performance</h2>
                    <p className="dashboard-card-subtitle">Understand how your products are selling</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/seller/analytics">View analytics</Link>
                </header>
                <div className="dashboard-card-body">
                  <p className="page-description">
                    {mySales.length
                      ? `${formatCurrency(salesValue)} in order value from ${mySales.length} ${mySales.length === 1 ? 'order' : 'orders'}.`
                      : 'Sales trends and top-performing products will appear after your first order.'}
                  </p>
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
                  <select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter my products by category">
                    <option value="all">All categories</option>
                    {productCategories.map((categoryName) => <option value={categoryName} key={categoryName}>{categoryName}</option>)}
                  </select>
                  <select className="filter-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filter my products by stock status">
                    <option value="all">All stock</option>
                    <option value="in-stock">In stock</option>
                    <option value="low-stock">Low stock</option>
                    <option value="out-of-stock">Out of stock</option>
                  </select>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Category</th><th>MRP</th><th>Commission</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {visibleProducts.length ? visibleProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <Link className="table-product-link" href={`/seller/product/${product.id}`} aria-label={`Open ${product.name} details`}>
                            <ProductCell product={product} />
                          </Link>
                        </td>
                        <td>{product.category}</td>
                        <td>{formatCurrency(product.mrp)}</td>
                        <td>{formatCurrency(product.commission)}</td>
                        <td>{product.stock}</td>
                        <td><StockBadge stock={product.stock} /></td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-button" type="button" aria-label={`Edit ${product.name}`} onClick={() => { setEditing(product); setModalOpen(true); }}><EditIcon /></button>
                            <button className="icon-button delete" type="button" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product)}><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>
                    )) : <EmptyRow colSpan={7} title="No products found" text="Add your first product or adjust your search and filters." />}
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
                        <td>
                          <span className="cell-title">{order.productName}</span><br />
                          <span className="cell-meta">{order.id}</span><br />
                          <SelectedProductOptionsSummary selections={order.selectedOptions} legacyLabel={order.selectedOptionLabel} legacyValue={order.selectedOptionValue} />
                        </td>
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

        {section === 'analytics' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Sales analytics</p>
                <h1 className="page-title">See what is driving your sales.</h1>
                <p className="page-description">Review order value, units sold, and your best-performing products using data from this seller account.</p>
              </div>
            </section>

            <section className="metrics-grid" aria-label="Seller analytics summary">
              <Metric icon={<SaleIcon size={18} />} value={mySales.length} label="Total orders" />
              <Metric icon={<ChartIcon size={18} />} value={formatCurrency(salesValue)} label="Total order value" />
              <Metric icon={<PackageIcon size={18} />} value={unitsSold} label="Units sold" />
              <Metric icon={<GridIcon />} value={formatCurrency(averageOrderValue)} label="Average order value" />
            </section>

            <section className="analytics-layout">
              <article className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Order value trend</h2>
                    <p className="dashboard-card-subtitle">Monthly performance over the last six months</p>
                  </div>
                </header>
                <div className="dashboard-card-body">
                  <AnalyticsBarChart
                    points={salesTrend}
                    valueFormatter={formatCurrency}
                    ariaLabel="Seller order value by month for the last six months"
                    emptyTitle="No recent sales data"
                    emptyText="Completed orders will build your monthly sales trend here."
                  />
                </div>
              </article>

              <article className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Top products</h2>
                    <p className="dashboard-card-subtitle">Ranked by total order value</p>
                  </div>
                </header>
                <div className="dashboard-card-body">
                  <AnalyticsRanking
                    items={topProducts}
                    valueFormatter={formatCurrency}
                    emptyTitle="No product performance yet"
                    emptyText="Your top products will appear after brokers place orders."
                  />
                </div>
              </article>
            </section>
          </>
        )}

        {section === 'product' && (
          activeProduct ? (
            <>
              <section className="page-heading product-detail-heading">
                <Link className="btn-dashboard btn-dashboard-secondary" href="/seller/products"><BackIcon /> Back to products</Link>
                <div className="product-detail-actions">
                  <button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={() => { setEditing(activeProduct); setModalOpen(true); }}><EditIcon /> Edit product</button>
                  <button className="btn-dashboard btn-dashboard-danger" type="button" onClick={() => deleteProduct(activeProduct, '/seller/products')}><TrashIcon /> Delete</button>
                </div>
              </section>

              <div className="product-detail-layout">
                <div className="product-detail-gallery">
                  <ProductImageCarousel product={activeProduct} key={activeProduct.id} />
                </div>
                <div className="product-detail-info">
                  <SellerProductDetailForm
                    product={activeProduct}
                    categories={categoryOptions}
                    onSave={(values) => updateExistingProduct(activeProduct, values)}
                    onManagePhotos={() => { setEditing(activeProduct); setModalOpen(true); }}
                    showToast={store.showToast}
                  />
                </div>
              </div>

              <section className="metrics-grid seller-product-metrics" aria-label="Product sales summary">
                <Metric icon={<SaleIcon size={18} />} value={activeProductSales.length} label="Orders for this product" />
                <Metric icon={<GridIcon />} value={activeProductUnitsSold} label="Units sold" />
                <Metric icon={<ChartIcon size={18} />} value={formatCurrency(activeProductOrderValue)} label="Order value" />
                <Metric icon={<PackageIcon size={18} />} value={activeProduct.stock} label="Current stock" />
              </section>

              <section className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Recent orders</h2>
                    <p className="dashboard-card-subtitle">Orders placed by brokers for this product</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/seller/orders">View all orders</Link>
                </header>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Broker</th><th>Customer</th><th>Choices</th><th>Quantity</th><th>Total</th><th>Date</th></tr></thead>
                    <tbody>
                      {activeProductSales.length ? activeProductSales.slice(0, 6).map((order) => (
                        <tr key={order.id}>
                          <td>{order.broker}</td>
                          <td><span className="cell-title">{order.customer}</span><br /><span className="cell-meta">{order.customerPhone || 'No phone added'}</span></td>
                          <td><SelectedProductOptionsSummary selections={order.selectedOptions} legacyLabel={order.selectedOptionLabel} legacyValue={order.selectedOptionValue} /></td>
                          <td>{order.quantity}</td>
                          <td>{formatCurrency(order.total)}</td>
                          <td>{formatDate(order.createdAt)}</td>
                        </tr>
                      )) : <EmptyRow colSpan={6} title="No orders yet" text="Broker orders for this product will appear here." />}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="empty-state">
              <strong>Product not found</strong>
              <p>This product may have been removed or is not part of this seller account.</p>
              <Link className="btn-dashboard btn-dashboard-secondary" href="/seller/products" style={{ marginTop: '16px' }}>Back to products</Link>
            </div>
          )
        )}
      </DashboardShell>
      {modalOpen && <ProductModal open product={editing} categories={categoryOptions} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={saveProduct} showToast={store.showToast} />}
      <ToastRegion toasts={store.toasts} />
    </>
  );
}

function SellerProductDetailForm({
  product,
  categories,
  onSave,
  onManagePhotos,
  showToast
}: {
  product: Product;
  categories: string[];
  onSave: (values: ProductSaveValues) => Promise<boolean>;
  onManagePhotos: () => void;
  showToast: (message: string, type?: 'success' | 'error' | '') => void;
}) {
  const [values, setValues] = useState(() => productToDetailForm(product));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(productToDetailForm(product));
  }, [product]);

  const update = (key: keyof ReturnType<typeof productToDetailForm>, value: string | ProductOptionGroupDraft[]) => {
    setValues((current) => ({ ...current, [key]: value } as typeof current));
  };

  const parsedOptionGroups = parseProductOptionGroupDrafts(values.optionGroups);
  const originalOptionGroups = createProductOptionGroupDrafts(product.optionGroups, product.optionLabel, product.optionValues);
  const optionGroupsDirty = parsedOptionGroups.error
    ? JSON.stringify(values.optionGroups) !== JSON.stringify(originalOptionGroups)
    : !optionGroupsEqual(
        parsedOptionGroups.groups,
        normalizeProductOptionGroups(product.optionGroups, product.optionLabel, product.optionValues)
      );

  const isDirty =
    values.name !== product.name ||
    values.category !== product.category ||
    Number(values.mrp) !== Number(product.mrp) ||
    Number(values.commission) !== Number(product.commission) ||
    Number(values.stock) !== Number(product.stock) ||
    values.description !== (product.description || '') ||
    optionGroupsDirty;

  const reset = () => setValues(productToDetailForm(product));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedGroups = parseProductOptionGroupDrafts(values.optionGroups);
    if (parsedGroups.error) {
      showToast(parsedGroups.error, 'error');
      return;
    }
    const firstOptionGroup = parsedGroups.groups[0];

    const cleaned: ProductSaveValues = {
      name: values.name.trim(),
      category: values.category.trim(),
      mrp: Number(values.mrp),
      commission: Number(values.commission),
      stock: Number(values.stock),
      description: values.description.trim(),
      optionGroups: parsedGroups.groups,
      optionLabel: firstOptionGroup?.label || '',
      optionValues: firstOptionGroup?.values || []
    };

    if (!cleaned.name || !cleaned.category || cleaned.mrp <= 0 || cleaned.commission < 0 || cleaned.stock < 0) {
      showToast('Please complete all required product fields.', 'error');
      return;
    }
    if (cleaned.commission > cleaned.mrp) {
      showToast('Commission cannot be higher than MRP.', 'error');
      return;
    }
    setSaving(true);
    try {
      await onSave(cleaned);
    } finally {
      setSaving(false);
    }
  };

  const previewStock = Number(values.stock);
  const productInStock = Number.isFinite(previewStock) && previewStock > 0;

  return (
    <form className="seller-product-edit-form seller-product-detail-editor" onSubmit={submit}>
      <div className="product-detail-eyebrow seller-product-detail-editor-eyebrow">
        <label className="seller-product-category-select">
          <span className="form-label">Category *</span>
          <select className="form-control" value={values.category} onChange={(event) => update('category', event.target.value)} required>
            <option value="">Choose category</option>
            {mergeProductCategoryNames(categories, [product.category]).map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <span>Product ID {product.id.slice(-8).toUpperCase()}</span>
      </div>

      <label className="seller-product-title-editor">
        <span className="form-label">Product name *</span>
        <input className="seller-product-title-input" value={values.name} onChange={(event) => update('name', event.target.value)} required maxLength={80} />
      </label>
      <p className="product-detail-seller">Listed by <strong>{product.seller}</strong> on {formatDate(product.createdAt)}</p>

      <div className="product-detail-price-panel seller-product-price-editor">
        <label className="seller-product-money-field">
          <span>MRP (Rs)</span>
          <input value={values.mrp} onChange={(event) => update('mrp', event.target.value)} type="number" required min="1" step="1" aria-label="MRP in rupees" />
        </label>
        <label className="seller-product-money-field commission">
          <span>Broker commission (Rs)</span>
          <input value={values.commission} onChange={(event) => update('commission', event.target.value)} type="number" required min="0" step="1" aria-label="Broker commission in rupees" />
        </label>
      </div>

      <div className={`product-detail-stock ${productInStock ? 'available' : 'unavailable'} seller-product-stock-editor`}>
        <span className="product-detail-stock-dot" />
        <label>
          <span>{productInStock ? 'In stock' : 'Out of stock'}</span>
          <input value={values.stock} onChange={(event) => update('stock', event.target.value)} type="number" required min="0" step="1" aria-label="Available stock" />
          <p>{previewStock || 0} units available for broker orders</p>
        </label>
      </div>

      <label className="product-detail-description-block seller-product-description-editor">
        <span>Description</span>
        <textarea value={values.description} onChange={(event) => update('description', event.target.value)} maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH} rows={8} placeholder="Add useful product details for brokers" />
      </label>

      <ProductOptionGroupsEditor groups={values.optionGroups} onChange={(optionGroups) => update('optionGroups', optionGroups)} disabled={saving} />

      <div className="seller-product-edit-actions">
        <button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={onManagePhotos}><EditIcon /> Edit photos</button>
        <button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={reset} disabled={!isDirty || saving}>Reset</button>
        <button className="btn-dashboard btn-dashboard-primary" type="submit" disabled={!isDirty || saving}>{saving ? <><span className="button-spinner" aria-hidden="true" />Saving...</> : 'Save details'}</button>
      </div>
    </form>
  );
}

function productToDetailForm(product: Product) {
  return {
    name: product.name || '',
    category: product.category || '',
    mrp: String(product.mrp ?? ''),
    commission: String(product.commission ?? ''),
    stock: String(product.stock ?? ''),
    description: normalizeProductDescription(product.description),
    optionGroups: createProductOptionGroupDrafts(product.optionGroups, product.optionLabel, product.optionValues)
  };
}
