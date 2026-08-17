import { api } from '../lib/api';
import { P2PAdvertisement, P2POrder } from '../types/backend';

export const p2pService = {
  getAds: async (type: 'BUY' | 'SELL', assetId: string = 'USDT', fiatSymbol: string = 'VND'): Promise<{ ads: P2PAdvertisement[] }> => {
    const res = await api.get(`/p2p/ads?type=${type}&assetId=${assetId}&fiatSymbol=${fiatSymbol}`);
    return res.data;
  },

  createAd: async (data: Partial<P2PAdvertisement>): Promise<{ ad: P2PAdvertisement }> => {
    const res = await api.post('/p2p/ads', data);
    return res.data;
  },

  createOrder: async (adId: string, cryptoAmount: string): Promise<{ order: P2POrder }> => {
    const res = await api.post('/p2p/orders', { adId, cryptoAmount });
    return res.data;
  },

  markPaid: async (orderId: string): Promise<{ order: P2POrder }> => {
    const res = await api.post(`/p2p/orders/${orderId}/mark-paid`);
    return res.data;
  },

  releaseCrypto: async (orderId: string): Promise<{ message: string }> => {
    const res = await api.post(`/p2p/orders/${orderId}/release`);
    return res.data;
  },
};
