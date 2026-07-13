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
import { GridIcon, PackageIcon, SaleIcon, SearchIcon, UsersIcon, WalletIcon } from '../ui/icons';

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
  const payoutDetails = getPayoutDetails(store.profile);
  const hasPayoutDetails = Boolean(payoutDetails.accountName && (payoutDetails.upi || (payoutDetails.bankName && payoutDetails.accountNumber && payoutDetails.ifsc)));

  const activeProduct = productId ? store.products.find((p) => p.id === productId) : null;
  const activeProductInStock = Boolean(activeProduct && activeProduct.stock > 0);
  const relatedProducts = activeProduct ? available.filter(p => p.id !== activeProduct.id && p.category === activeProduct.category).slice(0, 5) : [];
  if (relatedProducts.length < 5 && activeProduct) {
    relatedProducts.push(...available.filter(p => p.id !== activeProduct.id && !relatedProducts.includes(p)).slice(0, 5 - relatedProducts.length));
  }

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
      store.showToast(`Payment successful. Invoice sent to broker: ${formatCurrency(order.total)}. You earned ${formatCurrency(order.points)} commission.`, 'success');
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not complete payment.', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const claimPoints = async () => {
    if (availablePoints <= 0) return;
    if (!hasPayoutDetails) {
      store.showToast('Add payout account details in your profile before claiming commission.', 'error');
      router.push('/profile');
      return;
    }

    try {
      const claim = await store.addClaim({
        broker: currentBroker,
        points: availablePoints,
        payoutAccountName: payoutDetails.accountName,
        payoutBankName: payoutDetails.bankName,
        payoutAccountNumber: payoutDetails.accountNumber,
        payoutIfsc: payoutDetails.ifsc,
        payoutUpi: payoutDetails.upi
      });
      try {
        await store.addActivity('sale', `${currentBroker} requested payout of ${formatCurrency(availablePoints)} commission. Check the Claims & Payouts page for account details.`);
      } catch {
        // The claim is saved; activity is only an admin-facing notification.
      }
      let adminEmailFailed = true;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          const response = await fetch('/api/claims/notify-admin', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ claimId: claim.id })
          });
          const result = await response.json().catch(() => null);
          adminEmailFailed = !response.ok || result?.sent !== true;
        }
      } catch {
        // The claim is saved; email delivery is handled separately.
      }
      if (adminEmailFailed) {
        store.showToast('Email failed. Contact support team.', 'error');
      } else {
        store.showToast(`Claimed ${formatCurrency(availablePoints)} commission. You will receive payment within 24 hrs.`, 'success');
      }
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
              <Metric icon={<WalletIcon size={18} />} value={formatCurrency(availablePoints)} label="Available commission" />
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
                    <p className="dashboard-card-subtitle">Claim your earned commission</p>
                  </div>
                  <Link className="btn-dashboard btn-dashboard-secondary" href="/broker/rewards">View rewards</Link>
                </header>
                <div className="dashboard-card-body">
                  <p className="page-description">You have {formatCurrency(availablePoints)} commission ready to claim.</p>
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
                            <span className="catalog-price">{formatCurrency(product.mrp)}</span>
                            <span className="catalog-commission">Earn {formatCurrency(product.commission)}</span>
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
                  <thead><tr><th>Product</th><th>Customer</th><th>Phone</th><th>Address</th><th>Quantity</th><th>Total</th><th>Commission</th><th>Date</th></tr></thead>
                  <tbody>
                    {sales.length ? sales.map((sale) => (
                      <tr key={sale.id}>
                        <td><span className="cell-title">{sale.productName}</span><br /><span className="cell-meta">{sale.seller}</span></td>
                        <td>{sale.customer}</td>
                        <td>{sale.customerPhone || 'Not added'}</td>
                        <td>{sale.customerAddress || 'Not added'}</td>
                        <td>{sale.quantity}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>+{formatCurrency(sale.points)}</td>
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
                <p className="page-description">Redeem the commission you've earned from broker orders. Payouts are processed in real money within 24 hours.</p>
              </div>
              {availablePoints > 0 && <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={claimPoints}>Claim {formatCurrency(availablePoints)} commission</button>}
            </section>

            <section className="metrics-grid">
              <Metric icon={<WalletIcon size={18} />} value={formatCurrency(availablePoints)} label="Available commission" />
              <Metric icon={<SaleIcon size={18} />} value={formatCurrency(totalPointsEarned)} label="Total earned commission" />
            </section>

            <section className="dashboard-card" style={{ marginTop: '2rem' }}>
              <header className="dashboard-card-header">
                <div>
                  <h2 className="dashboard-card-title">Payout account</h2>
                  <p className="dashboard-card-subtitle">Used by admin for manual transfers after claims</p>
                </div>
                <Link className="btn-dashboard btn-dashboard-secondary" href="/profile">Edit details</Link>
              </header>
              <div className="dashboard-card-body">
                {hasPayoutDetails ? (
                  <div className="payout-detail-grid">
                    <DetailItem label="Account holder" value={payoutDetails.accountName} />
                    <DetailItem label="UPI ID" value={payoutDetails.upi || 'Not added'} />
                    <DetailItem label="Bank name" value={payoutDetails.bankName || 'Not added'} />
                    <DetailItem label="Account number" value={payoutDetails.accountNumber || 'Not added'} />
                    <DetailItem label="IFSC" value={payoutDetails.ifsc || 'Not added'} />
                  </div>
                ) : (
                  <p className="page-description">Add account holder name and either UPI ID or bank details before claiming commission.</p>
                )}
              </div>
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
                  <thead><tr><th>Claim ID</th><th>Commission Redeemed</th><th>Status</th><th>Date Requested</th></tr></thead>
                  <tbody>
                    {brokerClaims.length ? brokerClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td><span className="cell-title">{claim.id}</span></td>
                        <td>{formatCurrency(claim.points)}</td>
                        <td>
                          {claim.status === 'paid' ? 
                            <span className="badge badge-success" style={{background: '#e8fbf3', color: '#087a55', padding: '4px 8px', borderRadius: '12px'}}>Paid out</span> : 
                            <span className="badge badge-warning" style={{background: '#fff4df', color: '#a75a03', padding: '4px 8px', borderRadius: '12px'}}>Pending (24h)</span>}
                        </td>
                        <td>{formatDate(claim.createdAt)}</td>
                      </tr>
                    )) : <EmptyRow colSpan={4} title="No claims requested" text="Place orders to earn commission and claim payouts." />}
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
                <Link className="btn-dashboard btn-dashboard-secondary" href="/broker/catalog">Back to catalog</Link>
              </section>

              <div className="product-detail-layout">
                <div className="product-detail-image-wrap">
                  <ProductImage product={activeProduct} />
                </div>
                <div className="product-detail-info">
                  <p className="catalog-seller">{activeProduct.seller}</p>
                  <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: '10px' }}>{activeProduct.name}</h1>

                  <div className="catalog-meta" style={{ padding: '16px 0', borderTop: '1px solid #e8e1f1', borderBottom: '1px solid #e8e1f1', marginBottom: '20px' }}>
                    <div className="catalog-price-stack">
                      <span className="catalog-price" style={{ fontSize: '1.8rem', color: '#dc2626' }}>{formatCurrency(activeProduct.mrp)}</span>
                      <span className="catalog-commission" style={{ fontSize: '0.9rem' }}>Commission: {formatCurrency(activeProduct.commission)} per unit</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ color: activeProductInStock ? '#0f9f6e' : '#dc2626', fontWeight: 600, fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>{activeProductInStock ? 'In stock' : 'Out of stock'}</span>
                    <span style={{ color: '#70657e', fontSize: '0.9rem' }}>{activeProduct.stock} units available. Ships from {activeProduct.seller}.</span>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>About this item</h3>
                    <p className="page-description" style={{ margin: 0, fontSize: '0.95rem' }}>{activeProduct.description || 'No description has been added by the seller yet.'}</p>
                  </div>

                  <button className="btn-dashboard btn-dashboard-primary" type="button" style={{ width: '100%', maxWidth: '300px', height: '48px', fontSize: '1rem' }} onClick={() => setOrderProduct(activeProduct)} disabled={!activeProductInStock}>{activeProductInStock ? 'Place order' : 'Unavailable'}</button>
                </div>
              </div>

              <section className="dashboard-card product-reviews" style={{ marginTop: '30px', padding: '24px' }}>
                <h2 className="dashboard-card-title" style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Order checklist</h2>
                <div className="order-checklist">
                  <div><strong>Confirm customer details</strong><p>Review the customer name, phone number, and delivery address before payment.</p></div>
                  <div><strong>Check quantity</strong><p>Make sure the requested quantity fits available stock and customer demand.</p></div>
                  <div><strong>Add useful notes</strong><p>Include size, color, timing, or packing instructions for the seller when needed.</p></div>
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
                            <span className="catalog-price">{formatCurrency(product.mrp)}</span>
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="payout-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getPayoutDetails(profile: any) {
  return {
    accountName: String(profile?.payout_account_name || '').trim(),
    bankName: String(profile?.payout_bank_name || '').trim(),
    accountNumber: String(profile?.payout_account_number || '').trim(),
    ifsc: String(profile?.payout_ifsc || '').trim().toUpperCase(),
    upi: String(profile?.payout_upi || '').trim()
  };
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
