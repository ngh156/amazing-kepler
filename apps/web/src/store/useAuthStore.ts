import { create } from 'zustand';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  nickname: string;
  role: string;
  kycLevel: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requestOtp: (email: string, pass?: string, action?: 'login' | 'register') => Promise<any>;
  verifyOtp: (email: string, otpCode: string, pass?: string, nickname?: string, action?: 'login' | 'register') => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, nickname?: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('kepler_token') : null,
  isAuthenticated: false,
  isLoading: true,

  requestOtp: async (email, password, action = 'login') => {
    const res = await api.post('/auth/request-otp', { email, password, action });
    return res.data;
  },

  verifyOtp: async (email, otpCode, password, nickname, action = 'login') => {
    const res = await api.post('/auth/verify-otp', { email, otpCode, password, nickname, action });
    const { token, user } = res.data;
    localStorage.setItem('kepler_token', token);
    set({ token, user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('kepler_token', token);
    set({ token, user, isAuthenticated: true });
  },

  register: async (email, password, nickname) => {
    const res = await api.post('/auth/register', { email, password, nickname });
    const { token, user } = res.data;
    localStorage.setItem('kepler_token', token);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('kepler_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const token = localStorage.getItem('kepler_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const res = await api.get('/auth/me');
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('kepler_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

