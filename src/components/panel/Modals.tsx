'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product } from '../../types';
import { safeImageUrl, formatCurrency } from '../../lib/utils';

export function ProductModal({ open, product, onClose, onSave, showToast }: any) {
  const initial = useMemo(() => product || { name: '', category: '', price: '', stock: '', image: '', description: '' }, [product]);
  const [values, setValues] = useState(initial);

  useEffect(() => {
    setValues(initial);
  }, [initial, open]);

  useModal(open);

  if (!open) return null;

  const update = (key: string, value: string) => setValues((current: any) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = {
      name: String(values.name || '').trim(),
      category: String(values.category || '').trim(),
      price: Number(values.price),
      stock: Number(values.stock),
      image: safeImageUrl(String(values.image || '').trim()),
      description: String(values.description || '').trim()
    };
    if (!cleaned.name || !cleaned.category || cleaned.price <= 0 || cleaned.stock < 0) {
      showToast('Please complete all required product fields.', 'error');
      return;
    }
    onSave(cleaned);
  };

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <header className="modal-header">
          <h2 className="modal-title">{product ? 'Edit product' : 'Add a new product'}</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">
          <div className="form-grid">
            <label className="form-group full">
              <span className="form-label">Product name *</span>
              <input className="form-control" value={values.name || ''} onChange={(event) => update('name', event.target.value)} required maxLength={80} placeholder="e.g. Premium cotton shirt" />
            </label>
            <label className="form-group">
              <span className="form-label">Category *</span>
              <select className="form-control" value={values.category || ''} onChange={(event) => update('category', event.target.value)} required>
                <option value="">Choose category</option>
                <option>Apparel</option>
                <option>Accessories</option>
                <option>Electronics</option>
                <option>Food</option>
                <option>Home &amp; Living</option>
                <option>Other</option>
              </select>
            </label>
            <label className="form-group">
              <span className="form-label">Price per unit (₹) *</span>
              <input className="form-control" value={values.price || ''} onChange={(event) => update('price', event.target.value)} type="number" required min="1" step="1" placeholder="999" />
            </label>
            <label className="form-group">
              <span className="form-label">Available stock *</span>
              <input className="form-control" value={values.stock ?? ''} onChange={(event) => update('stock', event.target.value)} type="number" required min="0" step="1" placeholder="25" />
            </label>
            <label className="form-group">
              <span className="form-label">Image URL</span>
              <input className="form-control" value={values.image || ''} onChange={(event) => update('image', event.target.value)} type="url" placeholder="https://..." />
              <span className="form-help">Use a direct HTTPS image link.</span>
            </label>
            <label className="form-group full">
              <span className="form-label">Description</span>
              <textarea className="form-control" value={values.description || ''} onChange={(event) => update('description', event.target.value)} maxLength={300} placeholder="Add useful product details for brokers" />
            </label>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn-panel btn-panel-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-panel btn-panel-primary" type="submit">{product ? 'Save changes' : 'Publish product'}</button>
        </footer>
      </form>
    </div>
  );
}

export function SaleModal({ product, onClose, onSave }: any) {
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState('');
  useModal(Boolean(product));

  useEffect(() => {
    setQuantity(1);
    setCustomer('');
  }, [product]);

  if (!product) return null;

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={(event) => { event.preventDefault(); onSave({ productId: product.id, customer: customer.trim(), quantity: Number(quantity) }); }}>
        <header className="modal-header">
          <h2 className="modal-title">Record a customer sale</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">
          <div className="form-grid">
            <label className="form-group full">
              <span className="form-label">Product</span>
              <input className="form-control" value={product.name} readOnly />
            </label>
            <label className="form-group">
              <span className="form-label">Seller</span>
              <input className="form-control" value={product.seller} readOnly />
            </label>
            <label className="form-group">
              <span className="form-label">Quantity sold *</span>
              <input className="form-control" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} type="number" required min="1" max={product.stock} step="1" />
              <span className="form-help">{product.stock} units available at {formatCurrency(product.price)} each.</span>
            </label>
            <label className="form-group full">
              <span className="form-label">Customer or business name *</span>
              <input className="form-control" value={customer} onChange={(event) => setCustomer(event.target.value)} required maxLength={80} placeholder="Who did you sell this to?" />
            </label>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn-panel btn-panel-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-panel btn-panel-primary" type="submit">Confirm sale</button>
        </footer>
      </form>
    </div>
  );
}

function useModal(open: boolean) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') (document.querySelector('.modal-close') as HTMLElement)?.click();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);
}
