const BAAPSTORE_IMAGE_ORIGIN = 'https://baapstore-images.blr1.cdn.digitaloceanspaces.com/';

const FULL_SIZE_ATTRIBUTES = [
  'data-largeimg',
  'data-large-image',
  'data-zoom-image'
];

/**
 * Extracts the current product's full-size gallery without relying on the PID
 * being present in the filename. Older Baapstore galleries use opaque Flickr
 * filenames, while newer products generally include their PID.
 */
export function parseBaapstoreDetailImages(html: string) {
  const galleryImages = parseLightgalleryImages(html);
  if (galleryImages.length) return mergeBaapstoreProductImages(galleryImages);

  const fallbackImages: string[] = [];

  for (const tag of html.match(/<[^>]+>/g) || []) {
    for (const attribute of FULL_SIZE_ATTRIBUTES) {
      const candidate = getHtmlAttribute(tag, attribute);
      if (candidate) fallbackImages.push(candidate);
    }

    if (!/^<img\b/i.test(tag)) continue;

    const bestSrcsetImage = getLargestSrcsetImage(getHtmlAttribute(tag, 'srcset'));
    if (isLikelyFullSizeImage(bestSrcsetImage)) fallbackImages.push(bestSrcsetImage);

    const source = getHtmlAttribute(tag, 'data-src') || getHtmlAttribute(tag, 'src');
    if (isLikelyFullSizeImage(source)) fallbackImages.push(source);
  }

  return mergeBaapstoreProductImages([...galleryImages, ...fallbackImages]);
}

export function mergeBaapstoreProductImages(images: string[]) {
  const bestByImage = new Map<string, string>();

  images
    .map(normalizeBaapstoreImageUrl)
    .filter(Boolean)
    .forEach((image) => {
      const key = image.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '');
      const current = bestByImage.get(key);
      if (!current || baapstoreImageRank(image) > baapstoreImageRank(current)) {
        bestByImage.set(key, image);
      }
    });

  return Array.from(bestByImage.values());
}

export function normalizeBaapstoreImageUrl(value: string) {
  const clean = decodeHtmlAttribute(value)
    .replace(/\\\//g, '/')
    .replace(/^\/\//, 'https://')
    .replace(/^http:\/\/baapstore-images\./i, 'https://baapstore-images.')
    .replace(/^baapstore-images\./i, 'https://baapstore-images.')
    .split('?')[0]
    .trim();

  if (!clean) return '';
  if (!clean.toLowerCase().startsWith(BAAPSTORE_IMAGE_ORIGIN)) return '';
  return clean;
}

export function serializeBaapstoreProductImages(images: string[]) {
  const clean = mergeBaapstoreProductImages(images);
  if (!clean.length) return '';
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}

export function getSerializedBaapstoreProductImages(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return mergeBaapstoreProductImages(parsed.map((item) => String(item || '')));
    }
  } catch {
    // Single-image products are stored as a plain URL.
  }

  const image = normalizeBaapstoreImageUrl(raw);
  return image ? [image] : [];
}

function parseLightgalleryImages(html: string) {
  const images: string[] = [];
  const tags = html.match(/<[^>]*\bclass\s*=\s*(?:"[^"]*\blightgallery-product-images\b[^"]*"|'[^']*\blightgallery-product-images\b[^']*')[^>]*>/gi) || [];

  for (const tag of tags) {
    const encodedData = getRawHtmlAttribute(tag, 'data-images');
    if (!encodedData) continue;

    const decodedData = decodeHtmlAttribute(encodedData).trim();
    const attempts = [decodedData, decodedData.replace(/\\"/g, '"')];

    for (const attempt of attempts) {
      try {
        let parsed: unknown = JSON.parse(attempt);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        collectGallerySources(parsed, images);
        break;
      } catch {
        // Try the common backslash-escaped form next.
      }
    }
  }

  return images;
}

function collectGallerySources(value: unknown, output: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectGallerySources(item, output));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const entry = value as Record<string, unknown>;
  const source = ['src', 'large', 'image', 'largeImage']
    .map((key) => entry[key])
    .find((item): item is string => typeof item === 'string' && Boolean(normalizeBaapstoreImageUrl(item)));

  if (source) {
    output.push(source);
    return;
  }

  Object.values(entry).forEach((item) => {
    if (Array.isArray(item) || (item && typeof item === 'object')) {
      collectGallerySources(item, output);
    }
  });
}

function getLargestSrcsetImage(value: string) {
  let bestImage = '';
  let bestRank = -1;

  value.split(',').forEach((part) => {
    const [image = '', descriptor = ''] = part.trim().split(/\s+/, 2);
    const descriptorRank = Number(descriptor.replace(/[^0-9.]/g, '')) || 0;
    const rank = Math.max(descriptorRank * descriptorRank, baapstoreImageRank(image));
    if (rank > bestRank) {
      bestImage = image;
      bestRank = rank;
    }
  });

  return bestImage;
}

function isLikelyFullSizeImage(value: string) {
  const image = normalizeBaapstoreImageUrl(value);
  if (!image) return false;
  if (/size[-_ ]?chart/i.test(image)) return true;

  const dimensions = getImageDimensions(image);
  return dimensions ? Math.min(dimensions.width, dimensions.height) >= 800 : false;
}

function baapstoreImageRank(image: string) {
  const dimensions = getImageDimensions(image);
  return dimensions ? dimensions.width * dimensions.height : 0;
}

function getImageDimensions(image: string) {
  const dimensions = image.match(/-(\d+)x(\d+)(?=\.[a-z0-9]+(?:$|\?))/i);
  if (!dimensions) return null;
  return { width: Number(dimensions[1]), height: Number(dimensions[2]) };
}

function getHtmlAttribute(tag: string, name: string) {
  return decodeHtmlAttribute(getRawHtmlAttribute(tag, name));
}

function getRawHtmlAttribute(tag: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match?.[1] ?? match?.[2] ?? '';
}

function decodeHtmlAttribute(value: string) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&(?:apos|#0*39);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (match, code: string) => decodeNumericEntity(match, code, 16))
    .replace(/&#([0-9]+);/g, (match, code: string) => decodeNumericEntity(match, code, 10));
}

function decodeNumericEntity(match: string, code: string, radix: number) {
  const codePoint = Number.parseInt(code, radix);
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return match;
  }
}
