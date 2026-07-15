import type { CSSProperties } from 'react';
import { LogoMark } from './icons';

type PageSkeletonProps = {
  variant: 'marketing' | 'auth' | 'dashboard';
};

type SkeletonBlockProps = {
  className?: string;
  height?: string;
  width?: string;
};

function SkeletonBlock({ className = '', height, width }: SkeletonBlockProps) {
  const style: CSSProperties = {};
  if (height) style.height = height;
  if (width) style.width = width;

  return <span className={`skeleton-block ${className}`.trim()} style={style} />;
}

function SkeletonTextStack({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-text-stack">
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBlock key={index} width={index === lines - 1 ? '68%' : '100%'} />
      ))}
    </div>
  );
}

function LoadingStatus() {
  return <span className="skeleton-sr-only">Loading page content...</span>;
}

function MarketingSkeleton() {
  return (
    <div className="page-skeleton skeleton-marketing" role="status" aria-live="polite" aria-busy="true">
      <LoadingStatus />
      <div className="bg-effects" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-grid" />
      </div>

      <nav className="navbar skeleton-navbar" aria-hidden="true">
        <div className="container nav-container">
          <div className="logo">
            <LogoMark />
            <SkeletonBlock className="skeleton-logo-text" width="88px" height="18px" />
          </div>
          <div className="skeleton-nav-links">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBlock key={index} width={index === 2 ? '76px' : '64px'} height="12px" />
            ))}
          </div>
          <div className="skeleton-nav-actions">
            <SkeletonBlock className="skeleton-button" width="76px" height="38px" />
            <SkeletonBlock className="skeleton-button" width="118px" height="38px" />
          </div>
        </div>
      </nav>

      <header className="hero skeleton-hero" aria-hidden="true">
        <div className="container hero-inner">
          <SkeletonBlock className="skeleton-pill" width="220px" height="36px" />
          <div className="skeleton-hero-title">
            <SkeletonBlock height="64px" width="82%" />
            <SkeletonBlock height="64px" width="64%" />
          </div>
          <div className="skeleton-hero-copy">
            <SkeletonBlock width="100%" />
            <SkeletonBlock width="76%" />
          </div>
          <div className="hero-cta skeleton-hero-actions">
            <SkeletonBlock className="skeleton-button" width="150px" height="52px" />
            <SkeletonBlock className="skeleton-button" width="172px" height="52px" />
          </div>
          <div className="hero-stats skeleton-hero-stats">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="skeleton-stat-card" key={index}>
                <SkeletonBlock width="64px" height="24px" />
                <SkeletonBlock width="92px" height="11px" />
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="brand-bar skeleton-brand-bar" aria-hidden="true">
        <div className="container">
          <SkeletonBlock width="360px" height="14px" />
        </div>
      </section>

      <section className="section skeleton-section" aria-hidden="true">
        <div className="container">
          <div className="section-header">
            <SkeletonBlock className="skeleton-pill" width="130px" height="30px" />
            <SkeletonBlock className="skeleton-section-title" width="470px" height="38px" />
            <SkeletonBlock width="560px" height="14px" />
          </div>
          <div className="features-grid skeleton-card-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="feature-card skeleton-card" key={index}>
                <SkeletonBlock className="skeleton-icon" width="44px" height="44px" />
                <SkeletonBlock width="52%" height="18px" />
                <SkeletonTextStack />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AuthSkeleton() {
  return (
    <main className="auth-main page-skeleton skeleton-auth" role="status" aria-live="polite" aria-busy="true">
      <LoadingStatus />
      <section className="auth-dashboard skeleton-auth-dashboard" aria-hidden="true">
        <aside className="auth-story">
          <div className="auth-story-content">
            <SkeletonBlock className="skeleton-pill skeleton-on-dark" width="178px" height="36px" />
            <div className="skeleton-auth-title">
              <SkeletonBlock className="skeleton-on-dark" height="56px" width="92%" />
              <SkeletonBlock className="skeleton-on-dark" height="56px" width="72%" />
            </div>
            <div className="skeleton-auth-copy">
              <SkeletonBlock className="skeleton-on-dark" width="100%" />
              <SkeletonBlock className="skeleton-on-dark" width="84%" />
              <SkeletonBlock className="skeleton-on-dark" width="62%" />
            </div>
            <div className="auth-proof-grid">
              {Array.from({ length: 2 }, (_, index) => (
                <div className="auth-proof-card skeleton-auth-proof" key={index}>
                  <SkeletonBlock className="skeleton-on-dark" width="58px" height="28px" />
                  <SkeletonBlock className="skeleton-on-dark" width="86px" height="12px" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <SkeletonBlock className="skeleton-pill" width="150px" height="30px" />
            <SkeletonBlock width="220px" height="38px" />
            <SkeletonBlock width="310px" height="14px" />
          </div>
          <SkeletonBlock className="skeleton-button" height="48px" width="100%" />
          <div className="skeleton-divider" />
          <div className="auth-form">
            {Array.from({ length: 2 }, (_, index) => (
              <div className="auth-field-group" key={index}>
                <SkeletonBlock width={index === 0 ? '112px' : '86px'} height="13px" />
                <SkeletonBlock className="skeleton-input" height="50px" width="100%" />
              </div>
            ))}
            <SkeletonBlock className="skeleton-button auth-submit" height="52px" width="100%" />
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-shell page-skeleton skeleton-dashboard" role="status" aria-live="polite" aria-busy="true">
      <LoadingStatus />
      <aside className="sidebar skeleton-dashboard-sidebar" aria-hidden="true">
        <div className="dashboard-brand">
          <LogoMark />
          <SkeletonBlock className="skeleton-on-dark" width="86px" height="18px" />
        </div>
        <SkeletonBlock className="skeleton-on-dark skeleton-sidebar-label" width="86px" height="10px" />
        <nav className="sidebar-nav">
          {Array.from({ length: 5 }, (_, index) => (
            <div className={`sidebar-link skeleton-sidebar-link${index === 0 ? ' active' : ''}`} key={index}>
              <SkeletonBlock className="skeleton-on-dark skeleton-sidebar-icon" width="18px" height="18px" />
              <SkeletonBlock className="skeleton-on-dark" width={index === 2 ? '108px' : '88px'} height="13px" />
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <SkeletonBlock className="skeleton-on-dark skeleton-avatar" width="36px" height="36px" />
            <div>
              <SkeletonBlock className="skeleton-on-dark" width="88px" height="12px" />
              <SkeletonBlock className="skeleton-on-dark" width="64px" height="10px" />
            </div>
          </div>
        </div>
      </aside>

      <main className="main-dashboard" aria-hidden="true">
        <header className="topbar">
          <div className="topbar-actions">
            <SkeletonBlock className="skeleton-mobile-menu" width="40px" height="40px" />
            <div>
              <SkeletonBlock width="180px" height="13px" />
              <SkeletonBlock width="150px" height="11px" />
            </div>
          </div>
          <SkeletonBlock className="skeleton-button" width="128px" height="42px" />
        </header>

        <div className="dashboard-content">
          <div className="page-heading">
            <div>
              <SkeletonBlock width="96px" height="12px" />
              <SkeletonBlock className="skeleton-dashboard-title" width="360px" height="42px" />
              <SkeletonBlock width="520px" height="14px" />
            </div>
            <SkeletonBlock className="skeleton-button" width="150px" height="42px" />
          </div>

          <div className="metrics-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="metric-card skeleton-metric" key={index}>
                <SkeletonBlock className="skeleton-icon" width="36px" height="36px" />
                <SkeletonBlock width="84px" height="28px" />
                <SkeletonBlock width="118px" height="12px" />
              </div>
            ))}
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <SkeletonBlock width="150px" height="16px" />
                  <SkeletonBlock width="210px" height="11px" />
                </div>
                <SkeletonBlock className="skeleton-input" width="220px" height="42px" />
              </div>
              <div className="dashboard-card-body skeleton-table">
                {Array.from({ length: 5 }, (_, index) => (
                  <div className="skeleton-table-row" key={index}>
                    <SkeletonBlock className="skeleton-avatar" width="38px" height="38px" />
                    <SkeletonBlock width="28%" height="13px" />
                    <SkeletonBlock width="18%" height="13px" />
                    <SkeletonBlock width="14%" height="13px" />
                    <SkeletonBlock width="70px" height="24px" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <div>
                    <SkeletonBlock width="132px" height="16px" />
                    <SkeletonBlock width="190px" height="11px" />
                  </div>
                </div>
                <div className="dashboard-card-body">
                  <div className="activity-list">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div className="activity-item" key={index}>
                        <SkeletonBlock className="skeleton-icon" width="34px" height="34px" />
                        <div>
                          <SkeletonBlock width="100%" height="12px" />
                          <SkeletonBlock width="62%" height="10px" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  if (variant === 'auth') return <AuthSkeleton />;
  if (variant === 'dashboard') return <DashboardSkeleton />;
  return <MarketingSkeleton />;
}
