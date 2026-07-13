'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDigitQuoStore } from '../../lib/store';
import { isProfileComplete, routeForProfile, routeForRole } from '../../lib/utils';
import { DashboardShell } from './DashboardShell';
import { ToastRegion } from '../ui/ToastRegion';
import { ActivityIcon, BackIcon, GridIcon, PackageIcon, SaleIcon, UsersIcon, WalletIcon } from '../ui/icons';

function navForRole(role: string): [string, string, ReactNode][] {
  if (role === 'admin') {
    return [
      ['/admin', 'Overview', <GridIcon key="grid" />],
      ['/admin/products', 'All products', <PackageIcon key="package" />],
      ['/admin/transactions', 'Transactions', <SaleIcon key="sale" />],
      ['/admin/claims', 'Claims & Payouts', <WalletIcon key="wallet" />],
      ['/profile', 'My profile', <UsersIcon size={18} key="profile" />],
      ['/', 'Back to website', <BackIcon key="back" />]
    ];
  }

  if (role === 'broker') {
    return [
      ['/broker', 'Overview', <GridIcon key="grid" />],
      ['/broker/catalog', 'Product catalog', <PackageIcon key="package" />],
      ['/broker/sales', 'My orders', <SaleIcon key="sale" />],
      ['/broker/rewards', 'Rewards', <WalletIcon key="wallet" />],
      ['/profile', 'My profile', <UsersIcon size={18} key="profile" />]
    ];
  }

  return [
    ['/seller', 'Overview', <GridIcon key="grid" />],
    ['/seller/products', 'My products', <PackageIcon key="package" />],
    ['/seller/orders', 'Orders', <SaleIcon key="orders" />],
    ['/seller/activity', 'Activity', <ActivityIcon key="activity" />],
    ['/profile', 'My profile', <UsersIcon size={18} key="profile" />]
  ];
}

export function ProfileDashboardPage() {
  const store = useDigitQuoStore();
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('retail');
  const [market, setMarket] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store.loading) return;
    if (!store.user) {
      router.replace('/login');
      return;
    }
    if (!store.profile?.role || !isProfileComplete(store.profile)) {
      router.replace(routeForProfile(store.profile));
    }
  }, [router, store.loading, store.profile, store.user]);

  useEffect(() => {
    if (!store.profile) return;
    setName(store.profile.display_name || store.user?.user_metadata?.full_name || '');
    setBusinessName(store.profile.business_name || '');
    setBusinessType(store.profile.business_type || 'retail');
    setMarket(store.profile.market || '');
  }, [store.profile, store.user]);

  if (store.loading || !store.user || !store.profile?.role || !isProfileComplete(store.profile)) {
    return <div style={{ padding: '40px' }}>Loading profile...</div>;
  }

  const role = store.profile.role;
  const displayName = role === 'seller' ? store.currentSellerName : role === 'broker' ? store.currentBrokerName : store.profile.display_name || 'Owner Admin';

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await store.updateProfile({
        display_name: role === 'seller' ? businessName.trim() : name.trim(),
        business_name: role === 'seller' ? businessName.trim() : null,
        business_type: role === 'seller' ? businessType : null,
        market: role === 'broker' ? market.trim() : null,
        onboarding_complete: true,
      } as any);
      store.showToast('Profile updated.', 'success');
    } catch (error) {
      store.showToast(error instanceof Error ? error.message : 'Could not update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DashboardShell
        label="Account"
        nav={navForRole(role)}
        user={{ initials: displayName.slice(0, 2).toUpperCase(), name: displayName, role: `${role[0].toUpperCase()}${role.slice(1)} account` }}
        title="My profile"
        actions={(
          <div className="topbar-actions">
            <Link className="btn-dashboard btn-dashboard-secondary" href={routeForRole(role)}>Back to dashboard</Link>
            <button className="btn-dashboard btn-dashboard-primary" type="button" onClick={store.logout}>Sign out</button>
          </div>
        )}
      >
        <section className="page-heading">
          <div>
            <p className="eyebrow">Account profile</p>
            <h1 className="page-title">Your DigitQuo Store details.</h1>
            <p className="page-description">Review your login, role, and the profile details used across your workspace.</p>
          </div>
        </section>

        <section className="dashboard-card">
          <header className="dashboard-card-header">
            <div>
              <h2 className="dashboard-card-title">Profile information</h2>
              <p className="dashboard-card-subtitle">Signed in as {store.profile.email}</p>
            </div>
          </header>
          <form className="dashboard-card-body" onSubmit={saveProfile}>
            <div className="form-grid">
              <label className="form-group">
                <span className="form-label">Role</span>
                <input className="form-control" value={role} readOnly />
              </label>
              <label className="form-group">
                <span className="form-label">Email</span>
                <input className="form-control" value={store.profile.email} readOnly />
              </label>

              {role !== 'seller' && (
                <label className="form-group full">
                  <span className="form-label">Display name</span>
                  <input className="form-control" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
              )}

              {role === 'seller' && (
                <>
                  <label className="form-group">
                    <span className="form-label">Business name</span>
                    <input className="form-control" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required />
                  </label>
                  <label className="form-group">
                    <span className="form-label">Business type</span>
                    <select className="form-control" value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="manufacturer">Manufacturer</option>
                    </select>
                  </label>
                </>
              )}

              {role === 'broker' && (
                <label className="form-group full">
                  <span className="form-label">Target market / region</span>
                  <input className="form-control" value={market} onChange={(event) => setMarket(event.target.value)} required />
                </label>
              )}
            </div>
            {role !== 'admin' && (
              <button className="btn-dashboard btn-dashboard-primary" type="submit" style={{ marginTop: '18px' }}>
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            )}
          </form>
        </section>
      </DashboardShell>
      <ToastRegion toasts={store.toasts} />
    </>
  );
}
