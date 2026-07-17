export const IMPORT_PRICE_ADD_ON = 40;
export const IMPORT_MARKUP_RATE = 0.15;
export const IMPORT_COMMISSION_RATE_ON_MARKUP = 0.8;

export function calculateImportedProductPrice(sourcePrice: number) {
  const normalizedSourcePrice = Number(sourcePrice || 0);
  const subtotal = normalizedSourcePrice + IMPORT_PRICE_ADD_ON;
  const markup = subtotal * IMPORT_MARKUP_RATE;

  return {
    mrp: Math.round(subtotal + markup),
    commission: Math.round(markup * IMPORT_COMMISSION_RATE_ON_MARKUP)
  };
}
