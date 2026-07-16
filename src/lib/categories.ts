export const DEFAULT_PRODUCT_CATEGORIES = [
  'Clothing',
  'Accessories',
  'Footwear',
  'Beauty & Personal Care',
  'Electronics',
  'Mobiles & Gadgets',
  'Home & Living',
  'Kitchen & Dining',
  'Furniture',
  'Food & Beverages',
  'Grocery & Staples',
  'Health & Wellness',
  'Baby & Kids',
  'Toys & Games',
  'Books & Stationery',
  'Sports & Fitness',
  'Automotive',
  'Hardware & Tools',
  'Jewellery',
  'Bags & Luggage',
  'Pet Supplies',
  'Office Supplies',
  'Other'
] as const;

export const PRODUCT_CATEGORY_NAME_MAX_LENGTH = 80;

export function normalizeProductCategoryName(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function productCategoryKey(value: unknown) {
  return normalizeProductCategoryName(value).toLowerCase();
}

export function mergeProductCategoryNames(
  ...collections: ReadonlyArray<ReadonlyArray<string | null | undefined>>
) {
  const names = new Map<string, string>();

  for (const collection of collections) {
    for (const value of collection) {
      const name = normalizeProductCategoryName(value);
      const key = productCategoryKey(name);
      if (key && !names.has(key)) names.set(key, name);
    }
  }

  return Array.from(names.values());
}

export function isDefaultProductCategory(value: unknown) {
  const key = productCategoryKey(value);
  return DEFAULT_PRODUCT_CATEGORIES.some((name) => productCategoryKey(name) === key);
}
