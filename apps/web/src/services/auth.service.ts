import { api } from '../lib/api';
import { User } from '../types/backend';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
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
