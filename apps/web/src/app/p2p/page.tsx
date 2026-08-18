'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Users, ShieldCheck, ArrowRightLeft, Clock, CheckCircle2, QrCode, Zap, Building2, Copy, Check } from 'lucide-react';

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
    <div className="flex-1 bg-[#12161c] p-6 max-w-6xl mx-auto w-full space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181a20] p-6 rounded-2xl border border-[#2b313a] shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 font-extrabold text-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <span>P2P Trading & VietQR sePay Settlement</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                0% Fee · Escrow Protected
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Giao dịch P2P giữa 2 bên · Tùy chọn Thanh toán Tự Động VietQR sePay hoặc Xác nhận Thủ công
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-[#14181d] p-1 rounded-xl border border-[#2b313a]">
          <button
            onClick={() => setP2PTab('BUY')}
            className={`px-6 py-2 rounded-lg font-extrabold text-xs transition ${
              p2pTab === 'BUY' ? 'bg-[#0ecb81] text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Buy USDT (VNĐ)
          </button>
          <button
            onClick={() => setP2PTab('SELL')}
            className={`px-6 py-2 rounded-lg font-extrabold text-xs transition ${
              p2pTab === 'SELL' ? 'bg-[#f6465d] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sell USDT (VNĐ)
          </button>
        </div>
      </div>

      {/* P2P Merchant Ads Table */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-[#1e2329] text-gray-400 border-b border-[#2b313a] text-xs font-mono">
            <tr>
              <th className="py-3.5 px-6">Merchant Trader</th>
              <th className="py-3.5 px-6">Unit Price (VND)</th>
              <th className="py-3.5 px-6">Available Limit</th>
              <th className="py-3.5 px-6">Supported Payment Methods</th>
              <th className="py-3.5 px-6 text-right">Trade Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b313a]/50 text-gray-200 font-mono">
            {filteredAds.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                  No active P2P merchant listings found.
                </td>
              </tr>
            ) : (
              filteredAds.map((ad) => (
                <tr key={ad.id} className="hover:bg-[#2b313a]/30 transition">
                  <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-extrabold text-xs font-mono">
                      {(ad.merchant?.nickname || 'Merchant').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-extrabold text-white flex items-center space-x-1.5">
                        <span>{ad.merchant?.nickname || 'Verified Merchant'}</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">99.8% Completion Rate (1,450 Orders)</div>
                    </div>
                  </td>

                  <td className="py-4 px-6 font-extrabold text-yellow-400 text-base">
                    {parseFloat(ad.price).toLocaleString()} VND
                  </td>

                  <td className="py-4 px-6">
                    <div className="font-bold text-white">{parseFloat(ad.amount).toLocaleString()} USDT</div>
                    <div className="text-[10px] text-gray-400">Min: 500,000 VND</div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30 flex items-center space-x-1">
                        <Building2 className="w-3 h-3" />
                        <span>sePay VietQR Auto</span>
                      </span>
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-500/30">
                        MBBank / Bank Transfer
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setSelectedAd(ad)}
                      className={`px-5 py-2 rounded-xl font-extrabold text-xs shadow transition ${
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 w-full max-w-md relative text-white shadow-2xl">
            <button onClick={() => setSelectedAd(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-lg">
              ✕
            </button>

            <h3 className="text-lg font-extrabold text-white mb-1">
              {p2pTab === 'BUY' ? 'Buy USDT' : 'Sell USDT'} from {selectedAd.merchant?.nickname || 'Merchant'}
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">Đơn giá P2P: {parseFloat(selectedAd.price).toLocaleString()} VND / USDT</p>

            <form onSubmit={handleCreateOrder} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Số Lượng Crypto (USDT):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              {amount && (
                <div className="bg-[#14181d] p-3 rounded-xl border border-[#2b313a] flex items-center justify-between text-yellow-400">
                  <span>Tổng Tiền VNĐ Thanh Toán:</span>
                  <span className="font-extrabold text-base">
                    {(parseFloat(amount || '0') * parseFloat(selectedAd.price)).toLocaleString()} VND
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold py-3 rounded-xl text-xs transition shadow-lg shadow-yellow-500/20"
              >
                Tạo Đơn P2P & Khóa USDT Vào Escrow Sàn
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Active P2P Order Escrow Settlement Modal (VietQR sePay Auto / Manual Decision) */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-[#181a20] border-2 border-emerald-500/60 rounded-2xl p-6 w-full max-w-lg relative text-white shadow-2xl space-y-4">
            <button onClick={() => setActiveOrder(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-lg">
              ✕
            </button>

            <div className="flex items-center space-x-3 border-b border-[#2b313a] pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-emerald-400">
                  ĐƠN P2P ĐÃ KHÓA ESCROW BẢO VỆ
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  Mã đơn: {activeOrder.id.slice(0, 8)} · 2 Bên Tự Quyết Định Thanh Toán
                </p>
              </div>
            </div>

            {/* VietQR Dynamic Card */}
            <div className="bg-white p-3 rounded-xl max-w-[200px] mx-auto border-2 border-emerald-500 text-center">
              <img
                src={`https://qr.sepay.vn/img?bank=MBBank&acc=0123456789&template=compact&amount=${activeOrder.fiatAmount}&des=P2P_${activeOrder.id.slice(0, 6)}`}
                alt="sePay P2P VietQR"
                className="w-full h-auto rounded"
              />
              <div className="text-[9px] font-bold text-black font-mono mt-1">
                Quét VietQR để sePay tự động duyệt Escrow
              </div>
            </div>

            <div className="bg-[#14181d] p-3.5 rounded-xl border border-[#2b313a] space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Số tiền VNĐ:</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  {parseFloat(activeOrder.fiatAmount).toLocaleString()} VND
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Số lượng USDT:</span>
                <span className="text-yellow-400 font-bold">{parseFloat(activeOrder.amount).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between bg-yellow-400/10 p-2 rounded-lg border border-yellow-400/30">
                <span className="text-yellow-400 font-bold">Nội dung chuyển tiền:</span>
                <span className="text-yellow-400 font-black text-sm">P2P_{activeOrder.id.slice(0, 6)}</span>
              </div>
            </div>

            {/* Decision Buttons for Buyer & Seller */}
            <div className="space-y-2 pt-2 border-t border-[#2b313a]">
              <button
                onClick={handleSimulateSepayP2P}
                disabled={simulating}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>{simulating ? 'sePay Đang Khớp Webhook Ngân Hàng...' : '📱 Quét VietQR sePay Khớp Tiền & Giải Phóng Escrow Tự Động'}</span>
              </button>

              <button
                onClick={() => handleReleaseEscrow(activeOrder.id)}
                className="w-full py-2.5 bg-[#2b313a] hover:bg-[#3b424e] text-white font-extrabold text-xs rounded-xl transition"
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
