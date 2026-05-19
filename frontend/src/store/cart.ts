import { create } from 'zustand';
import { api } from '@/lib/api';

interface CartProduct {
  id: string;
  name: string;
  priceFiat: number;
  stock: number;
  images: string[];
}

export interface CartItem {
  id: string;
  quantity: number;
  product: CartProduct;
}

interface CartState {
  items: CartItem[];
  total: number;
  loading: boolean;
  fetchCart: () => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

interface CartResponse {
  items?: CartItem[];
  total?: number;
}

function normalizeCart(data: CartResponse | null | undefined) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const total =
    typeof data?.total === 'number'
      ? data.total
      : items.reduce((sum, item) => sum + item.product.priceFiat * item.quantity, 0);

  return { items, total };
}

function isAuthError(err: unknown) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<CartResponse>('/cart');
      set(normalizeCart(data));
    } catch (err) {
      if (isAuthError(err)) {
        set({ items: [], total: 0 });
      }
    } finally {
      set({ loading: false });
    }
  },

  updateQuantity: async (itemId, quantity) => {
    await api.patch(`/cart/items/${itemId}`, { quantity });
    const { data } = await api.get<CartResponse>('/cart');
    set(normalizeCart(data));
  },

  removeItem: async (itemId) => {
    await api.delete(`/cart/items/${itemId}`);
    const { data } = await api.get<CartResponse>('/cart');
    set(normalizeCart(data));
  },
}));
