'use client';

import { useState, useEffect } from 'react';
import { Product, Sale, Activity, Toast, Claim } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { cacheUserProfile, clearCachedUserProfile, ensureUserProfile } from './profile';
import { getProductImages, serializeProductImages } from './utils';

const PRODUCT_COLUMNS = 'id,name,category,mrp,price,commission,stock,seller,image,description,option_label,option_values,created_at';
const PRODUCT_COLUMNS_WITHOUT_IMAGES = 'id,name,category,mrp,price,commission,stock,seller,description,option_label,option_values,created_at';
const LEGACY_PRODUCT_COLUMNS = 'id,name,category,mrp,price,commission,stock,seller,image,description,created_at';
const LEGACY_PRODUCT_COLUMNS_WITHOUT_IMAGES = 'id,name,category,mrp,price,commission,stock,seller,description,created_at';
const SALE_COLUMNS = 'id,product_id,product_name,seller,customer,customer_phone,customer_address,order_notes,selected_option_label,selected_option_value,quantity,unit_price,total,points,broker,razorpay_order_id,razorpay_payment_id,created_at';
const CLAIM_COLUMNS = 'id,broker,points,payout_account_name,payout_bank_name,payout_account_number,payout_ifsc,payout_upi,status,created_at';
const ACTIVITY_COLUMNS = 'id,type,message,created_at';
const PRODUCT_IMAGE_BUCKET = 'product-images';
const WORKSPACE_CACHE_MS = 30_000;

type ProductImageMode = 'all' | 'active' | 'none';
type StoreOptions = {
  loadWorkspace?: boolean;
  loadProducts?: boolean;
  loadSales?: boolean;
  loadClaims?: boolean;
  loadActivity?: boolean;
  productImages?: ProductImageMode;
  productId?: string;
};

type ResourceResult<T> = { data: T[]; error: any };
type CacheEntry = { data: unknown[]; expiresAt: number };

const workspaceCache = new Map<string, CacheEntry>();
const pendingWorkspaceRequests = new Map<string, Promise<ResourceResult<any>>>();

type Profile = {
  id: string;
  role: 'seller' | 'broker' | 'admin';
  email: string;
  display_name?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  market?: string | null;
  payout_account_name?: string | null;
  payout_bank_name?: string | null;
  payout_account_number?: string | null;
  payout_ifsc?: string | null;
  payout_upi?: string | null;
  onboarding_complete?: boolean | null;
};

type PlaceOrderInput = {
  productId: string;
  customer: string;
  customerPhone: string;
  customerAddress: string;
  orderNotes: string;
  selectedOptionLabel: string;
  selectedOptionValue: string;
  quantity: number;
};

type RazorpayPaymentResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type CompletePaidOrderInput = {
  order: PlaceOrderInput;
  payment: RazorpayPaymentResult;
};

function emptyResource<T>(): Promise<ResourceResult<T>> {
  return Promise.resolve({ data: [], error: null });
}

async function cachedResource<T>(key: string, loader: () => Promise<ResourceResult<T>>): Promise<ResourceResult<T>> {
  const cached = workspaceCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data as T[], error: null };
  }

  const pending = pendingWorkspaceRequests.get(key);
  if (pending) return pending as Promise<ResourceResult<T>>;

  const request = loader().then((result) => {
    if (!result.error) {
      workspaceCache.set(key, { data: result.data, expiresAt: Date.now() + WORKSPACE_CACHE_MS });
    }
    return result;
  }).finally(() => {
    pendingWorkspaceRequests.delete(key);
  });
  pendingWorkspaceRequests.set(key, request);
  return request;
}

function invalidateWorkspaceResource(userId: string | undefined, resource: string) {
  if (!userId) return;
  const prefix = `${userId}:${resource}`;
  for (const key of workspaceCache.keys()) {
    if (key.startsWith(prefix)) workspaceCache.delete(key);
  }
}

function clearUserWorkspaceCache(userId: string | undefined) {
  if (!userId) return;
  const prefix = `${userId}:`;
  for (const key of workspaceCache.keys()) {
    if (key.startsWith(prefix)) workspaceCache.delete(key);
  }
}

