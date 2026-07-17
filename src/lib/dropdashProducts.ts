import { normalizeProductOptionGroups } from './productOptions';
import { normalizeProductDescription } from './productDescription';
import type { ProductOptionGroup } from '../types';

export type DropdashListProduct = {
  productID?: unknown;
  dd_id?: unknown;
  product_id?: unknown;
  id?: unknown;
  title?: unknown;
  highlights?: unknown;
  description?: unknown;
  overview?: unknown;
  stock?: unknown;
  stock_available_for_buyers?: unknown;
  sellerId?: unknown;
  seller_id?: unknown;
  sellerID?: unknown;
  category_name?: unknown;
  product_image?: unknown;
  mrp?: unknown;
  original_price?: unknown;
  selling_price?: unknown;
  b_2_b_price?: unknown;
  is_active?: unknown;
};

export type DropdashDetailProduct = DropdashListProduct & {
  category_Name?: unknown;
  imageDetails?: unknown;
  variants?: unknown;
};

type DropdashImageDetail = {
  small?: unknown;
  medium?: unknown;
  large?: unknown;
};

type DropdashVariant = {
  variantLabel?: unknown;
  variantItemSku?: unknown;
  product_image?: unknown;
  variantImage?: unknown;
};

export function getDropdashProductId(product: DropdashListProduct) {
  const id = Number(
    product.productID
    ?? product.dd_id
    ?? product.product_id
    ?? product.id
  );
  return Number.isSafeInteger(id) && id > 0 ? String(id) : '';
}

export function getDropdashSellerId(product: DropdashListProduct) {
  const id = Number(product.sellerId ?? product.seller_id ?? product.sellerID);
  return Number.isSafeInteger(id) && id > 0 ? String(id) : '';
}

export function getDropdashSourcePrice(product: DropdashListProduct | DropdashDetailProduct) {
  for (const candidate of [product.b_2_b_price, product.selling_price, product.original_price, product.mrp]) {
    const amount = Number(candidate);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
}

export function getDropdashStock(product: DropdashListProduct | DropdashDetailProduct) {
  const stock = Number(product.stock);
  if (!Number.isFinite(stock)) return 0;
  return Math.min(99999, Math.max(0, Math.floor(stock)));
}

export function getDropdashProductDescription(
  listing: DropdashListProduct,
  detail?: DropdashDetailProduct | null
) {
  const description = normalizeDropdashDescription(detail?.description ?? listing.description);
  const highlights = normalizeDropdashDescription(detail?.highlights ?? listing.highlights);
  const overview = normalizeDropdashDescription(detail?.overview ?? listing.overview);
  const title = cleanText(detail?.title ?? listing.title);
  const sections: string[] = [];

  addUniqueSection(sections, description || highlights || title);
  if (highlights && !sameText(highlights, description) && !sameText(highlights, title)) {
    addUniqueSection(sections, `Highlights:\n${highlights}`);
  }
  if (overview && !sameText(overview, description) && !sameText(overview, highlights)) {
    addUniqueSection(sections, `Overview:\n${overview}`);
  }

  return normalizeProductDescription(sections.join('\n\n'));
}

export function getDropdashProductImages(
  listing: DropdashListProduct,
  detail?: DropdashDetailProduct | null
) {
  const images: unknown[] = [];
  const imageDetails = Array.isArray(detail?.imageDetails)
    ? detail.imageDetails as DropdashImageDetail[]
    : [];
  const variants = Array.isArray(detail?.variants)
    ? detail.variants as DropdashVariant[]
    : [];

  imageDetails.forEach((image) => {
    images.push(image?.large || image?.medium || image?.small);
  });
  variants.forEach((variant) => {
    images.push(variant?.variantImage, variant?.product_image);
  });
  images.push(detail?.product_image, listing.product_image);

  return dedupeDropdashImages(images);
}

/**
 * Dropdash exposes valid variant combinations as one display label rather than
 * independent Color/Size axes. Keeping those labels together avoids offering
 * combinations that the supplier does not actually sell.
 */
export function getDropdashProductOptionGroups(detail?: DropdashDetailProduct | null): ProductOptionGroup[] {
  const variants = Array.isArray(detail?.variants)
    ? detail.variants as DropdashVariant[]
    : [];
  const values = variants
    .map((variant) => cleanText(variant?.variantLabel || variant?.variantItemSku))
    .filter((value) => value && !/^(?:n\/?a|none|null)$/i.test(value));

  return normalizeProductOptionGroups(values.length ? [{ label: 'Variant', values }] : []);
}

export function normalizeDropdashImageUrl(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const isDropdashHost = hostname === 'dropdash.co' || hostname.endsWith('.dropdash.co');
    if (url.protocol === 'http:' && isDropdashHost) url.protocol = 'https:';
    if (url.protocol !== 'https:') return '';
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch {
    return '';
  }
}

export function dedupeDropdashImages(values: unknown[]) {
  const images: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    const image = normalizeDropdashImageUrl(value);
    const key = image.toLowerCase();
    if (!image || seen.has(key)) return;
    seen.add(key);
    images.push(image);
  });

  return images;
}

function normalizeDropdashDescription(value: unknown) {
  const withStructuredSeparators = String(value || '')
    .replace(/\s*\|\s*/g, '\u2022 ')
    .replace(/\t+/g, ' ');
  return normalizeProductDescription(withStructuredSeparators);
}

function addUniqueSection(sections: string[], value: string) {
  const clean = value.trim();
  if (!clean || sections.some((section) => sameText(section, clean))) return;
  sections.push(clean);
}

function sameText(first: unknown, second: unknown) {
  return cleanText(first).toLocaleLowerCase() === cleanText(second).toLocaleLowerCase();
}

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
