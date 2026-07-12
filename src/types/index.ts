export interface Product {
  id: string;
  name: string;
  category: string;
  mrp?: number;
  price: number;
  stock: number;
  createdAt: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | '';
}
