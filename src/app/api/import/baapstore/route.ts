import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProductRow = {
  id: string;
  name: string;
  category: string;
  mrp: number;
  price: number;
  commission: number;
  stock: number;
  seller: string;
  image: string;
  description: string;
};

type ParsedProduct = {
  sourceId: string;
  sourceUrl: string;
  name: string;
  category: string;
  images: string[];
  description: string;
  baapstorePrice: number;
  avgRetailPrice: number | null;
};

const TARGET_SELLER_EMAIL = 'ebrahimsekh06s@gmail.com';
const PRICE_ADD_ON = 40;
const MARKUP_RATE = 0.15;
const COMMISSION_RATE_ON_MARKUP = 0.8;
const MAX_PAGES_PER_REQUEST = 50;
const MAX_PRODUCTS_PER_REQUEST = 700;
const DETAIL_IMAGE_CONCURRENCY = 5;
const BAAPSTORE_CATEGORY_PATHS: Record<string, string> = {
  'bags-wallets': '191',
  bedding: '241',
  blouse: '206',
  cables: '225',
  'dupatta-and-stoles': '190',
  fashion: '13',
  'fashion-accessories': '211',
  footwear: '52',
  'hair-care': '248',
  'home-accessories': '200',
  innerwear: '58',
  jewels: '25',
  'kids-dress': '213',
  kitchenware: '21',
  'lip-care': '249',
  'men-shirts': '178',
  'men-tshirts': '182',
  'mens-bottom-wear': '230',
  'mens-footwear': '195',
  'mens-jacket': '202',
  'mens-kurta': '231',
  'mob-accessories': '17',
  'mobile-case-cover': '187',
  mugs: '205',
  nightlamps: '242',
  'night-wears': '210',
  'panties-slips': '60',
  'personal-care': '18',
  'phone-accessories': '198',
  remotes: '226',
  'salwar-material': '170',
  sarees: '169',
  seeds: '247',
  socks: '239',
  stationary: '203',
  'storage-organisation': '246',
  toys: '201',
  'unisex-footwear': '234',
  'womens-bottom-wear': '30',
  'womens-dress': '233',
  'womens-footwear': '196',
  'womens-kurti': '175',
  'womens-kurti-sets': '222',
  'womens-t-shirts': '217',
  'womenst-tops': '199'
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: 'Supabase server credentials are not configured.' }, { status: 500 });
  }

  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken) {
    return NextResponse.json({ error: 'Sign in before importing products.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sourceUrl = cleanString(body?.sourceUrl);
  const mode = cleanString(body?.mode) === 'listing-pages' ? 'listing-pages' : 'single-page';
  const dryRun = Boolean(body?.dryRun);
  const stock = clampInteger(Number(body?.stock || 25), 0, 99999);
  const requestedStartPage = clampInteger(Number(body?.startPage || 1), 1, 99999);
  const requestedPageLimit = clampInteger(Number(body?.pageLimit || 1), 1, MAX_PAGES_PER_REQUEST);

  const parsedSourceUrl = parseBaapstoreUrl(sourceUrl);
  if (!parsedSourceUrl) {
    return NextResponse.json({ error: 'Enter a valid Baapstore URL.' }, { status: 400 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Your session is no longer valid. Please sign in again.' }, { status: 401 });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: currentProfile, error: currentProfileError } = await serviceClient
    .from('profiles')
    .select('email, role, display_name, business_name, onboarding_complete')
    .eq('id', userData.user.id)
    .maybeSingle<{
      email: string;
      role: string;
      display_name: string | null;
      business_name: string | null;
      onboarding_complete: boolean | null;
    }>();

  if (currentProfileError || !currentProfile) {
    return NextResponse.json({ error: 'Could not load your profile.' }, { status: 403 });
  }

  const currentEmail = cleanString(currentProfile.email).toLowerCase();
  const isAllowedUser = currentEmail === TARGET_SELLER_EMAIL || currentProfile.role === 'admin';
  if (!isAllowedUser) {
    return NextResponse.json({ error: `This importer is restricted to ${TARGET_SELLER_EMAIL} and admins.` }, { status: 403 });
  }

  const { data: sellerProfile } = await serviceClient
    .from('profiles')
    .select('email, display_name, business_name')
    .eq('email', TARGET_SELLER_EMAIL)
    .limit(1)
    .maybeSingle<{ email: string; display_name: string | null; business_name: string | null }>();

  const sellerName = cleanString(sellerProfile?.business_name || sellerProfile?.display_name || sellerProfile?.email || TARGET_SELLER_EMAIL);
  let seedHtml = '';
  try {
    seedHtml = await fetchBaapstoreHtml(parsedSourceUrl.toString());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not fetch the Baapstore URL.' }, { status: 502 });
  }

  const totalPages = mode === 'listing-pages' ? getTotalPages(seedHtml) : 1;
  const pageUrls = mode === 'listing-pages'
    ? buildPageUrls(parsedSourceUrl, requestedStartPage, Math.min(requestedPageLimit, Math.max(1, totalPages - requestedStartPage + 1)))
    : [parsedSourceUrl.toString()];

  const parsedProducts: ParsedProduct[] = [];

  for (const pageUrl of pageUrls) {
    try {
      const html = pageUrl === parsedSourceUrl.toString() ? seedHtml : await fetchBaapstoreHtml(pageUrl);
      parsedProducts.push(...parseProductsFromHtml(html, new URL(pageUrl)));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : `Could not fetch ${pageUrl}` }, { status: 502 });
    }

    if (parsedProducts.length >= MAX_PRODUCTS_PER_REQUEST) break;
  }

  const uniqueProducts = dedupeProducts(parsedProducts).slice(0, MAX_PRODUCTS_PER_REQUEST);
  const productsWithImages = await enrichProductsWithDetailImages(uniqueProducts);
  const rows = productsWithImages.map((product) => toProductRow(product, sellerName, stock));
  const existingIds = await getExistingProductIds(serviceClient, rows.map((row) => row.id));

  if (!dryRun && rows.length) {
    const { error: upsertError } = await serviceClient
      .from('products')
      .upsert(rows, { onConflict: 'id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message || 'Could not save imported products.' }, { status: 500 });
    }

    await serviceClient.from('activity').insert({
      id: `act_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: 'product',
      message: `Imported ${rows.length} Baapstore products for ${sellerName}.`,
      created_at: new Date().toISOString()
    });
  }

  const created = rows.filter((row) => !existingIds.has(row.id)).length;
  const updated = rows.length - created;

  return NextResponse.json({
    dryRun,
    seller: sellerName,
    sourceUrl: parsedSourceUrl.toString(),
    mode,
    pagesScanned: pageUrls.length,
    totalPages,
    cappedAtPageLimit: mode === 'listing-pages' && pageUrls.length < Math.max(0, totalPages - requestedStartPage + 1),
    scanned: uniqueProducts.length,
    imported: dryRun ? 0 : rows.length,
    created: dryRun ? 0 : created,
    updated: dryRun ? 0 : updated,
    products: rows.slice(0, 40).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      mrp: row.mrp,
      commission: row.commission,
      stock: row.stock,
      image: getSerializedProductImages(row.image)[0] || '',
      imageCount: getSerializedProductImages(row.image).length,
      sourceUrl: productsWithImages.find((product) => `baapstore_${product.sourceId}` === row.id)?.sourceUrl || ''
    }))
  });
}

function parseBaapstoreUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host !== 'baapstore.com' && host !== 'www.baapstore.com') return null;
    url.protocol = 'https:';
    return url;
  } catch {
    return null;
  }
}

async function fetchBaapstoreHtml(url: string) {
  const response = await fetchWithBrowserHeaders(url);

  if (!response.ok) {
    const warmedResponse = response.status === 403 ? await fetchAfterCookieWarmup(url) : null;
    if (warmedResponse?.ok) return warmedResponse.text();

    const fallbackUrl = getCategoryFallbackUrl(url);
    if (fallbackUrl && fallbackUrl !== url) {
      const fallbackResponse = await fetchWithBrowserHeaders(fallbackUrl);
      if (fallbackResponse.ok) return fallbackResponse.text();

      const warmedFallbackResponse = fallbackResponse.status === 403 ? await fetchAfterCookieWarmup(fallbackUrl) : null;
      if (warmedFallbackResponse?.ok) return warmedFallbackResponse.text();
    }

    const blockedReason = response.status === 403
      ? ' Baapstore may be blocking this server IP or automated requests for that page. The importer also tried the category fallback URL when available.'
      : '';
    throw new Error(`Baapstore returned ${response.status} for ${url}.${blockedReason}`);
  }

  return response.text();
}

async function fetchAfterCookieWarmup(url: string) {
  const target = new URL(url);
  const homeResponse = await fetchWithBrowserHeaders(target.origin);
  const cookie = collectCookies(homeResponse);

  return fetchWithBrowserHeaders(url, cookie);
}

function fetchWithBrowserHeaders(url: string, cookie = '') {
  const target = new URL(url);

  return fetch(url, {
    redirect: 'follow',
    cache: 'no-store',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Referer: `${target.origin}/`,
      'Sec-CH-UA': '"Google Chrome";v="126", "Chromium";v="126", "Not-A.Brand";v="24"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Upgrade-Insecure-Requests': '1',
      ...(cookie ? { Cookie: cookie } : {})
    }
  });
}

function getCategoryFallbackUrl(value: string) {
  try {
    const url = new URL(value);
    const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
    const path = BAAPSTORE_CATEGORY_PATHS[slug];
    if (!path) return '';

    const fallback = new URL('/index.php', url.origin);
    fallback.searchParams.set('route', 'product/category');
    fallback.searchParams.set('path', path);

    const page = url.searchParams.get('page');
    if (page) fallback.searchParams.set('page', page);

    const limit = url.searchParams.get('limit');
    if (limit) fallback.searchParams.set('limit', limit);

    return fallback.toString();
  } catch {
    return '';
  }
}

function collectCookies(response: Response) {
  const setCookie = response.headers.get('set-cookie') || '';
  return setCookie
    .split(/,(?=[^;,]+=)/)
    .map((item) => item.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

function parseProductsFromHtml(html: string, pageUrl: URL): ParsedProduct[] {
  const region = getBetween(html, '<div class="main-products product-grid">', '<div class="row pagination-results">') || html;
  const category = limitText(decodeHtml(getMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || pageUrl.pathname.split('/').filter(Boolean).pop() || 'Baapstore Products'), 80);
  const cardParts = region.split(/<div class="product-layout[^>]*>/i).slice(1);

  return cardParts
    .map((card) => parseProductCard(card, category, pageUrl))
    .filter((product): product is ParsedProduct => Boolean(product));
}

function parseProductCard(card: string, category: string, pageUrl: URL): ParsedProduct | null {
  const productUrlRaw = getMatch(card, /href="([^"]*PID\d+[^"]*)"/i);
  const productUrl = productUrlRaw ? new URL(decodeHtml(productUrlRaw), pageUrl.origin).toString() : '';
  const sourceIdMatch = productUrl.match(/PID\d+/i);
  const sourceId = sourceIdMatch?.[0]?.toUpperCase() || '';

  if (!sourceId) return null;

  const image = normalizeBaapstoreImageUrl(decodeHtml(getMatch(card, /<img[^>]+src="([^"]+)"/i) || ''));
  const name = limitText(
    cleanProductText(decodeHtml(getMatch(card, /<div[^>]+class="name"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i) || getMatch(card, /<img[^>]+alt="([^"]+)"/i) || sourceId)),
    120
  );
  const description = limitText(cleanProductText(decodeHtml(stripTags(getMatch(card, /<div[^>]+class="description"[^>]*>([\s\S]*?)<\/div>/i) || ''))), 700);
  const baapstorePrice = parseFirstPrice(card);
  const avgRetailPrice = parsePrice(getMatch(card, /Avg\s+Retail\s+Price:\s*[^0-9]*([0-9][0-9,.]*)/i) || '');

  if (!name || !baapstorePrice) return null;

  return {
    sourceId,
    sourceUrl: productUrl || pageUrl.toString(),
    name,
    category,
    images: image ? [image] : [],
    description,
    baapstorePrice,
    avgRetailPrice
  };
}

function toProductRow(product: ParsedProduct, seller: string, stock: number): ProductRow {
  const priceParts = calculatePrice(product.baapstorePrice);

  return {
    id: `baapstore_${product.sourceId}`,
    name: product.name,
    category: product.category || 'Baapstore Products',
    mrp: priceParts.mrp,
    price: priceParts.mrp,
    commission: priceParts.commission,
    stock,
    seller,
    image: serializeProductImages(product.images),
    description: product.description
  };
}

async function enrichProductsWithDetailImages(products: ParsedProduct[]) {
  const enriched = products.map((product) => ({ ...product, images: mergeProductImages(product.images) }));
  let cursor = 0;

  async function worker() {
    while (cursor < enriched.length) {
      const index = cursor;
      cursor += 1;
      const product = enriched[index];

      if (!product?.sourceUrl) continue;

      try {
        const html = await fetchBaapstoreHtml(product.sourceUrl);
        const detailImages = parseDetailImages(html, product.sourceId);
        if (detailImages.length) {
          product.images = mergeProductImages([...detailImages, ...product.images]);
        }
      } catch {
        product.images = mergeProductImages(product.images);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(DETAIL_IMAGE_CONCURRENCY, enriched.length) }, () => worker()));
  return enriched;
}

function parseDetailImages(html: string, sourceId: string) {
  const pid = sourceId.replace(/\D/g, '');
  const normalizedHtml = html.replace(/\\\//g, '/');
  const matches = Array.from(normalizedHtml.matchAll(/(?:https?:\/\/)?baapstore-images\.blr1\.cdn\.digitaloceanspaces\.com\/[^"'<>\s)]+/gi))
    .map((match) => normalizeBaapstoreImageUrl(match[0]))
    .filter(Boolean);

  const productImages = matches.filter((image) => {
    const lower = image.toLowerCase();
    return lower.includes('size-chart') || lower.includes(`pid-${pid}`) || lower.includes(`pid${pid}`);
  });

  return mergeProductImages(productImages);
}

function mergeProductImages(images: string[]) {
  const bestByImage = new Map<string, string>();

  images
    .map(normalizeBaapstoreImageUrl)
    .filter(Boolean)
    .forEach((image) => {
      const key = image.replace(/-\d+x\d+(?=\.[a-z]+$)/i, '');
      const current = bestByImage.get(key);
      if (!current || imageRank(image) > imageRank(current)) {
        bestByImage.set(key, image);
      }
    });

  return Array.from(bestByImage.values()).slice(0, 8);
}

function imageRank(image: string) {
  const dimensions = image.match(/-(\d+)x(\d+)(?=\.[a-z]+$)/i);
  if (!dimensions) return 0;
  return Number(dimensions[1]) * Number(dimensions[2]);
}

function normalizeBaapstoreImageUrl(value: string) {
  const clean = decodeHtml(value)
    .replace(/^\/\//, 'https://')
    .replace(/^baapstore-images\./i, 'https://baapstore-images.')
    .split('?')[0]
    .trim();

  if (!clean) return '';
  if (!/^https:\/\/baapstore-images\.blr1\.cdn\.digitaloceanspaces\.com\//i.test(clean)) return '';
  return clean;
}

function serializeProductImages(images: string[]) {
  const clean = mergeProductImages(images);
  if (!clean.length) return '';
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}

function getSerializedProductImages(value: string) {
  const raw = cleanString(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((item) => normalizeBaapstoreImageUrl(String(item || ''))).filter(Boolean);
  } catch {
    // Single-image products are stored as a plain URL.
  }

  const image = normalizeBaapstoreImageUrl(raw);
  return image ? [image] : [];
}

function calculatePrice(sourcePrice: number) {
  const subtotal = sourcePrice + PRICE_ADD_ON;
  const markup = subtotal * MARKUP_RATE;
  return {
    mrp: roundMoney(subtotal + markup),
    commission: roundMoney(markup * COMMISSION_RATE_ON_MARKUP)
  };
}

function getTotalPages(html: string) {
  const fromResults = Number(getMatch(html, /\(([0-9]+)\s+Pages?\)/i) || 0);
  if (fromResults > 0) return fromResults;

  const pageMatches = Array.from(html.matchAll(/[?&]page=([0-9]+)/gi)).map((match) => Number(match[1] || 0));
  return Math.max(1, ...pageMatches.filter(Boolean));
}

function buildPageUrls(sourceUrl: URL, startPage: number, pageCount: number) {
  return Array.from({ length: pageCount }, (_, index) => {
    const page = startPage + index;
    const url = new URL(sourceUrl.toString());
    if (page <= 1) {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', String(page));
    }
    return url.toString();
  });
}

function dedupeProducts(products: ParsedProduct[]) {
  const seen = new Map<string, ParsedProduct>();
  products.forEach((product) => {
    if (!seen.has(product.sourceId)) seen.set(product.sourceId, product);
  });
  return Array.from(seen.values());
}

async function getExistingProductIds(serviceClient: any, ids: string[]) {
  if (!ids.length) return new Set<string>();

  const found = new Set<string>();

  for (let index = 0; index < ids.length; index += 200) {
    const { data } = await serviceClient
      .from('products')
      .select('id')
      .in('id', ids.slice(index, index + 200));

    (data || []).forEach((row: { id: string }) => found.add(row.id));
  }

  return found;
}

function parseFirstPrice(card: string) {
  const matches = Array.from(card.matchAll(/<span[^>]+class="price-normal"[^>]*>\s*[^0-9<]*([0-9][0-9,.]*)/gi));
  return parsePrice(matches[0]?.[1] || '');
}

function parsePrice(value: string) {
  const numeric = cleanString(value).replace(/,/g, '');
  const amount = Number(numeric);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getBetween(value: string, start: string, end: string) {
  const startIndex = value.indexOf(start);
  if (startIndex < 0) return '';
  const contentStart = startIndex + start.length;
  const endIndex = value.indexOf(end, contentStart);
  if (endIndex < 0) return value.slice(contentStart);
  return value.slice(contentStart, endIndex);
}

function getMatch(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1] || '';
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value: string) {
  return stripTags(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanProductText(value: string) {
  return cleanString(value)
    .replace(/\bDropship(?:ping)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.)])/g, '$1')
    .trim();
}

function cleanString(value: unknown) {
  return String(value || '').trim();
}

function limitText(value: string, maxLength: number) {
  const clean = cleanString(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function roundMoney(value: number) {
  return Math.round(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}
