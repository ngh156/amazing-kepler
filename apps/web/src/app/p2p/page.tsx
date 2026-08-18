'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Users, ShieldCheck, ArrowRightLeft, Clock, CheckCircle2, QrCode, Zap, Building2, Copy, Check, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function P2PPage() {
  const { isAuthenticated } = useAuthStore();
  const [p2pTab, setP2PTab] = useState<'BUY' | 'SELL'>('BUY');
  const [ads, setAds] = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [amount, setAmount] = useState('100');
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const fetchAds = async () => {
    try {
      const res = await api.get('/p2p/ads');
      setAds(res.data.ads || []);
    } catch (e) {
      console.error('Failed to fetch P2P ads:', e);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAd) return;
    try {
      const res = await api.post('/p2p/orders', {
        adId: selectedAd.id,
        amount,
      });
      setActiveOrder(res.data.order);
      setSelectedAd(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Create P2P order failed');
    }
  };

  const handleReleaseEscrow = async (orderId: string) => {
    try {
      await api.post(`/p2p/orders/${orderId}/release`);
      alert('Đã giải phóng USDT từ Escrow vào ví của Bên Mua thành công!');
      setActiveOrder(null);
      fetchAds();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Release failed');
    }
  };

  const handleSimulateSepayP2P = async () => {
    if (!activeOrder) return;
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      handleReleaseEscrow(activeOrder.id);
    }, 1500);
  };

  const filteredAds = ads.filter((ad) => (p2pTab === 'BUY' ? ad.type === 'SELL' : ad.type === 'BUY'));

  return (
    <div className="flex-1 bg-[#0b0e11] min-h-screen text-white font-sans p-4 md:p-8 space-y-6 select-none">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-[#181a20] via-[#1e2329] to-[#14181d] p-6 md:p-8 rounded-3xl border border-[#2b313a] shadow-2xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center text-black font-extrabold text-2xl shadow-lg shadow-emerald-500/20">
              <Users className="w-7 h-7 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  P2P Express Trading
                </h1>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Escrow Protection & VietQR
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Zero Fees · Peer-to-Peer Fiat & Crypto Settlement · Instant Escrow Protection
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-[#14181d] p-1.5 rounded-2xl border border-[#2b313a]">
            <button
              onClick={() => setP2PTab('BUY')}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition ${
                p2pTab === 'BUY' ? 'bg-[#0ecb81] text-black shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              Buy USDT (VNĐ)
            </button>
            <button
              onClick={() => setP2PTab('SELL')}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition ${
                p2pTab === 'SELL' ? 'bg-[#f6465d] text-white shadow-lg shadow-red-500/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sell USDT (VNĐ)
            </button>
          </div>
        </div>
      </div>

      {/* P2P Merchant Ads Table */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-[#14181d] text-gray-400 border-b border-[#2b313a] text-xs font-mono">
            <tr>
              <th className="py-4 px-6">Merchant Trader</th>
              <th className="py-4 px-6">Unit Price (VND)</th>
              <th className="py-4 px-6">Available Limit</th>
              <th className="py-4 px-6">Payment Options</th>
              <th className="py-4 px-6 text-right">Trade Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b313a]/50 text-gray-200 font-mono">
            {filteredAds.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500 font-sans">
                  No active P2P merchant listings found.
                </td>
              </tr>
            ) : (
              filteredAds.map((ad) => (
                <tr key={ad.id} className="hover:bg-[#2b313a]/30 transition">
                  <td className="py-5 px-6 font-bold text-white flex items-center space-x-3">
                    <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-sm">
                      {(ad.merchant?.nickname || 'Merchant').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-black text-white flex items-center space-x-1.5">
                        <span>{ad.merchant?.nickname || 'Verified Merchant'}</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">99.8% Completion Rate (1,450 Orders)</div>
                    </div>
                  </td>

                  <td className="py-5 px-6 font-black text-yellow-400 text-lg">
                    {parseFloat(ad.price).toLocaleString()} VND
                  </td>

                  <td className="py-5 px-6">
                    <div className="font-black text-white">{parseFloat(ad.amount).toLocaleString()} USDT</div>
                    <div className="text-[10px] text-gray-400">Min: 500,000 VND</div>
                  </td>

                  <td className="py-5 px-6">
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/30 flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>sePay VietQR Auto</span>
                      </span>
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-bold border border-blue-500/30">
                        MBBank Transfer
                      </span>
                    </div>
                  </td>

                  <td className="py-5 px-6 text-right">
                    <button
                      onClick={() => setSelectedAd(ad)}
                      className={`px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition ${
                        p2pTab === 'BUY'
                          ? 'bg-[#0ecb81] hover:bg-[#0ba368] text-black shadow-emerald-500/20'
                          : 'bg-[#f6465d] hover:bg-[#d93a4f] text-white shadow-red-500/20'
                      }`}
                    >
                      {p2pTab === 'BUY' ? 'Buy USDT' : 'Sell USDT'}
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 w-full max-w-md relative text-white shadow-2xl">
            <button onClick={() => setSelectedAd(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-lg">
              ✕
            </button>

            <h3 className="text-xl font-black text-white mb-1">
              {p2pTab === 'BUY' ? 'Buy USDT' : 'Sell USDT'} from {selectedAd.merchant?.nickname || 'Merchant'}
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">Đơn giá P2P: {parseFloat(selectedAd.price).toLocaleString()} VND / USDT</p>

            <form onSubmit={handleCreateOrder} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-sans font-bold">Số Lượng Crypto (USDT):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl p-3 text-white font-bold text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              {amount && (
                <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a] flex items-center justify-between text-yellow-400">
                  <span className="font-sans font-bold">Tổng Tiền VNĐ Thanh Toán:</span>
                  <span className="font-black text-lg">
                    {(parseFloat(amount || '0') * parseFloat(selectedAd.price)).toLocaleString()} VND
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold py-3.5 rounded-xl text-xs transition shadow-lg shadow-yellow-500/20"
              >
                Tạo Đơn P2P & Khóa USDT Vào Escrow Sàn
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Active P2P Order Escrow Settlement Modal */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-[#181a20] border-2 border-emerald-500/60 rounded-3xl p-6 w-full max-w-lg relative text-white shadow-2xl space-y-4">
            <button onClick={() => setActiveOrder(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-lg">
              ✕
            </button>

            <div className="flex items-center space-x-3 border-b border-[#2b313a] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-400">
                  ĐƠN P2P ĐÃ KHÓA ESCROW BẢO VỆ
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  Mã đơn: {activeOrder.id.slice(0, 8)} · 2 Bên Tự Quyết Định Thanh Toán
                </p>
              </div>
            </div>

            {/* VietQR Dynamic Card */}
            <div className="bg-white p-4 rounded-2xl max-w-[210px] mx-auto border-2 border-emerald-500 text-center shadow-lg">
              <img
                src={`https://qr.sepay.vn/img?bank=MBBank&acc=0123456789&template=compact&amount=${activeOrder.fiatAmount}&des=P2P_${activeOrder.id.slice(0, 6)}`}
                alt="sePay P2P VietQR"
                className="w-full h-auto rounded-lg"
              />
              <div className="text-[10px] font-bold text-black font-mono mt-1">
                Quét VietQR để sePay tự động duyệt Escrow
              </div>
            </div>

            <div className="bg-[#14181d] p-4 rounded-2xl border border-[#2b313a] space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Số tiền VNĐ:</span>
                <span className="text-emerald-400 font-black text-base">
                  {parseFloat(activeOrder.fiatAmount).toLocaleString()} VND
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Số lượng USDT:</span>
                <span className="text-yellow-400 font-bold">{parseFloat(activeOrder.amount).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between bg-yellow-400/10 p-2.5 rounded-xl border border-yellow-400/30">
                <span className="text-yellow-400 font-bold">Nội dung chuyển tiền:</span>
                <span className="text-yellow-400 font-black text-sm">P2P_{activeOrder.id.slice(0, 6)}</span>
              </div>
            </div>

            {/* Decision Buttons for Buyer & Seller */}
            <div className="space-y-2 pt-2 border-t border-[#2b313a]">
              <button
                onClick={handleSimulateSepayP2P}
                disabled={simulating}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>{simulating ? 'sePay Đang Khớp Webhook Ngân Hàng...' : '📱 Quét VietQR sePay Khớp Tiền & Giải Phóng Escrow Tự Động'}</span>
              </button>

              <button
                onClick={() => handleReleaseEscrow(activeOrder.id)}
                className="w-full py-3 bg-[#2b313a] hover:bg-[#3b424e] text-white font-extrabold text-xs rounded-xl transition"
              >
                ✋ 2 Bên Xác Nhận Đã Nhận Tiền Thủ Công (Giải Phóng Escrow)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
