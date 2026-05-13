import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const { data: user } = await api.get('/users/me');
    set({ user });
  },

  register: async (email, password) => {
    const { data } = await api.post('/auth/register', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const { data: user } = await api.get('/users/me');
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null });
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const { data } = await api.get('/users/me');
      set({ user: data });
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));
