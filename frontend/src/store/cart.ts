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

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/cart');
      set({ items: data.items, total: data.total });
    } catch {
      set({ items: [], total: 0 });
    } finally {
      set({ loading: false });
    }
  },

  updateQuantity: async (itemId, quantity) => {
    await api.patch(`/cart/items/${itemId}`, { quantity });
    const { data } = await api.get('/cart');
    set({ items: data.items, total: data.total });
  },

  removeItem: async (itemId) => {
    await api.delete(`/cart/items/${itemId}`);
    const { data } = await api.get('/cart');
    set({ items: data.items, total: data.total });
  },
}));
