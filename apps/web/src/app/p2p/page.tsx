'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { ShieldCheck, Repeat, Clock, AlertCircle } from 'lucide-react';

export default function P2PPage() {
  const { isAuthenticated } = useAuthStore();
  const [p2pTab, setP2pTab] = useState<'SELL' | 'BUY'>('SELL'); // SELL ads = Buyer wants to Buy USDT
  const [ads, setAds] = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [orderMsg, setOrderMsg] = useState('');

  const fetchAds = async () => {
    try {
      const res = await api.get(`/p2p/ads?type=${p2pTab}&assetId=USDT&fiatSymbol=VND`);
      setAds(res.data.ads || []);
    } catch (e) {
      console.error('Failed to fetch P2P ads:', e);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [p2pTab]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setOrderMsg('Please log in to initiate P2P orders.');
      return;
    }
    try {
      const res = await api.post('/p2p/orders', {
        adId: selectedAd.id,
        cryptoAmount: amount,
      });
      setOrderMsg(`P2P Order #${res.data.order.id.substring(0, 8)} created! Crypto locked in escrow.`);
      setSelectedAd(null);
      setAmount('');
    } catch (err: any) {
      setOrderMsg(`Order Error: ${err.response?.data?.message || 'Failed to create P2P order'}`);
    }
  };

  return (
    <div className="flex-1 bg-[#12161c] p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#181a20] to-[#1e2329] p-6 rounded-xl border border-[#2b313a] flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
            <Repeat className="w-6 h-6 text-yellow-400" />
            <span>P2P Crypto Marketplace</span>
          </h1>
          <p className="text-sm text-gray-400">
            Trade USDT with local fiat currencies (VND, USD) using guaranteed escrow balance locks.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>100% Escrow Protection Active</span>
        </div>
      </div>

      {orderMsg && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs rounded-lg font-semibold">
          {orderMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-4 border-b border-[#2b313a] pb-2">
        <button
          onClick={() => setP2pTab('SELL')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition ${
            p2pTab === 'SELL' ? 'bg-[#0ecb81] text-black shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          Buy USDT
        </button>
        <button
          onClick={() => setP2pTab('BUY')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition ${
            p2pTab === 'BUY' ? 'bg-[#f6465d] text-white shadow-lg shadow-red-500/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          Sell USDT
        </button>
      </div>

      {/* Ads List */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-[#1e2329] text-gray-400 border-b border-[#2b313a] text-xs">
            <tr>
              <th className="py-3.5 px-6">Merchant</th>
              <th className="py-3.5 px-6">Price</th>
              <th className="py-3.5 px-6">Available / Limit</th>
              <th className="py-3.5 px-6">Payment Methods</th>
              <th className="py-3.5 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b313a]/50 text-gray-200">
            {ads.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No active P2P advertisements found for this currency.
                </td>
              </tr>
            ) : (
              ads.map((ad) => (
                <tr key={ad.id} className="hover:bg-[#2b313a]/30 transition">
                  <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-xs border border-yellow-500/30">
                      {ad.merchant.nickname?.[0] || 'M'}
                    </div>
                    <div>
                      <div>{ad.merchant.nickname || ad.merchant.email.split('@')[0]}</div>
                      <div className="text-[10px] text-emerald-400 font-mono">99.8% Completion (1,240 trades)</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-white text-base">
                    {parseFloat(ad.price).toLocaleString()} VND
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-gray-300">
                    <div>Avail: {parseFloat(ad.availableQuantity).toFixed(2)} USDT</div>
                    <div className="text-gray-500">
                      Limit: {parseFloat(ad.minLimit).toLocaleString()} - {parseFloat(ad.maxLimit).toLocaleString()} VND
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-[10px] px-2 py-0.5 rounded font-mono">
                      BANK TRANSFER / VIETQR
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setSelectedAd(ad)}
                      className={`px-5 py-2 rounded-lg font-bold text-xs transition shadow-md ${
                        p2pTab === 'SELL' ? 'bg-[#0ecb81] text-black hover:bg-[#0ba368]' : 'bg-[#f6465d] text-white hover:bg-[#d93a4f]'
                      }`}
                    >
                      {p2pTab === 'SELL' ? 'Buy USDT' : 'Sell USDT'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Place Order Modal */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2329] border border-[#2b313a] rounded-xl p-6 w-full max-w-md relative">
            <button onClick={() => setSelectedAd(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {p2pTab === 'SELL' ? 'Buy USDT' : 'Sell USDT'} from {selectedAd.merchant.nickname || 'Merchant'}
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">Unit Price: {parseFloat(selectedAd.price).toLocaleString()} VND</p>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Crypto Amount (USDT)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              {amount && (
                <div className="bg-[#14181d] p-3 rounded-lg border border-[#2b313a] text-xs font-mono flex items-center justify-between text-yellow-400">
                  <span>Total Fiat Payable:</span>
                  <span className="font-bold text-sm">
                    {(parseFloat(amount || '0') * parseFloat(selectedAd.price)).toLocaleString()} VND
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg text-xs transition shadow-lg shadow-yellow-500/10"
              >
                Confirm Order & Lock Escrow
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
