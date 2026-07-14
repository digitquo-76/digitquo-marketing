'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Product, Activity } from '../../types';
import { getProductImages, relativeTime } from '../../lib/utils';
import { SaleIcon, PackageIcon, ActivityIcon, BackIcon } from '../ui/icons';

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
  const image = getProductImages(product.image || '')[0] || '';
  return image ? <img src={image} alt="" loading="lazy" /> : <>{product.name.slice(0, 2).toUpperCase()}</>;
}

export function ProductImageCarousel({ product }: { product: Product }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const parsedImages = useMemo(() => getProductImages(product.image || ''), [product.image]);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const images = parsedImages.filter((image) => !failedImages.has(image));
  const slides = images.length ? images : [''];
  const hasMultipleImages = slides.length > 1;

  useEffect(() => {
    setFailedImages(new Set());
    activeIndexRef.current = 0;
    setActiveIndex(0);
    trackRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [product.id, product.image]);

  useEffect(() => {
    const lastIndex = Math.max(0, slides.length - 1);
    if (activeIndex <= lastIndex) return;

    activeIndexRef.current = lastIndex;
    setActiveIndex(lastIndex);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: track.clientWidth * lastIndex, behavior: 'auto' });
  }, [activeIndex, slides.length]);

  const showImage = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
    const track = trackRef.current;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    if (track) track.scrollTo({ left: track.clientWidth * nextIndex, behavior: 'auto' });
  };

  const updateActiveImage = () => {
    const track = trackRef.current;
    if (!track?.clientWidth) return;

    const nextIndex = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
    activeIndexRef.current = nextIndex;
    setActiveIndex((currentIndex) => currentIndex === nextIndex ? currentIndex : nextIndex);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showImage(activeIndexRef.current - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showImage(activeIndexRef.current + 1);
    }
  };

  return (
    <div className="product-image-carousel" role="region" aria-roledescription="carousel" aria-label={`${product.name} product photos`}>
      <div className="product-image-carousel-stage">
      <div
        className="product-image-carousel-track"
        ref={trackRef}
        onScroll={updateActiveImage}
        onKeyDown={handleKeyDown}
        role="group"
        tabIndex={hasMultipleImages ? 0 : undefined}
        aria-label={hasMultipleImages ? `${product.name} photos. Swipe horizontally or use the left and right arrow keys.` : undefined}
      >
        {slides.map((image, index) => (
          <div
            className="product-image-carousel-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`Image ${index + 1} of ${slides.length}`}
            key={image ? `${image.slice(0, 48)}-${index}` : 'product-image-fallback'}
          >
            {image ? (
              <img
                src={image}
                alt={`${product.name}, image ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                onError={() => setFailedImages((current) => new Set(current).add(image))}
              />
            ) : (
              <span className="product-image-carousel-fallback" aria-label={`${product.name} has no product photo`}>
                {product.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>

      {hasMultipleImages && (
        <>
          <button
            className="product-image-carousel-control previous"
            type="button"
            onClick={() => showImage(activeIndexRef.current - 1)}
            disabled={activeIndex === 0}
            aria-label={`Show previous image of ${product.name}`}
          >
            <BackIcon />
          </button>
          <button
            className="product-image-carousel-control next"
            type="button"
            onClick={() => showImage(activeIndexRef.current + 1)}
            disabled={activeIndex === slides.length - 1}
            aria-label={`Show next image of ${product.name}`}
          >
            <BackIcon />
          </button>
          <span className="product-image-carousel-count" aria-live="polite">
            {activeIndex + 1} / {slides.length}
          </span>
        </>
      )}
      </div>
      {hasMultipleImages && (
        <div className="product-image-thumbnails" role="group" aria-label="Choose a product image">
          {slides.map((image, index) => (
            <button className={`product-image-thumbnail${activeIndex === index ? ' active' : ''}`} type="button" onClick={() => showImage(index)} aria-label={`Show image ${index + 1} of ${slides.length}`} aria-pressed={activeIndex === index} key={`${image.slice(0, 48)}-thumb-${index}`}>
              {image ? <img src={image} alt="" /> : <span>{product.name.slice(0, 2).toUpperCase()}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
