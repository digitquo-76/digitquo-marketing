'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, getProductImages, serializeProductImages } from '../../lib/utils';
import { PRODUCT_DESCRIPTION_MAX_LENGTH, normalizeProductDescription } from '../../lib/productDescription';
import {
  areProductSelectionsValid,
  normalizeProductOptionGroups,
  normalizeSelectedProductOptions
} from '../../lib/productOptions';
import { PRODUCT_CATEGORIES } from './productCategories';
import {
  createProductOptionGroupDrafts,
  parseProductOptionGroupDrafts,
  ProductOptionGroupsEditor
} from './ProductOptionGroupsEditor';

const PRODUCT_IMAGE_MAX_SIZE_MB = 20;
const PRODUCT_IMAGE_MAX_DIMENSION = 1600;
const PRODUCT_IMAGE_TARGET_SIZE = 1.25 * 1024 * 1024;
const PRODUCT_IMAGE_MAX_COUNT = 30;
const ORDER_SHIPPING_CHARGE = 50;

type ProductModalProps = {
  open: boolean;
  product?: any;
  onClose: () => void;
  onSave: (values: any) => Promise<unknown> | unknown;
  showToast: (message: string, type?: 'success' | 'error' | '') => void;
  categories?: string[];
};

export function ProductModal({ open, product, onClose, onSave, showToast, categories }: ProductModalProps) {
  const initial = useMemo(
    () => product
      ? {
          ...product,
          mrp: product.mrp ?? product.price,
          commission: product.commission ?? Math.max(0, Number(product.mrp || 0) - Number(product.price || 0)),
          description: normalizeProductDescription(product.description),
          optionGroups: createProductOptionGroupDrafts(product.optionGroups, product.optionLabel, product.optionValues)
        }
      : { name: '', category: '', mrp: '', commission: '', stock: '', image: '', description: '', optionGroups: [] },
    [product]
  );
  const [values, setValues] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValues(initial);
    setIsSaving(false);
  }, [initial, open]);

  useModal(open);

  if (!open) return null;

  const update = (key: string, value: unknown) => setValues((current: any) => ({ ...current, [key]: value }));
  const images = useMemo(() => getProductImages(String(values.image || '')), [values.image]);
  const setImages = (nextImages: string[]) => update('image', serializeProductImages(nextImages));
  const categoryOptions = Array.from(new Set([
    ...(Array.isArray(categories) && categories.length ? categories : PRODUCT_CATEGORIES),
    String(values.category || '').trim()
  ].map((category) => String(category || '').trim()).filter(Boolean)));

  const updateImageFiles = (files?: FileList | null) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const invalid = selected.find((file) => !file.type.startsWith('image/'));
    if (invalid) {
      showToast('Please choose only image files.', 'error');
      return;
    }
    const oversized = selected.find((file) => file.size > PRODUCT_IMAGE_MAX_SIZE_MB * 1024 * 1024);
    if (oversized) {
      showToast(`Each image must be smaller than ${PRODUCT_IMAGE_MAX_SIZE_MB} MB.`, 'error');
      return;
    }
    if (images.length + selected.length > PRODUCT_IMAGE_MAX_COUNT) {
      showToast(`You can add up to ${PRODUCT_IMAGE_MAX_COUNT} product photos.`, 'error');
      return;
    }

    Promise.all(selected.map((file) => readOptimizedImageFile(file)))
      .then((nextImages) => setImages([...images, ...nextImages]))
      .catch(() => showToast('Could not optimize one of those images. Try another file.', 'error'));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    const parsedOptionGroups = parseProductOptionGroupDrafts(Array.isArray(values.optionGroups) ? values.optionGroups : []);
    if (parsedOptionGroups.error) {
      showToast(parsedOptionGroups.error, 'error');
      return;
    }
    const firstOptionGroup = parsedOptionGroups.groups[0];
    const cleaned = {
      name: String(values.name || '').trim(),
      category: String(values.category || '').trim(),
      mrp: Number(values.mrp),
      commission: Number(values.commission),
      stock: Number(values.stock),
      image: serializeProductImages(images),
      description: String(values.description || '').trim(),
      optionGroups: parsedOptionGroups.groups,
      optionLabel: firstOptionGroup?.label || '',
      optionValues: firstOptionGroup?.values || []
    };
    if (!cleaned.name || !cleaned.category || cleaned.mrp <= 0 || cleaned.commission < 0 || cleaned.stock < 0) {
      showToast('Please complete all required product fields.', 'error');
      return;
    }
    if (cleaned.commission > cleaned.mrp) {
      showToast('Commission cannot be higher than MRP.', 'error');
      return;
    }
    setIsSaving(true);
    onClose();
    showToast(product ? 'Saving product changes in the background...' : 'Publishing product in the background...');

    void Promise.resolve()
      .then(() => onSave(cleaned))
      .catch((error) => {
        showToast(error instanceof Error ? error.message : 'Could not save product.', 'error');
      });
  };

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(event) => { if (!isSaving && event.target === event.currentTarget) onClose(); }}>
      <form className={`modal${isSaving ? ' is-saving' : ''}`} onSubmit={submit} aria-busy={isSaving}>
        <header className="modal-header">
          <h2 className="modal-title">{product ? 'Edit product' : 'Add a new product'}</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close" disabled={isSaving}>x</button>
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
                {categoryOptions.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="form-group">
              <span className="form-label">MRP (Rs) *</span>
              <input className="form-control" value={values.mrp || ''} onChange={(event) => update('mrp', event.target.value)} type="number" required min="1" step="1" placeholder="1299" />
            </label>
            <label className="form-group">
              <span className="form-label">Broker commission (Rs) *</span>
              <input className="form-control" value={values.commission ?? ''} onChange={(event) => update('commission', event.target.value)} type="number" required min="0" step="1" placeholder="300" />
            </label>
            <label className="form-group">
              <span className="form-label">Available stock *</span>
              <input className="form-control" value={values.stock ?? ''} onChange={(event) => update('stock', event.target.value)} type="number" required min="0" step="1" placeholder="25" />
            </label>
            <ProductOptionGroupsEditor
              groups={Array.isArray(values.optionGroups) ? values.optionGroups : []}
              onChange={(optionGroups) => update('optionGroups', optionGroups)}
              disabled={isSaving}
            />
            <div className="form-group full">
              <span className="form-label">Product images</span>
              <div className="image-upload-row">
                <div className="image-upload-preview-grid">
                  {images.length ? images.map((image, index) => (
                    <span className="image-upload-preview" key={`${image.slice(0, 40)}-${index}`}>
                      <img src={image} alt="" />
                      <button type="button" className="image-remove-button" onClick={() => setImages(images.filter((_, imageIndex) => imageIndex !== index))} aria-label={`Remove product image ${index + 1}`}>x</button>
                    </span>
                  )) : <span className="image-upload-preview">IMG</span>}
                </div>
                <label className="file-upload-button">
                  Choose from gallery
                  <input type="file" accept="image/*" multiple onChange={(event) => updateImageFiles(event.target.files)} />
                </label>
              </div>
              <span className="form-help">Select up to {PRODUCT_IMAGE_MAX_COUNT} images. Photos are automatically resized for fast loading. Max input size: {PRODUCT_IMAGE_MAX_SIZE_MB} MB each.</span>
            </div>
            <label className="form-group full">
              <span className="form-label">Description</span>
              <textarea className="form-control" value={values.description || ''} onChange={(event) => update('description', event.target.value)} maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH} rows={8} placeholder="Add useful product details for brokers" />
            </label>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="btn-dashboard btn-dashboard-primary" type="submit" disabled={isSaving}>
            {isSaving ? <><span className="button-spinner" aria-hidden="true" />{product ? 'Saving changes...' : 'Publishing...'}</> : product ? 'Save changes' : 'Publish product'}
          </button>
        </footer>
      </form>
    </div>
  );
}

