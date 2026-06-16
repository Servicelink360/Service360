export const MARKETING_SITE_ORIGIN =
  (typeof process !== 'undefined' && process.env.REACT_APP_SITE_URL) || 'https://service360.com.au';

export const DEFAULT_HOME_TITLE = 'Service360 — Facility Management System';
export const DEFAULT_HOME_DESCRIPTION =
  'Streamline facility operations with Service360. Manage work orders, preventive maintenance, job sites, faults, inspections, and service requests from one secure platform for facility managers and contractors in Australia.';

const OG_IMAGE_PATH = '/logo.png';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: Record<string, unknown>) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

function buildPageUrl(path: string): string {
  const origin = MARKETING_SITE_ORIGIN.replace(/\/$/, '');
  if (!path || path === '/') return `${origin}/`;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function applyMarketingSeo(opts: {
  path: string;
  title: string;
  description: string;
  isHome?: boolean;
}) {
  const url = buildPageUrl(opts.path);
  const image = buildPageUrl(OG_IMAGE_PATH);

  document.title = opts.title;
  upsertMeta('name', 'description', opts.description);
  upsertMeta('name', 'robots', 'index, follow');
  upsertMeta('property', 'og:title', opts.title);
  upsertMeta('property', 'og:description', opts.description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', 'Service360');
  upsertMeta('property', 'og:locale', 'en_AU');
  upsertMeta('property', 'og:image', image);
  upsertMeta('name', 'twitter:card', 'summary');
  upsertMeta('name', 'twitter:title', opts.title);
  upsertMeta('name', 'twitter:description', opts.description);
  upsertMeta('name', 'twitter:image', image);
  upsertCanonical(url);

  if (opts.isHome) {
    upsertJsonLd('marketing-jsonld-org', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Service360',
      url: MARKETING_SITE_ORIGIN,
      logo: image,
      email: 'helpdesk@servicelink.net.au',
      description: opts.description,
    });
    upsertJsonLd('marketing-jsonld-website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Service360',
      url: MARKETING_SITE_ORIGIN,
      description: opts.description,
    });
    removeJsonLd('marketing-jsonld-page');
  } else {
    removeJsonLd('marketing-jsonld-org');
    removeJsonLd('marketing-jsonld-website');
    upsertJsonLd('marketing-jsonld-page', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: opts.title,
      description: opts.description,
      url,
      inLanguage: 'en-AU',
      isPartOf: {
        '@type': 'WebSite',
        name: 'Service360',
        url: MARKETING_SITE_ORIGIN,
      },
    });
  }
}
