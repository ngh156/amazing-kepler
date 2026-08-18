import { api } from '../lib/api';
import { User } from '../types/backend';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RequestOtpResponse {
  success: boolean;
  requireOtp: boolean;
  email: string;
  message: string;
  demoOtpCode?: string;
}

export const authService = {
  requestOtp: async (email: string, password?: string, action: 'login' | 'register' = 'login'): Promise<RequestOtpResponse> => {
    const res = await api.post('/auth/request-otp', { email, password, action });
    return res.data;
  },

  verifyOtp: async (email: string, otpCode: string, password?: string, nickname?: string, action: 'login' | 'register' = 'login'): Promise<LoginResponse> => {
    const res = await api.post('/auth/verify-otp', { email, otpCode, password, nickname, action });
    return res.data;
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  register: async (email: string, password: string, nickname?: string): Promise<LoginResponse> => {
    const res = await api.post('/auth/register', { email, password, nickname });
    return res.data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

