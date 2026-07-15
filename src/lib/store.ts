'use client';

import { useState, useEffect } from 'react';
import { Product, Sale, Activity, Toast, Claim } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ensureUserProfile } from './profile';

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

export function useDigitQuoStore() {
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

      let currentProfile = null;
      if (currentUser) {
        try {
          currentProfile = await ensureUserProfile(currentUser);
          if (mounted) setProfile(currentProfile);
        } catch (error) {
          if (mounted) showToast(error instanceof Error ? error.message : 'Could not prepare your profile.', 'error');
        }
      }

      const [productsRes, salesRes, claimsRes, activityRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('claims').select('*').order('created_at', { ascending: false }),
        supabase.from('activity').select('*').order('created_at', { ascending: false })
      ]);

      if (mounted) {
        const loadError = productsRes.error || salesRes.error || claimsRes.error || activityRes.error;
        if (loadError) showToast(loadError.message || 'Could not load workspace data.', 'error');
        if (productsRes.data) setProductsState(productsRes.data.map(mapProductFromDB));
        if (salesRes.data) setSalesState(salesRes.data.map(mapSaleFromDB));
        if (claimsRes.data) setClaimsState(claimsRes.data.map(mapClaimFromDB));
        if (activityRes.data) setActivityState(activityRes.data.map(mapActivityFromDB));
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
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | '' = '') => {
    const toast: Toast = { id: `toast_${Date.now()}_${Math.random()}`, message, type };
    setToasts((items) => [...items, toast]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3600);
  };

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct = {
      id: `prd_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ...product,
      createdAt: new Date().toISOString()
    };
    setProductsState(prev => [newProduct, ...prev]);
    const { error } = await supabase.from('products').insert(mapProductToDB(newProduct));
    if (error) {
      setProductsState(prev => prev.filter(p => p.id !== newProduct.id));
      throw error;
    }
  };

  const updateProduct = async (product: Product) => {
    const previous = products;
    setProductsState(prev => prev.map(p => p.id === product.id ? product : p));
    const { error } = await supabase.from('products').update(mapProductToDB(product)).eq('id', product.id);
    if (error) {
      setProductsState(previous);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    const previous = products;
    setProductsState(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setProductsState(previous);
      throw error;
    }
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
    setProfile(data);
    return data as Profile;
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
  };

  const logout = async () => {
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
function mapProductToDB(p: Product) {
  return {
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
    option_label: p.optionLabel || '',
    option_values: p.optionValues || [],
    created_at: p.createdAt
  };
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
