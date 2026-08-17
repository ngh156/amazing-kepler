import { api } from '../lib/api';
import { Market, Ticker24h, Trade } from '../types/backend';

export const marketService = {
  getMarkets: async (): Promise<{ markets: Market[] }> => {
    const res = await api.get('/markets');
    return res.data;
  },

  getMarketDetail: async (id: string): Promise<{ market: Market }> => {
    const res = await api.get(`/markets/${id}`);
    return res.data;
  },

  getKlines: async (symbol: string, interval: string = '1m', limit: number = 300): Promise<{ bars: any[] }> => {
    const res = await api.get(`/marketdata/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    return res.data;
  },

  getRecentTrades: async (symbol: string): Promise<{ trades: Trade[] }> => {
    const res = await api.get(`/marketdata/trades/${symbol}`);
    return res.data;
  },

  getTickers: async (): Promise<{ tickers: Ticker24h[] }> => {
    const res = await api.get('/marketdata/tickers');
    return res.data;
  },
};
