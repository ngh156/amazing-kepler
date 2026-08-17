import { api } from '../lib/api';
import { User, AuditLog, Market } from '../types/backend';

export const adminService = {
  getUsers: async (): Promise<{ users: User[] }> => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  toggleFreezeUser: async (userId: string, isFrozen: boolean): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/admin/users/${userId}/freeze`, { isFrozen });
    return res.data;
  },

  createMarket: async (data: {
    symbol: string;
    baseAssetId: string;
    quoteAssetId: string;
  }): Promise<{ market: Market }> => {
    const res = await api.post('/admin/markets', data);
    return res.data;
  },

  getAuditLogs: async (): Promise<{ logs: AuditLog[] }> => {
    const res = await api.get('/admin/audit-logs');
    return res.data;
  },
};
