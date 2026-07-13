import type { MetadataRoute } from 'next';

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://digitquo.in').replace(/\/+$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/broker',
        '/seller',
        '/profile',
        '/onboarding',
        '/reset-password',
        '/auth'
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
