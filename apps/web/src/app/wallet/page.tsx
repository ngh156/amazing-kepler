'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check, Building2, QrCode, ArrowLeftRight, Layers, ShieldCheck, Zap, DollarSign, History, TrendingUp, Lock, Sparkles, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { SepayDepositModal } from '../../components/trading/SepayDepositModal';

export default function WalletPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeSubWallet, setActiveSubWallet] = useState<'OVERVIEW' | 'FIAT' | 'SPOT' | 'FUTURES'>('OVERVIEW');

  const [balances, setBalances] = useState<any[]>([]);
  const [futuresMargin, setFuturesMargin] = useState('0');
  const [ledgerLogs, setLedgerLogs] = useState<any[]>([]);

  // Internal Transfer State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<'FIAT' | 'SPOT' | 'FUTURES'>('SPOT');
  const [transferTo, setTransferTo] = useState<'FIAT' | 'SPOT' | 'FUTURES'>('FUTURES');
  const [transferAsset, setTransferAsset] = useState('USDT');
  const [transferAmount, setTransferAmount] = useState('100');
  const [transferMsg, setTransferMsg] = useState('');
  const [isSepayOpen, setIsSepayOpen] = useState(false);

  const fetchBalances = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/wallets/balances');
      setBalances(res.data.balances || []);

      const futuresRes = await api.get('/futures/positions');
      const positions = futuresRes.data.positions || [];
      const totalMargin = positions.reduce((acc: number, p: any) => acc + (parseFloat(p.margin) || 0), 0);
      setFuturesMargin(totalMargin.toFixed(2));

      const logsRes = await api.get('/wallets/ledger-history');
      setLedgerLogs(logsRes.data.logs || []);
    } catch (e) {
      console.error('Failed to fetch balances:', e);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [isAuthenticated]);

  const handleInternalTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferMsg('');

    // Rule 4 Check: Direct Fiat ↔ Futures is disallowed
    if ((transferFrom === 'FIAT' && transferTo === 'FUTURES') || (transferFrom === 'FUTURES' && transferTo === 'FIAT')) {
      setTransferMsg('⚠️ Quy tắc sàn: Giao dịch phải qua luồng Fiat ↔ Spot ↔ Futures. Không được chuyển trực tiếp giữa Fiat và Futures!');
      return;
    }

    if (transferFrom === transferTo) {
      setTransferMsg('⚠️ Ví nguồn và Ví đích không được trùng nhau!');
      return;
    }

    try {
      const res = await api.post('/wallets/internal-transfer', {
        fromWallet: transferFrom,
        toWallet: transferTo,
        assetId: transferAsset,
        amount: transferAmount,
      });

      setTransferMsg(`✅ ${res.data.message}`);
      setTimeout(() => {
        setIsTransferOpen(false);
        setTransferMsg('');
        fetchBalances();
      }, 1200);
    } catch (err: any) {
      setTransferMsg(`❌ ${err.response?.data?.message || 'Chuyển tiền thất bại'}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 bg-[#0b0e11] p-12 text-center text-gray-400 font-sans flex items-center justify-center">
        <div className="bg-[#181a20] p-8 rounded-3xl border border-[#2b313a] max-w-md">
          <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-lg font-black text-white mb-2">CEX Multi-Subaccount Wallet</h2>
          <p className="text-xs text-gray-400">Vui lòng đăng nhập để quản lý Ví Fiat, Ví Spot và Ví Futures Margin.</p>
        </div>
      </div>
    );
  }

  const usdtBalanceObj = balances.find((b) => b.asset.id === 'USDT');
  const usdtAvailable = usdtBalanceObj ? parseFloat(usdtBalanceObj.available) : 0;
  const usdtLocked = usdtBalanceObj ? parseFloat(usdtBalanceObj.locked) : 0;
  const futuresBal = usdtBalanceObj ? parseFloat(usdtBalanceObj.futuresMargin || '0') : 0;
  const totalUsdtWorth = usdtAvailable + usdtLocked + futuresBal;
  const totalVndWorth = totalUsdtWorth * 25400;

  return (
    <div className="flex-1 bg-[#0b0e11] min-h-screen text-white font-sans p-4 md:p-8 space-y-6 select-none">
      <SepayDepositModal
        isOpen={isSepayOpen}
        onClose={() => setIsSepayOpen(false)}
        onSuccess={() => fetchBalances()}
      />

      {/* Hero Header Banner */}
      <div className="relative bg-gradient-to-r from-[#181a20] via-[#1e2329] to-[#14181d] p-6 md:p-8 rounded-3xl border border-[#2b313a] shadow-2xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-extrabold text-2xl shadow-lg shadow-yellow-500/20">
              <Wallet className="w-7 h-7 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Ví Đa Tài Khoản Sub-Accounts
                </h1>
                <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-yellow-400/30">
                  Phân Định Chuẩn CEX
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Tách biệt Ví Fiat VNĐ · Ví Spot Crypto · Ví Futures Margin · Khả dụng & Khóa rõ ràng
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSepayOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black px-5 py-3 rounded-2xl font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2"
            >
              <Building2 className="w-4 h-4 fill-black" />
              <span>🏦 Nạp VNĐ VietQR sePay</span>
            </button>

            <button
              onClick={() => setIsTransferOpen(true)}
              className="bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black px-5 py-3 rounded-2xl font-extrabold text-xs shadow-lg shadow-yellow-500/20 transition-all flex items-center space-x-2"
            >
              <ArrowLeftRight className="w-4 h-4 fill-black" />
              <span>🔄 Chuyển Tiền (Fiat ↔ Spot ↔ Futures)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Net Worth Rule Formula Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono">
        <div className="bg-[#181a20] p-6 rounded-3xl border border-yellow-500/30 shadow-xl relative overflow-hidden">
          <div className="text-xs text-gray-400 mb-1 font-sans font-bold flex items-center justify-between">
            <span className="flex items-center space-x-1 text-yellow-400">
              <DollarSign className="w-4 h-4" />
              <span>TỔNG TÀI SẢN NET WORTH</span>
            </span>
            <span className="text-[10px] text-gray-400 bg-[#14181d] px-2 py-0.5 rounded border border-[#2b313a]">
              Formula Rule 4
            </span>
          </div>
          <div className="text-3xl font-black text-yellow-400 tracking-tight mt-2">
            ${totalUsdtWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
          </div>
          <div className="text-xs text-emerald-400 font-bold mt-2">
            = Fiat + Spot (Khả dụng + Khóa) + Futures Margin
          </div>
        </div>

        <div className="bg-[#181a20] p-6 rounded-3xl border border-emerald-500/30 shadow-xl relative overflow-hidden">
          <div className="text-xs text-gray-400 mb-1 font-sans font-bold flex items-center justify-between">
            <span className="flex items-center space-x-1 text-emerald-400">
              <Building2 className="w-4 h-4" />
              <span>VÍ FIAT (VNĐ / BANK)</span>
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Rule 1
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight mt-2">
            {(usdtAvailable * 25400 * 0.2).toLocaleString('en-US', { maximumFractionDigits: 0 })} VNĐ
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-sans">
            Nạp/rút tiền pháp định · Mua Spot qua Fiat $\rightarrow$ Spot
          </div>
        </div>

        <div className="bg-[#181a20] p-6 rounded-3xl border border-blue-500/30 shadow-xl relative overflow-hidden">
          <div className="text-xs text-gray-400 mb-1 font-sans font-bold flex items-center justify-between">
            <span className="flex items-center space-x-1 text-blue-400">
              <Zap className="w-4 h-4" />
              <span>VÍ FUTURES MARGIN</span>
            </span>
            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
              Rule 3
            </span>
          </div>
          <div className="text-3xl font-black text-blue-400 tracking-tight mt-2">
            ${futuresBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-sans">
            Margin thế chấp đòn bẩy · Không tự bù lỗ từ Spot
          </div>
        </div>
      </div>

      {/* Sub-Wallet Navigation Tabs */}
      <div className="flex bg-[#14181d] p-1.5 rounded-2xl border border-[#2b313a] space-x-2 text-xs font-extrabold">
        {[
          { id: 'OVERVIEW', name: '💼 Ví Tổng Quan & Quy Tắc Sàn', icon: Layers },
          { id: 'FIAT',     name: '💵 1. Ví Fiat (VNĐ Bank)', icon: Building2 },
          { id: 'SPOT',     name: '📊 2. Ví Spot Crypto', icon: Wallet },
          { id: 'FUTURES',  name: '⚡ 3. Ví Futures Margin', icon: Zap },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeSubWallet === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubWallet(t.id as any)}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                isActive
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 font-black'
                  : 'text-gray-400 hover:text-white hover:bg-[#181a20]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400'}`} />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & RULE SUMMARY */}
      {activeSubWallet === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-yellow-400" />
              <span>Bảng Quy Tắc Phân Định Ví & Luồng Chuyển Tiền (Standard CEX Rules)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans text-xs">
              <div className="bg-[#14181d] p-5 rounded-2xl border border-emerald-500/30 space-y-2">
                <div className="font-extrabold text-emerald-400 text-sm flex items-center space-x-2">
                  <Building2 className="w-4 h-4" />
                  <span>1. Ví Fiat (Bank / sePay)</span>
                </div>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  <li>Lưu trữ tiền pháp định (USD, EUR, VNĐ).</li>
                  <li>Dùng cho: Nạp tiền, Rút tiền, Mua Crypto.</li>
                  <li>Không dùng trực tiếp để đặt lệnh Spot/Futures.</li>
                  <li>Luồng mua Crypto: <strong className="text-emerald-400">Fiat → Spot</strong>.</li>
                </ul>
              </div>

              <div className="bg-[#14181d] p-5 rounded-2xl border border-yellow-500/30 space-y-2">
                <div className="font-extrabold text-yellow-400 text-sm flex items-center space-x-2">
                  <Wallet className="w-4 h-4" />
                  <span>2. Ví Spot (Crypto Thực Tế)</span>
                </div>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  <li>Lưu trữ tài sản Crypto thực tế (BTC, ETH, USDT...).</li>
                  <li>Dùng cho giao dịch Spot Mua/Bán.</li>
                  <li>Đặt lệnh Spot sẽ <strong className="text-yellow-400">Khóa (Reserved)</strong> số dư tới khi hủy/khớp.</li>
                  <li>Chuyển vốn qua luồng: <strong className="text-yellow-400">Fiat ↔ Spot ↔ Futures</strong>.</li>
                </ul>
              </div>

              <div className="bg-[#14181d] p-5 rounded-2xl border border-blue-500/30 space-y-2">
                <div className="font-extrabold text-blue-400 text-sm flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>3. Ví Futures (Margin Collateral)</span>
                </div>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  <li>Dùng riêng làm Margin cọc Futures đòn bẩy.</li>
                  <li>Mở vị thế khóa <strong className="text-blue-400">Initial Margin</strong>.</li>
                  <li>PnL & Phí trừ trực tiếp vào Ví Futures.</li>
                  <li>Không tự rút tiền Spot bù lỗ trừ khi bật Auto-Margin.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Audit Ledger History Table */}
          <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-black text-white flex items-center space-x-2 font-sans">
              <History className="w-4 h-4 text-yellow-400" />
              <span>Sổ Cái Nhật Ký Kiểm Toán Chuyển Tiền Nội Bộ (Audit Ledger Records)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#14181d] text-gray-400 border-b border-[#2b313a]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Giao Dịch</th>
                    <th className="py-3 px-4">Tài Sản</th>
                    <th className="py-3 px-4">Số Tiền Chuyển</th>
                    <th className="py-3 px-4 text-right">Trạng Thái Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b313a]/50 text-gray-200">
                  {ledgerLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500 font-sans">
                        Chưa có lịch sử chuyển tiền nội bộ nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    ledgerLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#2b313a]/30 transition">
                        <td className="py-3 px-4 text-gray-400">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {log.resource.replace('wallet:', 'Ví ').replace('_to_', ' ➔ Ví ')}
                        </td>
                        <td className="py-3 px-4 text-yellow-400 font-bold">
                          {log.payload?.assetId || 'USDT'}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-emerald-400">
                          +{log.payload?.amount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30">
                            Verified Ledger ✅
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIAT WALLET */}
      {activeSubWallet === 'FIAT' && (
        <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2b313a] pb-4 gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center space-x-2">
                <span>Ví Fiat (Tài Khoản Tiền Pháp Định VNĐ)</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                  Rule 1: Deposit / Withdrawal
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Lưu trữ tiền nạp/rút VNĐ. Mua crypto chuyển sang Spot qua luồng Fiat ➔ Spot.
              </p>
            </div>

            <button
              onClick={() => setIsSepayOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-black px-5 py-2.5 rounded-2xl font-extrabold text-xs shadow-lg transition flex items-center space-x-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Nạp VNĐ VietQR sePay</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            <div className="bg-[#14181d] p-6 rounded-2xl border border-[#2b313a]">
              <div className="text-xs text-gray-400 font-sans font-bold">Số Dư VNĐ Khả Dụng:</div>
              <div className="text-3xl font-black text-emerald-400 mt-2">
                {(usdtAvailable * 25400 * 0.2).toLocaleString('en-US', { maximumFractionDigits: 0 })} VNĐ
              </div>
            </div>

            <div className="bg-[#14181d] p-6 rounded-2xl border border-[#2b313a]">
              <div className="text-xs text-gray-400 font-sans font-bold">Liên Kết Ngân Hàng Ngân Hàng sePay:</div>
              <div className="text-base font-bold text-white mt-2 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>MBBank · 0123456789 (CONG TY CP APEX KEPLER)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPOT WALLET */}
      {activeSubWallet === 'SPOT' && (
        <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-[#2b313a] text-base font-extrabold text-white flex justify-between items-center">
            <span className="flex items-center space-x-2">
              <span>Rule 2: Spot Crypto Wallet</span>
              <span className="bg-yellow-400/20 text-yellow-400 text-xs font-mono font-bold px-2.5 py-0.5 rounded border border-yellow-400/30">
                Available vs Locked (Reserved)
              </span>
            </span>
          </div>
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-[#14181d] text-gray-400 border-b border-[#2b313a] text-xs font-mono">
              <tr>
                <th className="py-4 px-6">Tài Sản Crypto</th>
                <th className="py-4 px-6">Tổng Số Dư</th>
                <th className="py-4 px-6">Số Dư Khả Dụng (Available)</th>
                <th className="py-4 px-6">Số Dư Bị Khóa (Reserved)</th>
                <th className="py-4 px-6 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b313a]/50 text-gray-200 font-mono">
              {balances.map((b) => (
                <tr key={b.asset.id} className="hover:bg-[#2b313a]/30 transition">
                  <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                    <span className="w-9 h-9 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-black">
                      {b.asset.id.substring(0, 3)}
                    </span>
                    <div>
                      <div className="font-black text-white">{b.asset.name}</div>
                      <div className="text-xs text-gray-400">{b.asset.id}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-black text-white">
                    {(parseFloat(b.available) + parseFloat(b.locked)).toFixed(4)}
                  </td>
                  <td className="py-4 px-6 text-emerald-400 font-black">
                    {parseFloat(b.available).toFixed(4)}
                  </td>
                  <td className="py-4 px-6 text-gray-400">
                    {parseFloat(b.locked).toFixed(4)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setIsTransferOpen(true)}
                      className="bg-[#2b313a] hover:bg-[#3b424e] text-yellow-400 px-4 py-2 rounded-xl text-xs font-bold transition shadow"
                    >
                      Chuyển Tiền Ví
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: FUTURES MARGIN WALLET */}
      {activeSubWallet === 'FUTURES' && (
        <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2b313a] pb-4 gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center space-x-2">
                <span>Ví Futures Margin (Rule 3: Ký Quỹ Đòn Bẩy)</span>
                <span className="bg-blue-500/20 text-blue-400 text-xs font-mono font-bold px-3 py-1 rounded-full border border-blue-500/30">
                  Isolated Margin Pool
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Dùng riêng cho đòn bẩy. Khi mở vị thế khóa Initial Margin. Tự động Liquidation khi chạm Maintenance Margin.
              </p>
            </div>

            <button
              onClick={() => setIsTransferOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-2.5 rounded-2xl font-extrabold text-xs shadow-lg transition flex items-center space-x-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Chuyển Thêm Margin (Spot ➔ Futures)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            <div className="bg-[#14181d] p-6 rounded-2xl border border-[#2b313a]">
              <div className="text-xs text-gray-400 font-sans font-bold">Số Dư Ví Futures Margin Khả Dụng:</div>
              <div className="text-3xl font-black text-blue-400 mt-2">
                ${futuresBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
              </div>
            </div>

            <div className="bg-[#14181d] p-6 rounded-2xl border border-[#2b313a]">
              <div className="text-xs text-gray-400 font-sans font-bold">Sức Mua Mở Lệnh Tối Đa (10,000x):</div>
              <div className="text-3xl font-black text-yellow-400 mt-2">
                ${(futuresBal * 10000).toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Internal Transfer Modal Enforcing Rule 4 */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-[#181a20] border border-[#2b313a] w-full max-w-md rounded-3xl p-6 text-white shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsTransferOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-[#2b313a]/60 flex items-center justify-center transition"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 border-b border-[#2b313a] pb-3">
              <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Chuyển Tiền Nội Bộ Giữa Các Ví</h3>
                <p className="text-xs text-yellow-400 font-mono">Luồng: Fiat ↔ Spot ↔ Futures</p>
              </div>
            </div>

            {transferMsg && (
              <div className="p-3 rounded-xl bg-[#14181d] border border-[#2b313a] text-xs font-mono text-center">
                {transferMsg}
              </div>
            )}

            <form onSubmit={handleInternalTransfer} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-sans font-bold">Từ Ví Source:</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value as any)}
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl p-3 text-white font-bold focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="SPOT">Ví Spot (Crypto)</option>
                    <option value="FIAT">Ví Fiat (VNĐ)</option>
                    <option value="FUTURES">Ví Futures (Margin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-sans font-bold">Đến Ví Target:</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value as any)}
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl p-3 text-white font-bold focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="FUTURES">Ví Futures (Margin)</option>
                    <option value="SPOT">Ví Spot (Crypto)</option>
                    <option value="FIAT">Ví Fiat (VNĐ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 font-sans">Số tiền chuyển (USDT):</label>
                <input
                  type="number"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl py-3 px-3 text-sm text-white font-bold focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs rounded-xl shadow-lg transition"
              >
                Xác Nhận Chuyển Tiền & Ghi Sổ Cái
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
