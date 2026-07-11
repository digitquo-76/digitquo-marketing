'use client';

import { Product, Activity } from '@/types';
import { safeImageUrl, relativeTime } from '@/lib/utils';
import { SaleIcon, PackageIcon, ActivityIcon } from '../ui/icons';

export function Metric({ icon, value, label }: { icon: React.ReactNode, value: number | string, label: string }) {
  return (
    <article className="metric-card">
      <span className="metric-icon">{icon}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-label">{label}</span>
    </article>
  );
}

export function ProductCell({ product }: { product: Product }) {
  return (
    <div className="product-cell">
      <span className="product-thumb"><ProductImage product={product} /></span>
      <div>
        <p className="cell-title">{product.name}</p>
        <p className="cell-meta">{product.id.slice(-8).toUpperCase()}</p>
      </div>
    </div>
  );
}

export function ProductImage({ product }: { product: Product }) {
  const image = safeImageUrl(product.image || '');
  return image ? <img src={image} alt="" loading="lazy" /> : <>{product.name.slice(0, 2).toUpperCase()}</>;
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="status-badge status-out">Out of stock</span>;
  if (stock <= 10) return <span className="status-badge status-low">Low stock</span>;
  return <span className="status-badge status-active">Active</span>;
}

export function ActivityList({ items }: { items: Activity[] }) {
  if (!items.length) return <div className="empty-state"><strong>No activity yet</strong>New actions will appear here.</div>;
  return (
    <div className="activity-list">
      {items.map((item) => (
        <div className="activity-item" key={item.id}>
          <span className="activity-icon">
            {item.type === 'sale' ? <SaleIcon size={17} /> : item.type === 'product' ? <PackageIcon size={17} /> : <ActivityIcon size={16} />}
          </span>
          <div>
            <p className="activity-message">{item.message}</p>
            <p className="activity-time">{relativeTime(item.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyRow({ colSpan, title, text }: { colSpan: number, title: string, text: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="empty-state">
          <strong>{title}</strong>{text}
        </div>
      </td>
    </tr>
  );
}