function loadProductsResource(userId: string, imageMode: ProductImageMode, activeProductId?: string) {
  const key = `${userId}:products:${imageMode}:${imageMode === 'active' ? activeProductId || '' : ''}`;
  if (imageMode !== 'all') {
    const fullImageCache = workspaceCache.get(`${userId}:products:all:`);
    if (fullImageCache && fullImageCache.expiresAt > Date.now()) {
      return Promise.resolve({ data: fullImageCache.data as Product[], error: null });
    }
  }
  return cachedResource<Product>(key, async () => {
    const includeAllImages = imageMode === 'all';
    const loadProductRows = (legacy = false) => supabase
      .from('products')
      .select(legacy
        ? includeAllImages ? LEGACY_PRODUCT_COLUMNS : LEGACY_PRODUCT_COLUMNS_WITHOUT_IMAGES
        : includeAllImages ? PRODUCT_COLUMNS : PRODUCT_COLUMNS_WITHOUT_IMAGES)
      .order('created_at', { ascending: false });

    if (imageMode !== 'active' || !activeProductId) {
      let result = await loadProductRows();
      if (result.error && isMissingProductOptionSchema(result.error)) result = await loadProductRows(true);
      return { data: (result.data || []).map(mapProductFromDB), error: result.error };
    }

    let [productsResult, imageResult] = await Promise.all([
      loadProductRows(),
      supabase.from('products').select('id,image').eq('id', activeProductId).maybeSingle()
    ]);
    if (productsResult.error && isMissingProductOptionSchema(productsResult.error)) productsResult = await loadProductRows(true);
    const activeImage = imageResult.data?.image || '';
    const products = (productsResult.data || []).map((row: any) => mapProductFromDB({
      ...row,
      image: row.id === activeProductId ? activeImage : ''
    }));
    return { data: products, error: productsResult.error || imageResult.error };
  });
}

function loadSalesResource(userId: string) {
  return cachedResource<Sale>(`${userId}:sales`, async () => {
    const result = await supabase.from('sales').select(SALE_COLUMNS).order('created_at', { ascending: false });
    return { data: (result.data || []).map(mapSaleFromDB), error: result.error };
  });
}

function loadClaimsResource(userId: string) {
  return cachedResource<Claim>(`${userId}:claims`, async () => {
    const result = await supabase.from('claims').select(CLAIM_COLUMNS).order('created_at', { ascending: false });
    return { data: (result.data || []).map(mapClaimFromDB), error: result.error };
  });
}

function loadActivityResource(userId: string) {
  return cachedResource<Activity>(`${userId}:activity`, async () => {
    const result = await supabase.from('activity').select(ACTIVITY_COLUMNS).order('created_at', { ascending: false }).limit(50);
    return { data: (result.data || []).map(mapActivityFromDB), error: result.error };
  });
}

async function persistProductImages(serializedImages: string, userId: string, productId: string) {
  const images = getProductImages(serializedImages);
  if (!images.some((image) => image.startsWith('data:image/'))) return serializedImages;

  const storedImages = await Promise.all(images.map(async (image, index) => {
    if (!image.startsWith('data:image/')) return image;

    try {
      const blob = dataUrlToBlob(image);
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
      const uniqueId = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
      const path = `${userId}/${productId}/${uniqueId}.${extension}`;
      const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, blob, {
        cacheControl: '31536000',
        contentType: blob.type,
        upsert: false
      });
      if (error) return image;

      return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl || image;
    } catch {
      return image;
    }
  }));

  return serializeProductImages(storedImages);
}

function dataUrlToBlob(dataUrl: string) {
  const [metadata, encoded = ''] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] || 'image/webp';
  const bytes = atob(encoded);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index);
  return new Blob([buffer], { type: mimeType });
}

