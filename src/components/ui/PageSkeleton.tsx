type PageSkeletonProps = {
  variant: 'marketing' | 'auth' | 'dashboard';
};

function LoadingStatus() {
  return <span className="skeleton-sr-only">Loading page content...</span>;
}

function LoadingScreen({ variant }: PageSkeletonProps) {
  return (
    <div className={`loading-screen loading-screen-${variant}`} role="status" aria-live="polite" aria-busy="true">
      <LoadingStatus />
      <div className="loading-stage" aria-hidden="true">
        <span className="loading-spinner" />
      </div>
    </div>
  );
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  return <LoadingScreen variant={variant} />;
}
