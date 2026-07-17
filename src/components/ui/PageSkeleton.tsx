import { LogoMark } from './icons';

type PageSkeletonProps = {
  variant: 'marketing' | 'auth' | 'dashboard';
};

function LoadingStatus() {
  return <span className="skeleton-sr-only">Loading page content...</span>;
}

function LoadingScreen({ variant }: PageSkeletonProps) {
  const content = {
    marketing: {
      eyebrow: 'Loading marketing content',
      title: 'Preparing the site experience',
      description: 'Bringing in the latest sections, visuals, and copy.'
    },
    auth: {
      eyebrow: 'Loading secure access',
      title: 'Preparing sign in and onboarding',
      description: 'Setting up your account flow and session state.'
    },
    dashboard: {
      eyebrow: 'Loading your dashboard',
      title: 'Preparing your workspace',
      description: 'Fetching account data, activity, and tools.'
    }
  }[variant];

  return (
    <div className={`loading-screen loading-screen-${variant}`} role="status" aria-live="polite" aria-busy="true">
      <LoadingStatus />
      <div className="loading-stage" aria-hidden="true">
        <div className="loading-ring">
          <span className="loading-ring-track" />
          <span className="loading-ring-spinner" />
        </div>
        <div className="loading-mark">
          <LogoMark />
        </div>
      </div>

      <div className="loading-copy">
        <p className="loading-eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.description}</p>
      </div>
    </div>
  );
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  return <LoadingScreen variant={variant} />;
}
