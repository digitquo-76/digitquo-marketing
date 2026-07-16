export interface ProductOptionGroup {
  label: string;
  values: string[];
}

export interface SelectedProductOption {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  mrp: number;
  commission: number;
  stock: number;
  seller: string;
  image: string;
  description: string;
  optionGroups: ProductOptionGroup[];
  /** @deprecated Kept as the first choice group for older database deployments. */
  optionLabel: string;
  /** @deprecated Kept as the first choice group for older database deployments. */
  optionValues: string[];
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
  selectedOptions: SelectedProductOption[];
  /** @deprecated Kept as the first selection for older order records. */
  selectedOptionLabel: string;
  /** @deprecated Kept as the first selection for older order records. */
  selectedOptionValue: string;
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
  payoutAccountName?: string;
  payoutBankName?: string;
  payoutAccountNumber?: string;
  payoutIfsc?: string;
  payoutUpi?: string;
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
