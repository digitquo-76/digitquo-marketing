'use client';

import { useState, useEffect, useMemo } from 'react';
import { safeImageUrl, formatCurrency } from '../../lib/utils';

export function ProductModal({ open, product, onClose, onSave, showToast }: any) {
  const initial = useMemo(
    () => product
      ? { ...product, mrp: product.mrp ?? product.price }
      : { name: '', category: '', mrp: '', price: '', stock: '', image: '', description: '' },
    [product]
  );
  const [values, setValues] = useState(initial);

  useEffect(() => {
    setValues(initial);
  }, [initial, open]);

  useModal(open);

  if (!open) return null;

  const update = (key: string, value: string) => setValues((current: any) => ({ ...current, [key]: value }));

  const updateImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Choose an image smaller than 2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update('image', String(reader.result || ''));
    reader.onerror = () => showToast('Could not read that image. Try another file.', 'error');
    reader.readAsDataURL(file);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = {
      name: String(values.name || '').trim(),
      category: String(values.category || '').trim(),
      mrp: Number(values.mrp),
      price: Number(values.price),
      stock: Number(values.stock),
      image: safeImageUrl(String(values.image || '').trim()),
      description: String(values.description || '').trim()
    };
    if (!cleaned.name || !cleaned.category || cleaned.mrp <= 0 || cleaned.price <= 0 || cleaned.stock < 0) {
      showToast('Please complete all required product fields.', 'error');
      return;
    }
    if (cleaned.price > cleaned.mrp) {
      showToast('Selling price cannot be higher than MRP.', 'error');
      return;
    }
    onSave(cleaned);
  };

  const image = safeImageUrl(String(values.image || ''));

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <header className="modal-header">
          <h2 className="modal-title">{product ? 'Edit product' : 'Add a new product'}</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">x</button>
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
              <span className="form-label">MRP (Rs) *</span>
              <input className="form-control" value={values.mrp || ''} onChange={(event) => update('mrp', event.target.value)} type="number" required min="1" step="1" placeholder="1299" />
            </label>
            <label className="form-group">
              <span className="form-label">Selling price (Rs) *</span>
              <input className="form-control" value={values.price || ''} onChange={(event) => update('price', event.target.value)} type="number" required min="1" step="1" placeholder="999" />
            </label>
            <label className="form-group">
              <span className="form-label">Available stock *</span>
              <input className="form-control" value={values.stock ?? ''} onChange={(event) => update('stock', event.target.value)} type="number" required min="0" step="1" placeholder="25" />
            </label>
            <div className="form-group full">
              <span className="form-label">Product image</span>
              <div className="image-upload-row">
                <span className="image-upload-preview">
                  {image ? <img src={image} alt="" /> : 'IMG'}
                </span>
                <label className="file-upload-button">
                  Choose from gallery
                  <input type="file" accept="image/*" onChange={(event) => updateImageFile(event.target.files?.[0])} />
                </label>
              </div>
              <span className="form-help">Select an image from your mobile gallery or computer. Max size: 2 MB.</span>
            </div>
            <label className="form-group full">
              <span className="form-label">Description</span>
              <textarea className="form-control" value={values.description || ''} onChange={(event) => update('description', event.target.value)} maxLength={300} placeholder="Add useful product details for brokers" />
            </label>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-dashboard btn-dashboard-primary" type="submit">{product ? 'Save changes' : 'Publish product'}</button>
        </footer>
      </form>
    </div>
  );
}

export function OrderModal({ product, onClose, onSave, submitting = false }: any) {
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  useModal(Boolean(product));

  useEffect(() => {
    setQuantity(1);
    setCustomer('');
    setCustomerPhone('');
    setCustomerAddress('');
    setOrderNotes('');
  }, [product]);

  if (!product) return null;

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(event) => { if (!submitting && event.target === event.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={(event) => { event.preventDefault(); if (!submitting) onSave({ productId: product.id, customer: customer.trim(), customerPhone: customerPhone.trim(), customerAddress: customerAddress.trim(), orderNotes: orderNotes.trim(), quantity: Number(quantity) }); }}>
        <header className="modal-header">
          <h2 className="modal-title">Place order</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close" disabled={submitting}>x</button>
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
              <span className="form-label">MRP</span>
              <input className="form-control" value={formatCurrency(product.mrp ?? product.price)} readOnly />
            </label>
            <label className="form-group">
              <span className="form-label">Quantity *</span>
              <input className="form-control" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} type="number" required min="1" max={product.stock} step="1" />
              <span className="form-help">{product.stock} units available at {formatCurrency(product.price)} selling price each.</span>
            </label>
            <label className="form-group full">
              <span className="form-label">Customer or business name *</span>
              <input className="form-control" value={customer} onChange={(event) => setCustomer(event.target.value)} required maxLength={120} placeholder="Who is this order for?" />
            </label>
            <label className="form-group">
              <span className="form-label">Customer phone *</span>
              <input className="form-control" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} required maxLength={40} placeholder="Phone number" />
            </label>
            <label className="form-group full">
              <span className="form-label">Delivery address *</span>
              <textarea className="form-control" value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} required maxLength={300} placeholder="Customer delivery address" />
            </label>
            <label className="form-group full">
              <span className="form-label">Order notes</span>
              <textarea className="form-control" value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} maxLength={300} placeholder="Size, color, timing, or other seller instructions" />
            </label>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-dashboard btn-dashboard-primary" type="submit" disabled={submitting}>{submitting ? 'Processing payment...' : `Pay ${formatCurrency(product.price * Number(quantity || 1))}`}</button>
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
