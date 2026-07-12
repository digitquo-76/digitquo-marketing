'use client';

import { useState } from 'react';
import { Product, Sale, Activity, Toast } from '../types';

export const DQ_KEYS = {
  products: 'digitquo_products_v1',
  sales: 'digitquo_sales_v1',
  activity: 'digitquo_activity_v1'
};

export const CURRENT_SELLER = 'My Store';
export const CURRENT_BROKER = 'Partner Broker';

function readStore<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function writeStore<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function createProduct(name: string, category: string, price: number, stock: number, seller: string, image = '', description = ''): Product {
  return {
    id: `prd_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    category,
    price: Number(price),
    stock: Number(stock),
    seller,
    image,
    description,
    createdAt: new Date().toISOString()
  };
}

function createSale(product: Product, customer: string, quantity: number, broker: string): Sale {
  return {
    id: `sale_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    productName: product.name,
    seller: product.seller,
    customer,
    quantity: Number(quantity),
    unitPrice: Number(product.price),
    total: Number(product.price) * Number(quantity),
    broker,
    createdAt: new Date().toISOString()
  };
}

function createActivity(type: 'sale' | 'product', message: string): Activity {
  return { id: `act_${Date.now()}_${Math.random().toString(16).slice(2)}`, type, message, createdAt: new Date().toISOString() };
}

export function seedDemoData() {
  if (typeof window === 'undefined') return;
  
  if (!localStorage.getItem(DQ_KEYS.products)) {
    writeStore(DQ_KEYS.products, [
      createProduct('Premium Cotton Shirts', 'Apparel', 899, 42, 'My Store', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80'),
      createProduct('Classic Leather Wallet', 'Accessories', 649, 18, 'My Store', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=700&q=80'),
      createProduct('Ceramic Dinner Set', 'Home & Living', 1499, 25, 'Sharma Homeware', 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=700&q=80'),
      createProduct('Wireless Earbuds', 'Electronics', 1299, 31, 'Tech Corner', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=700&q=80'),
      createProduct('Handcrafted Tote Bag', 'Accessories', 749, 12, 'Craft & Co.', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=700&q=80'),
      createProduct('Organic Spice Box', 'Food', 499, 55, 'Rajasthan Foods', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=700&q=80')
    ]);
  }

  if (!localStorage.getItem(DQ_KEYS.sales)) {
    const products = readStore<Product>(DQ_KEYS.products);
    if (products.length >= 3) {
      writeStore(DQ_KEYS.sales, [
        createSale(products[0], 'Anita Retail', 3, 'Market Connect'),
        createSale(products[2], 'Home Style Store', 2, 'Northside Broker')
      ]);
    }
  }

  if (!localStorage.getItem(DQ_KEYS.activity)) {
    writeStore(DQ_KEYS.activity, [
      createActivity('sale', 'Market Connect recorded a sale of 3 × Premium Cotton Shirts.'),
      createActivity('product', 'My Store published Classic Leather Wallet.'),
      createActivity('product', 'Tech Corner updated stock for Wireless Earbuds.'),
      createActivity('sale', 'Northside Broker recorded a ₹2,998 customer sale.')
    ]);
  }
}

export function useDigitQuoStore() {
  const [products, setProductsState] = useState<Product[]>(() => {
    seedDemoData();
    return readStore<Product>(DQ_KEYS.products);
  });
  const [sales, setSalesState] = useState<Sale[]>(() => readStore<Sale>(DQ_KEYS.sales));
  const [activity, setActivityState] = useState<Activity[]>(() => readStore<Activity>(DQ_KEYS.activity));
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | '' = '') => {
    const toast: Toast = { id: `toast_${Date.now()}_${Math.random()}`, message, type };
    setToasts((items) => [...items, toast]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3600);
  };

  const setProducts = (items: Product[]) => {
    writeStore(DQ_KEYS.products, items);
    setProductsState(items);
  };

  const setSales = (items: Sale[]) => {
    writeStore(DQ_KEYS.sales, items);
    setSalesState(items);
  };

  const setActivity = (items: Activity[]) => {
    writeStore(DQ_KEYS.activity, items);
    setActivityState(items);
  };

  const addActivity = (type: 'sale' | 'product', message: string) => {
    const next = [createActivity(type, message), ...readStore<Activity>(DQ_KEYS.activity)].slice(0, 100);
    writeStore(DQ_KEYS.activity, next);
    setActivityState(next);
  };

  const resetDemoData = () => {
    Object.values(DQ_KEYS).forEach((key) => localStorage.removeItem(key));
    seedDemoData();
    setProductsState(readStore<Product>(DQ_KEYS.products));
    setSalesState(readStore<Sale>(DQ_KEYS.sales));
    setActivityState(readStore<Activity>(DQ_KEYS.activity));
  };

  return { products, sales, activity, toasts, setProducts, setSales, setActivity, addActivity, resetDemoData, showToast };
}

export { createProduct, createSale };
