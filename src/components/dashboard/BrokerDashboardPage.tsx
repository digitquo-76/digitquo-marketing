'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDigitQuoStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import { formatCurrency, formatDate, isProfileComplete, routeForProfile } from '../../lib/utils';
import { DashboardShell } from './DashboardShell';
import { EmptyRow, Metric, ProductImage } from './Shared';
import { OrderModal } from './Modals';
import { ToastRegion } from '../ui/ToastRegion';
import { GridIcon, PackageIcon, SaleIcon, SearchIcon, UsersIcon, WalletIcon, StarIcon } from '../ui/icons';

type BrokerSection = 'overview' | 'catalog' | 'sales' | 'rewards' | 'product';

type RazorpayPaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

export function BrokerDashboardPage({ section, productId }: { section: BrokerSection; productId?: string }) {
  const store = useDigitQuoStore();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [isPaying, setIsPaying] = useState(false);

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
    if (store.profile.role !== 'broker') {
      router.replace(routeForProfile(store.profile));
    }
  }, [router, store.loading, store.profile, store.user]);

  if (store.loading || !store.user || store.profile?.role !== 'broker' || !isProfileComplete(store.profile)) return <div style={{ padding: '40px' }}>Loading workspace...</div>;

  const currentBroker = store.currentBrokerName;

  const available = store.products.filter((product) => product.stock > 0);
  const categories = Array.from(new Set(available.map((product) => product.category))).sort();
  const sales = store.sales.filter((sale) => sale.broker === currentBroker);
  const visible = available.filter((product) => {
    const matchesSearch = `${product.name} ${product.seller} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = category === 'all' || product.category === category;
    return matchesSearch && matchesCategory;
  });

  const brokerClaims = store.claims.filter((claim) => claim.broker === currentBroker);
  const totalPointsEarned = sales.reduce((sum, sale) => sum + (sale.points || 0), 0);
  const pointsClaimed = brokerClaims.reduce((sum, claim) => sum + claim.points, 0);
  const availablePoints = totalPointsEarned - pointsClaimed;

  const activeProduct = productId ? store.products.find((p) => p.id === productId) : null;
  const relatedProducts = activeProduct ? available.filter(p => p.id !== activeProduct.id && p.category === activeProduct.category).slice(0, 5) : [];
  if (relatedProducts.length < 5 && activeProduct) {
    relatedProducts.push(...available.filter(p => p.id !== activeProduct.id && !relatedProducts.includes(p)).slice(0, 5 - relatedProducts.length));
  }

  const mockReviews = [
    { id: 1, author: 'Jane D.', rating: 5, date: '2 days ago', content: 'Absolutely love this product! The quality is amazing and it arrived exactly as described. Highly recommended.' },
    { id: 2, author: 'Mark T.', rating: 4, date: '1 week ago', content: 'Very good overall. The packaging could be slightly better but the item itself is solid and works perfectly.' },
    { id: 3, author: 'Sarah W.', rating: 5, date: '2 weeks ago', content: 'Exceeded my expectations. Will definitely be buying more from this seller in the future!' }
  ];

  const placeOrder = async ({ productId, customer, customerPhone, customerAddress, orderNotes, quantity }: any) => {
    const product = store.products.find((p) => p.id === productId);
    if (!product || !customer || !customerPhone || !customerAddress || quantity < 1 || quantity > product.stock) {
      store.showToast('Enter customer details and a valid quantity.', 'error');
      return;
    }
    
    try {
      setIsPaying(true);
      const orderDetails = {
        productId: product.id,
        customer,
        customerPhone,
        customerAddress,
        orderNotes,
        quantity: Number(quantity)
      };
      const checkoutOrder = await createRazorpayOrder(product.id, Number(quantity));
      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error('Razorpay checkout could not be loaded.');
      }

      const payment = await new Promise<RazorpayPaymentResponse>((resolve, reject) => {
        const Razorpay = window.Razorpay;
        if (!Razorpay) {
          reject(new Error('Razorpay checkout could not be loaded.'));
          return;
        }
        const razorpay = new Razorpay({
          key: checkoutOrder.keyId,
          amount: checkoutOrder.amount,
          currency: checkoutOrder.currency,
          name: 'DigitQuo Store',
          description: `${product.name} x ${quantity}`,
          order_id: checkoutOrder.orderId,
          prefill: {
            name: customer,
            contact: customerPhone,
            email: store.profile?.email || undefined
          },
          notes: {
            product_id: product.id,
            customer
          },
          handler: resolve,
          modal: {
            ondismiss: () => reject(new Error('Payment was cancelled.'))
          }
        });
        razorpay.open();
      });

      const order = await store.completePaidOrder({ order: orderDetails, payment });

      try {
        await store.addActivity('sale', `${currentBroker} paid and placed an order for ${quantity} x ${product.name} for ${customer} (${formatCurrency(order.total)}).`);
      } catch {
        // The order is already saved; activity is secondary.
      }
      
      setOrderProduct(null);
      store.showToast(`Payment successful. Invoice sent to broker: ${formatCurrency(order.total)}. You earned ${order.points} pts.`, 'success');
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not complete payment.', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const claimPoints = async () => {
    if (availablePoints <= 0) return;
    try {
      await store.addClaim({ broker: currentBroker, points: availablePoints });
      store.showToast(`Claimed ${availablePoints} points. Payout will be processed within 24 hours.`, 'success');
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not create payout claim.', 'error');
    }
  };

  return (
    <>
      <DashboardShell
        label="Broker dashboard"
        nav={[
          ['/broker', 'Overview', <GridIcon key="grid" />],
          ['/broker/catalog', 'Product catalog', <SearchIcon size={18} key="search" />],
          ['/broker/sales', 'My orders', <SaleIcon key="sale" />],
          ['/broker/rewards', 'Rewards', <WalletIcon key="wallet" />],
          ['/profile', 'My profile', <UsersIcon size={18} key="profile" />]
        ]}
        user={{ initials: currentBroker.slice(0, 2).toUpperCase(), name: currentBroker, role: 'Broker account' }}
        title="Broker workspace"
        actions={(
          <div className="topbar-actions">
            <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={store.logout}>Sign out</button>
          </div>
        )}
      >
        {section === 'overview' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Broker overview</p>
                <h1 className="page-title">Find products. Place the order.</h1>
                <p className="page-description">Browse live inventory from every seller, choose the right products for your customers, and place orders with customer details.</p>
              </div>
              <Link className="btn-dashboard btn-dashboard-primary" href="/broker/catalog">Browse all products</Link>
            </section>

            <section className="metrics-grid" aria-label="Broker metrics">
              <Metric icon={<PackageIcon size={18} />} value={available.length} label="Products available" />
              <Metric icon={<SaleIcon size={18} />} value={formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0))} label="My order value" />
              <Metric icon={<WalletIcon size={18} />} value={availablePoints} label="Available points" />
              <Metric icon={<UsersIcon size={18} />} value={new Set(available.map((product) => product.seller)).size} label="Active sellers" />
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Catalog workspace</h2>
                    <p className="dashboard-card-subtitle">Search live inventory and place customer orders</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/broker/catalog">Open catalog</Link>
                </header>
                <div className="dashboard-card-body">
                  <p className="page-description">{available.length} products are currently available from {new Set(available.map((product) => product.seller)).size} sellers.</p>
                </div>
              </article>
              <aside className="dashboard-card">
                <header className="dashboard-card-header">
                  <div>
                    <h2 className="dashboard-card-title">Rewards workspace</h2>
                    <p className="dashboard-card-subtitle">Claim your earned points</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/broker/rewards">View rewards</Link>
                </header>
                <div className="dashboard-card-body">
                  <p className="page-description">You have {availablePoints} points ready to claim. Each point converts to real money within 24hrs.</p>
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
                <p className="page-description">Search available products, filter by category, and place an order from any catalog card.</p>
              </div>
            </section>

            <section className="dashboard-card">
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">Seller product catalog</h2>
                  <p className="dashboard-card-subtitle">Live products available for customer orders</p>
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
              <div className="dashboard-card-body">
                <div className="catalog-grid">
                  {visible.length ? visible.map((product) => (
                    <article className="catalog-card" key={product.id}>
                      <Link href={`/broker/product/${product.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                        <div className="catalog-visual"><ProductImage product={product} /></div>
                      </Link>
                      <div className="catalog-body">
                        <p className="catalog-seller">{product.seller}</p>
                        <Link href={`/broker/product/${product.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                          <h3 className="catalog-name">{product.name}</h3>
                        </Link>
                        <div className="catalog-meta">
                          <span className="catalog-price-stack">
                            {(product.mrp ?? product.price) > product.price && <span className="catalog-mrp">{formatCurrency(product.mrp ?? product.price)}</span>}
                            <span className="catalog-price">{formatCurrency(product.price)}</span>
                          </span>
                          <span className="catalog-stock">{product.stock} available</span>
                        </div>
                        <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={() => setOrderProduct(product)}>Place order</button>
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
                <p className="eyebrow">Broker orders</p>
                <h1 className="page-title">My customer orders.</h1>
                <p className="page-description">Review orders placed from this broker account.</p>
              </div>
              <Link className="btn-dashboard btn-dashboard-primary" href="/broker/catalog">Place another order</Link>
            </section>

            <section className="dashboard-card">
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">My recent customer orders</h2>
                  <p className="dashboard-card-subtitle">Orders placed from this broker account</p>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Customer</th><th>Phone</th><th>Address</th><th>Quantity</th><th>Total</th><th>Points</th><th>Date</th></tr></thead>
                  <tbody>
                    {sales.length ? sales.map((sale) => (
                      <tr key={sale.id}>
                        <td><span className="cell-title">{sale.productName}</span><br /><span className="cell-meta">{sale.seller}</span></td>
                        <td>{sale.customer}</td>
                        <td>{sale.customerPhone || 'Not added'}</td>
                        <td>{sale.customerAddress || 'Not added'}</td>
                        <td>{sale.quantity}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>+{sale.points}</td>
                        <td>{formatDate(sale.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={8} title="No orders placed yet" text="Open the catalog to place your first order." />}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {section === 'rewards' && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">Rewards</p>
                <h1 className="page-title">Claim your commission.</h1>
                <p className="page-description">Redeem the points you've earned from broker orders. Payouts are processed in real money within 24 hours.</p>
              </div>
              {availablePoints > 0 && <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={claimPoints}>Claim {availablePoints} pts for cash</button>}
            </section>

            <section className="metrics-grid">
              <Metric icon={<WalletIcon size={18} />} value={availablePoints} label="Available points" />
              <Metric icon={<SaleIcon size={18} />} value={totalPointsEarned} label="Total earned points" />
            </section>

            <section className="dashboard-card" style={{ marginTop: '2rem' }}>
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">Claim history</h2>
                  <p className="dashboard-card-subtitle">Past payouts requested</p>
                </div>
              </header>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Claim ID</th><th>Points Redeemed</th><th>Status</th><th>Date Requested</th></tr></thead>
                  <tbody>
                    {brokerClaims.length ? brokerClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td><span className="cell-title">{claim.id}</span></td>
                        <td>{claim.points} pts</td>
                        <td>
                          {claim.status === 'paid' ? 
                            <span className="badge badge-success" style={{background: '#e8fbf3', color: '#087a55', padding: '4px 8px', borderRadius: '12px'}}>Paid out</span> : 
                            <span className="badge badge-warning" style={{background: '#fff4df', color: '#a75a03', padding: '4px 8px', borderRadius: '12px'}}>Pending (24h)</span>}
                        </td>
                        <td>{formatDate(claim.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={4} title="No claims requested" text="Place orders to earn points and claim rewards." />}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {section === 'product' && (
          activeProduct ? (
            <>
              <section className="page-heading" style={{ marginBottom: '20px' }}>
                <Link className="btn-dashboard btn-dashboard-secondary" href="/broker/catalog">← Back to Catalog</Link>
              </section>

              <div className="product-detail-layout">
                <div className="product-detail-image-wrap">
                  {activeProduct.image ? <img src={activeProduct.image} alt={activeProduct.name} /> : <div className="catalog-visual">No Image</div>}
                </div>
                <div className="product-detail-info">
                  <p className="catalog-seller">{activeProduct.seller}</p>
                  <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: '10px' }}>{activeProduct.name}</h1>
                  
                  <div className="product-rating" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', color: '#f59e0b' }}>
                      <StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon />
                    </div>
                    <span style={{ color: '#70657e', fontSize: '0.85rem' }}>4.8 out of 5 (124 ratings)</span>
                  </div>

                  <div className="catalog-meta" style={{ padding: '16px 0', borderTop: '1px solid #e8e1f1', borderBottom: '1px solid #e8e1f1', marginBottom: '20px' }}>
                    <div className="catalog-price-stack">
                      <span className="catalog-price" style={{ fontSize: '1.8rem', color: '#dc2626' }}>{formatCurrency(activeProduct.price)}</span>
                      {(activeProduct.mrp ?? activeProduct.price) > activeProduct.price && <span className="catalog-mrp" style={{ fontSize: '0.9rem' }}>M.R.P: {formatCurrency(activeProduct.mrp ?? activeProduct.price)}</span>}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ color: '#0f9f6e', fontWeight: 600, fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>In Stock</span>
                    <span style={{ color: '#70657e', fontSize: '0.9rem' }}>{activeProduct.stock} units available. Ships from {activeProduct.seller}.</span>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>About this item</h3>
                    <p className="page-description" style={{ margin: 0, fontSize: '0.95rem' }}>{activeProduct.description || 'Premium quality product available for immediate dispatch. Comes with standard manufacturer warranty where applicable.'}</p>
                  </div>

                  <button className="btn-dashboard btn-dashboard-primary" type="button" style={{ width: '100%', maxWidth: '300px', height: '48px', fontSize: '1rem' }} onClick={() => setOrderProduct(activeProduct)}>Place order</button>
                </div>
              </div>

              <section className="dashboard-card product-reviews" style={{ marginTop: '30px', padding: '24px' }}>
                <h2 className="dashboard-card-title" style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Customer Reviews</h2>
                <div className="reviews-list">
                  {mockReviews.map((review) => (
                    <div className="review-item" key={review.id} style={{ borderBottom: '1px solid #e8e1f1', paddingBottom: '20px', marginBottom: '20px' }}>
                      <div className="review-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#f4efff', borderRadius: '50%', color: '#6d28d9', fontWeight: 'bold' }}>
                          {review.author.charAt(0)}
                        </div>
                        <div>
                          <span className="review-author" style={{ fontWeight: 600, display: 'block', fontSize: '0.9rem' }}>{review.author}</span>
                        </div>
                      </div>
                      <div className="review-rating" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex' }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ color: i < review.rating ? '#f59e0b' : '#e5e7eb', width: '16px', display: 'inline-block' }}><StarIcon /></span>
                          ))}
                        </div>
                        <span className="review-date" style={{ color: '#70657e', fontSize: '0.8rem' }}>Reviewed on {review.date}</span>
                      </div>
                      <p className="review-content" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{review.content}</p>
                    </div>
                  ))}
                </div>
              </section>

              {relatedProducts.length > 0 && (
                <section className="related-products" style={{ marginTop: '40px', marginBottom: '40px' }}>
                  <h2 className="dashboard-card-title" style={{ fontSize: '1.3rem', marginBottom: '16px' }}>More products to explore</h2>
                  <div className="related-products-row" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    {relatedProducts.map((product) => (
                      <article className="catalog-card" key={product.id} style={{ minWidth: '220px', flex: '0 0 auto' }}>
                        <Link href={`/broker/product/${product.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                          <div className="catalog-visual" style={{ height: '180px' }}><ProductImage product={product} /></div>
                        </Link>
                        <div className="catalog-body">
                          <Link href={`/broker/product/${product.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                            <h3 className="catalog-name" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h3>
                          </Link>
                          <div className="catalog-meta" style={{ margin: '8px 0' }}>
                            <span className="catalog-price">{formatCurrency(product.price)}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="empty-state">
              <strong>Product not found</strong>
              <p>This product may have been removed.</p>
              <Link className="btn-dashboard btn-dashboard-secondary" href="/broker/catalog" style={{ marginTop: '16px' }}>Back to catalog</Link>
            </div>
          )
        )}
      </DashboardShell>
      <OrderModal product={orderProduct} onClose={() => setOrderProduct(null)} onSave={placeOrder} submitting={isPaying} />
      <ToastRegion toasts={store.toasts} />
    </>
  );
}

async function createRazorpayOrder(productId: string, quantity: number) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('You need to be signed in before payment.');
  }

  const response = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ productId, quantity })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'Could not start Razorpay payment.');
  }

  return data as { keyId: string; orderId: string; amount: number; currency: string; productName: string };
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay checkout.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'));
    document.body.appendChild(script);
  });
}
