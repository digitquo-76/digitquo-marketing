'use client';

import { useState, useEffect } from 'react';
import { Product, Sale, Activity, Toast, Claim } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  role: 'seller' | 'broker' | 'admin';
  email: string;
  display_name?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  market?: string | null;
  onboarding_complete?: boolean | null;
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
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        currentProfile = data;
        if (mounted) setProfile(currentProfile);
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
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          setProfile(data);
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
    addSale, addClaim, updateClaimStatus, addActivity, updateProfile,
    showToast, logout
  };
}

// Mapping helpers to align TypeScript frontend with Postgres snake_case tables
function mapProductToDB(p: Product) {
  return { id: p.id, name: p.name, category: p.category, mrp: p.mrp, price: p.price, stock: p.stock, seller: p.seller, image: p.image, description: p.description, created_at: p.createdAt };
}
function mapProductFromDB(p: any): Product {
  return { id: p.id, name: p.name, category: p.category, mrp: p.mrp, price: p.price, stock: p.stock, seller: p.seller, image: p.image, description: p.description, createdAt: p.created_at };
}

function mapSaleToDB(s: Sale) {
  return { id: s.id, product_id: s.productId, product_name: s.productName, seller: s.seller, customer: s.customer, quantity: s.quantity, unit_price: s.unitPrice, total: s.total, points: s.points, broker: s.broker, created_at: s.createdAt };
}
function mapSaleFromDB(s: any): Sale {
  return { id: s.id, productId: s.product_id, productName: s.product_name, seller: s.seller, customer: s.customer, quantity: s.quantity, unitPrice: s.unit_price, total: s.total, points: s.points, broker: s.broker, createdAt: s.created_at };
}

function mapClaimToDB(c: Claim) {
  return { id: c.id, broker: c.broker, points: c.points, status: c.status, created_at: c.createdAt };
}
function mapClaimFromDB(c: any): Claim {
  return { id: c.id, broker: c.broker, points: c.points, status: c.status as any, createdAt: c.created_at };
}

function mapActivityToDB(a: Activity) {
  return { id: a.id, type: a.type, message: a.message, created_at: a.createdAt };
}
function mapActivityFromDB(a: any): Activity {
  return { id: a.id, type: a.type as any, message: a.message, createdAt: a.created_at };
}