export function useDigitQuoStore({
  loadWorkspace = true,
  loadProducts,
  loadSales,
  loadClaims,
  loadActivity,
  productImages = 'all',
  productId
}: StoreOptions = {}) {
  const hasScopedResources = [loadProducts, loadSales, loadClaims, loadActivity].some((value) => value !== undefined);
  const shouldLoadProducts = loadWorkspace && (loadProducts ?? !hasScopedResources);
  const shouldLoadSales = loadWorkspace && (loadSales ?? !hasScopedResources);
  const shouldLoadClaims = loadWorkspace && (loadClaims ?? !hasScopedResources);
  const shouldLoadActivity = loadWorkspace && (loadActivity ?? !hasScopedResources);
  const router = useRouter();
  const [products, setProductsState] = useState<Product[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [activity, setActivityState] = useState<Activity[]>([]);
  const [claims, setClaimsState] = useState<Claim[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function loadData() {
      if (!isSupabaseConfigured) {
        if (mounted) {
          showToast('Supabase is not configured. Add the required environment variables before deploying.', 'error');
          setLoading(false);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      if (mounted) setUser(currentUser);

      if (!currentUser) {
        if (mounted) setLoading(false);
        return;
      }

      let profileError: unknown = null;
      const profileRequest = ensureUserProfile(currentUser).catch((error) => {
        profileError = error;
        return null;
      });
      const [currentProfile, productsRes, salesRes, claimsRes, activityRes] = await Promise.all([
        profileRequest,
        shouldLoadProducts ? loadProductsResource(currentUser.id, productImages, productId) : emptyResource<Product>(),
        shouldLoadSales ? loadSalesResource(currentUser.id) : emptyResource<Sale>(),
        shouldLoadClaims ? loadClaimsResource(currentUser.id) : emptyResource<Claim>(),
        shouldLoadActivity ? loadActivityResource(currentUser.id) : emptyResource<Activity>()
      ]);

      if (mounted) {
        if (currentProfile) setProfile(currentProfile);
        if (profileError) showToast(profileError instanceof Error ? profileError.message : 'Could not prepare your profile.', 'error');
        const loadError = productsRes.error || salesRes.error || claimsRes.error || activityRes.error;
        if (loadError) showToast(loadError.message || 'Could not load workspace data.', 'error');
        if (shouldLoadProducts) setProductsState(productsRes.data);
        if (shouldLoadSales) setSalesState(salesRes.data);
        if (shouldLoadClaims) setClaimsState(claimsRes.data);
        if (shouldLoadActivity) setActivityState(activityRes.data);
        setLoading(false);
      }
    }
    
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user || null);
        if (session?.user) {
          try {
            const data = await ensureUserProfile(session.user);
            setProfile(data);
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Could not prepare your profile.', 'error');
          }
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [productId, productImages, shouldLoadActivity, shouldLoadClaims, shouldLoadProducts, shouldLoadSales]);

  const showToast = (message: string, type: 'success' | 'error' | '' = '') => {
    const toast: Toast = { id: `toast_${Date.now()}_${Math.random()}`, message, type };
    setToasts((items) => [...items, toast]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3600);
  };

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    const id = `prd_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const image = user ? await persistProductImages(product.image || '', user.id, id) : product.image;
    const newProduct = {
      id,
      ...product,
      image,
      createdAt: new Date().toISOString()
    };
    setProductsState(prev => [newProduct, ...prev]);
    let { error } = await supabase.from('products').insert(mapProductToDB(newProduct));
    if (error && isMissingProductOptionSchema(error)) {
      if (hasProductOptions(newProduct)) {
        setProductsState(prev => prev.filter(p => p.id !== newProduct.id));
        throw new Error(PRODUCT_OPTIONS_MIGRATION_MESSAGE);
      }
      ({ error } = await supabase.from('products').insert(mapProductToDB(newProduct, false)));
    }
    if (error) {
      setProductsState(prev => prev.filter(p => p.id !== newProduct.id));
      throw error;
    }
    invalidateWorkspaceResource(user?.id, 'products');
  };

  const updateProduct = async (product: Product) => {
    const storedProduct = user
      ? { ...product, image: await persistProductImages(product.image || '', user.id, product.id) }
      : product;
    const previous = products;
    setProductsState(prev => prev.map(p => p.id === storedProduct.id ? storedProduct : p));
    let { error } = await supabase.from('products').update(mapProductToDB(storedProduct)).eq('id', storedProduct.id);
    if (error && isMissingProductOptionSchema(error)) {
      if (hasProductOptions(storedProduct)) {
        setProductsState(previous);
        throw new Error(PRODUCT_OPTIONS_MIGRATION_MESSAGE);
      }
      ({ error } = await supabase.from('products').update(mapProductToDB(storedProduct, false)).eq('id', storedProduct.id));
    }
    if (error) {
      setProductsState(previous);
      throw error;
    }
    invalidateWorkspaceResource(user?.id, 'products');
  };

  const deleteProduct = async (id: string) => {
    const previous = products;
    setProductsState(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setProductsState(previous);
      throw error;
    }
    invalidateWorkspaceResource(user?.id, 'products');
  };

  const addSale = async (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    const newSale = {
      id: `sale_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ...sale,
      createdAt: new Date().toISOString()
    };
    setSalesState(prev => [newSale, ...prev]);
    const { error } = await supabase.from('sales').insert(mapSaleToDB(newSale));
    if (error) {
      setSalesState(prev => prev.filter(s => s.id !== newSale.id));
      throw error;
    }
    invalidateWorkspaceResource(user?.id, 'sales');
  };

  const placeOrder = async (order: PlaceOrderInput) => {
    const { data, error } = await supabase.rpc('place_order', {
      p_order_id: `ord_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      p_product_id: order.productId,
      p_customer: order.customer,
      p_customer_phone: order.customerPhone,
      p_customer_address: order.customerAddress,
      p_order_notes: order.orderNotes,
      p_selected_option_label: order.selectedOptionLabel,
      p_selected_option_value: order.selectedOptionValue,
      p_quantity: order.quantity
    });

    if (error) throw error;

    const newSale = mapSaleFromDB(data);
    setSalesState(prev => [newSale, ...prev]);
    setProductsState(prev => prev.map((product) => product.id === newSale.productId ? { ...product, stock: Math.max(0, product.stock - newSale.quantity) } : product));
    invalidateWorkspaceResource(user?.id, 'sales');
    invalidateWorkspaceResource(user?.id, 'products');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        await fetch('/api/orders/notify-seller', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ orderId: newSale.id })
        });
      }
    } catch {
      // The order is already saved; seller email notification is best-effort.
    }

    return newSale;
  };

  const completePaidOrder = async ({ order, payment }: CompletePaidOrderInput) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('You need to be signed in to complete payment.');
    }

    const response = await fetch('/api/payments/verify-and-place-order', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ order, payment })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || 'Payment succeeded, but the order could not be completed.');
    }

    const newSale = mapSaleFromDB(result.sale);
    setSalesState(prev => [newSale, ...prev]);
    setProductsState(prev => prev.map((product) => product.id === newSale.productId ? { ...product, stock: Math.max(0, product.stock - newSale.quantity) } : product));
    invalidateWorkspaceResource(user?.id, 'sales');
    invalidateWorkspaceResource(user?.id, 'products');

    return newSale;
  };

  const addClaim = async (claim: Omit<Claim, 'id' | 'createdAt' | 'status'>) => {
    const newClaim = {
      id: `claim_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ...claim,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    setClaimsState(prev => [newClaim, ...prev]);
    const { error } = await supabase.from('claims').insert(mapClaimToDB(newClaim));
    if (error) {
      setClaimsState(prev => prev.filter(c => c.id !== newClaim.id));
      throw error;
    }
    invalidateWorkspaceResource(user?.id, 'claims');
    return newClaim;
  };

  const updateClaimStatus = async (id: string, status: 'pending' | 'paid') => {
    const previous = claims;
    setClaimsState(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    const { error } = await supabase.from('claims').update({ status }).eq('id', id);
    if (error) {
      setClaimsState(previous);
      throw error;
    }
    invalidateWorkspaceResource(user?.id, 'claims');
  };

  const updateProfile = async (values: Partial<Profile>) => {
    if (!user) throw new Error('You need to be signed in to update your profile.');
    const { data, error } = await supabase
      .from('profiles')
      .update(values)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) throw error;
    const updatedProfile = data as Profile;
    cacheUserProfile(updatedProfile);
    setProfile(updatedProfile);
    return updatedProfile;
  };

  const addActivity = async (type: 'sale' | 'product', message: string) => {
    const newAct = {
      id: `act_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type,
      message,
      createdAt: new Date().toISOString()
    };
    setActivityState(prev => [newAct, ...prev].slice(0, 100));
    const { error } = await supabase.from('activity').insert(mapActivityToDB(newAct));
    if (error) {
      setActivityState(prev => prev.filter(a => a.id !== newAct.id));
      throw error;
    }
    invalidateWorkspaceResource(user?.id, 'activity');
  };

  const logout = async () => {
    clearUserWorkspaceCache(user?.id);
    if (user?.id) clearCachedUserProfile(user.id);
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Helper getters to replace static constants
  const currentSellerName = profile?.role === 'seller' ? profile.business_name || profile.display_name || user?.user_metadata?.full_name || profile.email : 'My Store';
  const currentBrokerName = profile?.role === 'broker' ? profile.display_name || user?.user_metadata?.full_name || profile.email : 'Partner Broker';

  return { 
    products, sales, activity, claims, toasts, 
    user, profile, loading,
    currentSellerName, currentBrokerName,
    addProduct, updateProduct, deleteProduct,
    completePaidOrder, addClaim, updateClaimStatus, addActivity, updateProfile,
    showToast, logout
  };
}

// Mapping helpers to align TypeScript frontend with Postgres snake_case tables
function mapProductToDB(p: Product, includeOptions = true) {
  const row: Record<string, unknown> = {
    id: p.id,
    name: p.name,
    category: p.category,
    mrp: p.mrp,
    commission: p.commission,
    price: p.mrp,
    stock: p.stock,
    seller: p.seller,
    image: p.image,
    description: p.description,
    created_at: p.createdAt
  };
  if (includeOptions) {
    row.option_label = p.optionLabel || '';
    row.option_values = p.optionValues || [];
  }
  return row;
}

const PRODUCT_OPTIONS_MIGRATION_MESSAGE = 'Product choices are not enabled in Supabase yet. Run the latest database.sql in the Supabase SQL Editor, then try again.';

function hasProductOptions(product: Product) {
  return Boolean(product.optionLabel?.trim() || product.optionValues?.length);
}

function isMissingProductOptionSchema(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return ['42703', 'pgrst204'].includes(String(error?.code || '').toLowerCase())
    && (message.includes('option_label') || message.includes('option_values'));
}
function mapProductFromDB(p: any): Product {
  const mrp = Number(p.mrp ?? p.price ?? 0);
  const legacySellingPrice = Number(p.price ?? mrp);
  const commission = Number(p.commission ?? Math.max(0, mrp - legacySellingPrice));

  return {
    id: p.id,
    name: p.name,
    category: p.category,
    mrp,
    commission,
    stock: p.stock,
    seller: p.seller,
    image: p.image,
    description: p.description,
    optionLabel: p.option_label || '',
    optionValues: Array.isArray(p.option_values) ? p.option_values : [],
    createdAt: p.created_at
  };
}

function mapSaleToDB(s: Sale) {
  return {
    id: s.id,
    product_id: s.productId,
    product_name: s.productName,
    seller: s.seller,
    customer: s.customer,
    customer_phone: s.customerPhone,
    customer_address: s.customerAddress,
    order_notes: s.orderNotes,
    selected_option_label: s.selectedOptionLabel || '',
    selected_option_value: s.selectedOptionValue || '',
    quantity: s.quantity,
    unit_price: s.unitPrice,
    total: s.total,
    points: s.points,
    broker: s.broker,
    razorpay_order_id: s.razorpayOrderId || null,
    razorpay_payment_id: s.razorpayPaymentId || null,
    created_at: s.createdAt
  };
}
function mapSaleFromDB(s: any): Sale {
  return {
    id: s.id,
    productId: s.product_id,
    productName: s.product_name,
    seller: s.seller,
    customer: s.customer,
    customerPhone: s.customer_phone || '',
    customerAddress: s.customer_address || '',
    orderNotes: s.order_notes || '',
    selectedOptionLabel: s.selected_option_label || '',
    selectedOptionValue: s.selected_option_value || '',
    quantity: s.quantity,
    unitPrice: s.unit_price,
    total: s.total,
    points: s.points,
    broker: s.broker,
    razorpayOrderId: s.razorpay_order_id || null,
    razorpayPaymentId: s.razorpay_payment_id || null,
    createdAt: s.created_at
  };
}

function mapClaimToDB(c: Claim) {
  return {
    id: c.id,
    broker: c.broker,
    points: c.points,
    payout_account_name: c.payoutAccountName || null,
    payout_bank_name: c.payoutBankName || null,
    payout_account_number: c.payoutAccountNumber || null,
    payout_ifsc: c.payoutIfsc || null,
    payout_upi: c.payoutUpi || null,
    status: c.status,
    created_at: c.createdAt
  };
}
function mapClaimFromDB(c: any): Claim {
  return {
    id: c.id,
    broker: c.broker,
    points: c.points,
    payoutAccountName: c.payout_account_name || '',
    payoutBankName: c.payout_bank_name || '',
    payoutAccountNumber: c.payout_account_number || '',
    payoutIfsc: c.payout_ifsc || '',
    payoutUpi: c.payout_upi || '',
    status: c.status as any,
    createdAt: c.created_at
  };
}

function mapActivityToDB(a: Activity) {
  return { id: a.id, type: a.type, message: a.message, created_at: a.createdAt };
}
function mapActivityFromDB(a: any): Activity {
  return { id: a.id, type: a.type as any, message: a.message, createdAt: a.created_at };
}
