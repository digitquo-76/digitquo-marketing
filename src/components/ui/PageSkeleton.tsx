type PageSkeletonProps = {
  variant: 'marketing' | 'auth' | 'dashboard';
};

export function PageSkeleton({ variant }: PageSkeletonProps) {
  return (
    <div
      className={`loading-screen loading-screen-${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="loading-sr-only">Loading page content…</span>

      {/* Brand lockup */}
      <div className="loading-brand" aria-hidden="true">
        <img
          className="loading-logo-img"
          src="/favicon.png?v=1"
          alt=""
          width={36}
          height={36}
          decoding="async"
        />
        <span className="loading-wordmark">DigitQuo Store</span>
      </div>

      {/* Spinner ring */}
      <div className="loading-ring-wrap" aria-hidden="true">
        <span className="loading-ring-track" />
        <span className="loading-ring-spin" style={{ animation: 'ls-spin-v2 1.5s linear infinite' }} />
      </div>

      {/* Dot pulse */}
      <div className="loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