async function readOptimizedImageFile(file: File) {
  const decoded = await decodeImage(file);
  const scale = Math.min(1, PRODUCT_IMAGE_MAX_DIMENSION / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    decoded.cleanup();
    throw new Error('Canvas is unavailable.');
  }

  context.drawImage(decoded.source, 0, 0, width, height);
  decoded.cleanup();

  let optimized: Blob | null = null;
  for (const quality of [0.82, 0.7, 0.58]) {
    optimized = await canvasToBlob(canvas, 'image/webp', quality);
    if (optimized.size <= PRODUCT_IMAGE_TARGET_SIZE) break;
  }

  return readBlobAsDataUrl(optimized);
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    } catch {
      // Fall through to the broadly supported image-element decoder.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  await image.decode();
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl)
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Image optimization failed.')), type, quality);
  });
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function OrderModal({ product, onClose, onSave, submitting = false }: any) {
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'details' | 'review'>('details');
  useModal(Boolean(product));

  useEffect(() => {
    setQuantity(1);
    setCustomer('');
    setCustomerPhone('');
    setCustomerAddress('');
    setOrderNotes('');
    setSelectedOptionValues({});
    setStep('details');
  }, [product]);

  if (!product) return null;

  const orderQuantity = Number(quantity || 1);
  const productTotal = Number(product.mrp || 0) * orderQuantity;
  const payableTotal = productTotal + ORDER_SHIPPING_CHARGE;
  const optionGroups = normalizeProductOptionGroups(product.optionGroups, product.optionLabel, product.optionValues);
  const selectedOptions = normalizeSelectedProductOptions(optionGroups.map((group) => ({
    label: group.label,
    value: selectedOptionValues[group.label] || ''
  })));
  const firstSelectedOption = selectedOptions[0];
  const orderDetails = {
    productId: product.id,
    customer: customer.trim(),
    customerPhone: customerPhone.trim(),
    customerAddress: customerAddress.trim(),
    orderNotes: orderNotes.trim(),
    selectedOptions,
    selectedOptionLabel: firstSelectedOption?.label || '',
    selectedOptionValue: firstSelectedOption?.value || '',
    quantity: orderQuantity
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (step === 'details') {
      if (!areProductSelectionsValid(optionGroups, selectedOptions)) return;
      setStep('review');
      return;
    }
    onSave(orderDetails);
  };

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(event) => { if (!submitting && event.target === event.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <header className="modal-header">
          <h2 className="modal-title">{step === 'details' ? 'Place order' : 'Review order total'}</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close" disabled={submitting}>x</button>
        </header>
        <div className="modal-body">
          {step === 'details' ? (
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
                <input className="form-control" value={formatCurrency(product.mrp)} readOnly />
              </label>
              <label className="form-group">
                <span className="form-label">Quantity *</span>
                <input className="form-control" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} type="number" required min="1" max={product.stock} step="1" />
                <span className="form-help">{product.stock} units available at {formatCurrency(product.mrp)} MRP each. Commission: {formatCurrency(product.commission)} per unit.</span>
              </label>
              {optionGroups.map((group) => (
                <label className="form-group" key={group.label}>
                  <span className="form-label">{group.label} *</span>
                  <select
                    className="form-control"
                    value={selectedOptionValues[group.label] || ''}
                    onChange={(event) => setSelectedOptionValues((current) => ({ ...current, [group.label]: event.target.value }))}
                    required
                  >
                    <option value="">Please select</option>
                    {group.values.map((value: string) => <option value={value} key={value}>{value}</option>)}
                  </select>
                </label>
              ))}
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
          ) : (
            <div className="order-review">
              <div className="order-review-product">
                <span className="form-label">Product</span>
                <strong>{product.name}</strong>
                <p>{orderQuantity} x {formatCurrency(product.mrp)} from {product.seller}</p>
                {selectedOptions.map((selection) => <p key={selection.label}>{selection.label}: {selection.value}</p>)}
              </div>
              <div className="order-review-lines" aria-label="Order total breakdown">
                <div><span>Product total</span><strong>{formatCurrency(productTotal)}</strong></div>
                <div><span>Shipping charge</span><strong>{formatCurrency(ORDER_SHIPPING_CHARGE)}</strong></div>
                <div className="order-review-total"><span>Total payable</span><strong>{formatCurrency(payableTotal)}</strong></div>
              </div>
              <div className="order-review-delivery">
                <span className="form-label">Delivery details</span>
                <p><strong>{customer}</strong> · {customerPhone}</p>
                <p>{customerAddress}</p>
                {orderNotes ? <p>Notes: {orderNotes}</p> : null}
              </div>
            </div>
          )}
        </div>
        <footer className="modal-footer">
          {step === 'review' ? <button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={() => setStep('details')} disabled={submitting}>Back</button> : <button className="btn-dashboard btn-dashboard-secondary" type="button" onClick={onClose} disabled={submitting}>Cancel</button>}
          <button className="btn-dashboard btn-dashboard-primary" type="submit" disabled={submitting}>{submitting ? 'Processing payment...' : step === 'details' ? 'Next' : `Pay ${formatCurrency(payableTotal)}`}</button>
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
