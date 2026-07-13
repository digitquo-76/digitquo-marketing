export interface Product {
  id: string;
  name: string;
  category: string;
  mrp?: number;
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
  customerPhone: string;
  customerAddress: string;
  orderNotes: string;
  quantity: number;
  unitPrice: number;
  total: number;
  points: number;
  broker: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string;
}

export interface Claim {
  id: string;
  broker: string;
  points: number;
  status: 'pending' | 'paid';
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
