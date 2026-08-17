'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check } from 'lucide-react';

export default function WalletPage() {
  const { isAuthenticated } = useAuthStore();
  const [balances, setBalances] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [depositData, setDepositData] = useState<any>(null);

  const [withdrawAsset, setWithdrawAsset] = useState('USDT');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');

  const fetchBalances = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/wallets/balances');
      setBalances(res.data.balances || []);
    } catch (e) {
      console.error('Failed to fetch balances:', e);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [isAuthenticated]);

  const handleDepositModal = async (assetId: string) => {
    setSelectedAsset(assetId);
    try {
      const res = await api.get(`/wallets/deposit-address?networkId=ETH_SEPOLIA`);
      setDepositData(res.data);
    } catch (e) {
      console.error('Failed to fetch deposit address:', e);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawMsg('');
    try {
      await api.post('/wallets/withdraw', {
        assetId: withdrawAsset,
        networkId: 'ETH_SEPOLIA',
        toAddress: withdrawAddress,
        amount: withdrawAmount,
      });
      setWithdrawMsg('Withdrawal request submitted successfully! Pending risk review.');
      setWithdrawAmount('');
      setWithdrawAddress('');
      fetchBalances();
    } catch (err: any) {
      setWithdrawMsg(`Error: ${err.response?.data?.message || 'Withdrawal failed'}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 bg-[#12161c] p-12 text-center text-gray-400">
        Please log in to view your asset balances and wallet operations.
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#12161c] p-6 max-w-6xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
          <Wallet className="w-6 h-6 text-yellow-400" />
          <span>Assets & Spot Wallet</span>
        </h1>
        <p className="text-sm text-gray-400">
          Manage your simulated crypto balances, Sepolia testnet deposit addresses, and double-entry ledger funds.
        </p>
      </div>

      {/* Balances Grid */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#2b313a] text-sm font-bold text-white">Spot Balances</div>
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-[#1e2329] text-gray-400 border-b border-[#2b313a] text-xs">
            <tr>
              <th className="py-3.5 px-6">Asset</th>
              <th className="py-3.5 px-6">Total Balance</th>
              <th className="py-3.5 px-6">Available</th>
              <th className="py-3.5 px-6">Locked in Orders</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b313a]/50 text-gray-200">
            {balances.map((b) => (
              <tr key={b.asset.id} className="hover:bg-[#2b313a]/30 transition">
                <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-mono text-xs">
                    {b.asset.id.substring(0, 3)}
                  </span>
                  <div>
                    <div>{b.asset.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{b.asset.id}</div>
                  </div>
                </td>
                <td className="py-4 px-6 font-mono font-bold text-white">{b.total}</td>
                <td className="py-4 px-6 font-mono text-emerald-400">{b.available}</td>
                <td className="py-4 px-6 font-mono text-gray-400">{b.locked}</td>
                <td className="py-4 px-6 text-right space-x-2">
                  <button
                    onClick={() => handleDepositModal(b.asset.id)}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-emerald-500/30"
                  >
                    Deposit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
          <ArrowUpRight className="w-5 h-5 text-red-400" />
          <span>Withdraw Crypto (Sepolia Testnet)</span>
        </h2>

        {withdrawMsg && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs rounded-lg font-semibold">
            {withdrawMsg}
          </div>
        )}

        <form onSubmit={handleWithdrawSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Asset</label>
            <select
              value={withdrawAsset}
              onChange={(e) => setWithdrawAsset(e.target.value)}
              className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="USDT">USDT (Tether)</option>
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Destination Address</label>
            <input
              type="text"
              required
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Amount</label>
            <input
              type="number"
              step="0.0001"
              required
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="100.0"
              className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2.5 rounded-lg text-xs transition shadow-md shadow-yellow-500/10"
            >
              Submit Withdrawal
            </button>
          </div>
        </form>
      </div>

      {/* Deposit Modal */}
      {selectedAsset && depositData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2329] border border-[#2b313a] rounded-xl p-6 w-full max-w-md relative text-center">
            <button
              onClick={() => setSelectedAsset(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Deposit {selectedAsset}</h3>
            <p className="text-xs text-gray-400 mb-6">Network: Ethereum Sepolia Testnet</p>

            <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-lg">
              <img src={depositData.qrCodeUrl} alt="Deposit QR Code" className="w-40 h-40" />
            </div>

            <div className="bg-[#14181d] p-3 rounded-lg border border-[#2b313a] text-xs font-mono text-gray-300 break-all mb-4 flex items-center justify-between">
              <span>{depositData.address}</span>
            </div>

            <p className="text-[11px] text-yellow-400 bg-yellow-500/10 p-2.5 rounded border border-yellow-500/30">
              Send only Sepolia testnet assets to this address. Credits apply automatically upon 12 block confirmations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
