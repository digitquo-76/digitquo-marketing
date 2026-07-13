import type { MetadataRoute } from 'next';

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://digitquo.in').replace(/\/+$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const lastModified = new Date();

  return [
    {
      url: `${origin}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${origin}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${origin}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${origin}/cookies`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];
}
