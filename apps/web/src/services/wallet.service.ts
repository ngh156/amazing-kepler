import { api } from '../lib/api';
import { BalanceSummary } from '../types/backend';

export const walletService = {
  getBalances: async (): Promise<{ balances: BalanceSummary[] }> => {
    const res = await api.get('/wallets/balances');
    return res.data;
  },

  getDepositAddress: async (networkId: string = 'ETH_SEPOLIA'): Promise<{ address: string; networkId: string; qrCodeUrl: string }> => {
    const res = await api.get(`/wallets/deposit-address?networkId=${networkId}`);
    return res.data;
  },

  withdraw: async (data: {
    assetId: string;
    networkId: string;
    toAddress: string;
    amount: string;
  }): Promise<{ message: string }> => {
    const res = await api.post('/wallets/withdraw', data);
    return res.data;
  },
};
