import { api } from '../lib/api';
import { Order, OrderBookDepth } from '../types/backend';

export const tradingService = {
  placeOrder: async (data: {
    marketId: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET';
    price: string;
    quantity: string;
  }): Promise<{ order: Order; tradesExecuted: number }> => {
    const res = await api.post('/orders', data);
    return res.data;
  },

  cancelOrder: async (orderId: string): Promise<{ message: string }> => {
    const res = await api.post(`/orders/${orderId}/cancel`);
    return res.data;
  },

  getOpenOrders: async (): Promise<{ orders: Order[] }> => {
    const res = await api.get('/orders/open');
    return res.data;
  },

  getOrderHistory: async (): Promise<{ orders: Order[] }> => {
    const res = await api.get('/orders/history');
    return res.data;
  },

  getDepth: async (marketId: string): Promise<{ depth: OrderBookDepth }> => {
    const res = await api.get(`/depth/${marketId}`);
    return res.data;
  },
};
