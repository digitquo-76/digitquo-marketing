export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  seller: string;
  image: string;
  description: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  seller: string;
  customer: string;
  quantity: number;
  unitPrice: number;
  total: number;
  broker: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'sale' | 'product';
  message: string;
  createdAt: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | '';
}
