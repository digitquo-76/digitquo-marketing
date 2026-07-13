import type { Sale } from '../types';

export interface AnalyticsDatum {
  label: string;
  value: number;
  detail: string;
}

export interface ProductPerformance {
  id: string;
  label: string;
  orders: number;
  units: number;
  orderValue: number;
  commission: number;
}

export function getMonthlyTrend(
  sales: Sale[],
  valueForSale: (sale: Sale) => number,
  months = 6
): AnalyticsDatum[] {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - index - 1), 1);
    return {
      key: monthKey(date),
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      value: 0,
      orders: 0
    };
  });
  const bucketsByMonth = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  sales.forEach((sale) => {
    const saleDate = new Date(sale.createdAt);
    if (Number.isNaN(saleDate.getTime())) return;

    const bucket = bucketsByMonth.get(monthKey(saleDate));
    if (!bucket) return;

    bucket.value += finiteNumber(valueForSale(sale));
    bucket.orders += 1;
  });

  return buckets.map(({ label, value, orders }) => ({
    label,
    value,
    detail: `${orders} ${orders === 1 ? 'order' : 'orders'}`
  }));
}

export function getProductPerformance(sales: Sale[]): ProductPerformance[] {
  const products = new Map<string, ProductPerformance>();

  sales.forEach((sale) => {
    const id = sale.productId || sale.productName;
    const current = products.get(id) || {
      id,
      label: sale.productName || 'Unnamed product',
      orders: 0,
      units: 0,
      orderValue: 0,
      commission: 0
    };

    current.orders += 1;
    current.units += finiteNumber(sale.quantity);
    current.orderValue += finiteNumber(sale.total);
    current.commission += finiteNumber(sale.points);
    products.set(id, current);
  });

  return Array.from(products.values());
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function finiteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}
