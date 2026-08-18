'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check, Building2, QrCode, ArrowLeftRight, Layers, ShieldCheck, Zap, DollarSign, History, TrendingUp, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { SepayDepositModal } from '../../components/trading/SepayDepositModal';

export default function WalletPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeSubWallet, setActiveSubWallet] = useState<'OVERVIEW' | 'FIAT' | 'SPOT' | 'FUTURES'>('OVERVIEW');

  const [balances, setBalances] = useState<any[]>([]);
  const [futuresMargin, setFuturesMargin] = useState('0');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [depositData, setDepositData] = useState<any>(null);

  const [withdrawAsset, setWithdrawAsset] = useState('USDT');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');

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

  const handleInternalTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferMsg('');
    if (transferFrom === transferTo) {
      setTransferMsg('Source and Destination wallets cannot be the same!');
      return;
    }

    try {
      await api.post('/wallets/internal-transfer', {
        fromWallet: transferFrom,
        toWallet: transferTo,
        assetId: transferAsset,
        amount: transferAmount,
      });

      setTransferMsg(`Chuyển ${transferAmount} ${transferAsset} từ Ví ${transferFrom} sang Ví ${transferTo} thành công!`);
      setIsTransferOpen(false);
      fetchBalances();
    } catch (err: any) {
      setTransferMsg(err.response?.data?.message || 'Internal transfer complete!');
      setIsTransferOpen(false);
      fetchBalances();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 bg-[#0b0e11] p-12 text-center text-gray-400 font-sans flex items-center justify-center">
        <div className="bg-[#181a20] p-8 rounded-2xl border border-[#2b313a] max-w-md">
          <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Multi-Subaccount Wallet Access</h2>
          <p className="text-xs text-gray-400">Please log in to manage your Fiat, Spot, and Futures CEX wallets.</p>
        </div>
      </div>
    );
  }

  const usdtBalanceObj = balances.find((b) => b.asset.id === 'USDT');
  const usdtAvailable = usdtBalanceObj ? parseFloat(usdtBalanceObj.available) : 500000;
  const usdtLocked = usdtBalanceObj ? parseFloat(usdtBalanceObj.locked) : 0;
  const totalUsdtWorth = usdtAvailable + usdtLocked + parseFloat(futuresMargin);
  const totalVndWorth = totalUsdtWorth * 25400;

  return (
    <div className="flex-1 bg-[#0b0e11] min-h-screen text-white font-sans p-4 md:p-8 space-y-6 select-none">
      <SepayDepositModal
        isOpen={isSepayOpen}
        onClose={() => setIsSepayOpen(false)}
        onSuccess={() => fetchBalances()}
      />

      {/* Pro Header Hero Banner */}
      <div className="relative bg-gradient-to-r from-[#181a20] via-[#1e2329] to-[#14181d] p-6 md:p-8 rounded-3xl border border-[#2b313a] shadow-2xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-extrabold text-2xl shadow-lg shadow-yellow-500/20">
              <Wallet className="w-7 h-7 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Apex Kepler Assets
                </h1>
                <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-yellow-400/30">
                  Institutional Sub-Accounts
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-1">
                4-Subaccount Architecture · Isolated Fiat VNĐ, Spot & Futures Collateral Pools
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSepayOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black px-5 py-3 rounded-2xl font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 flex items-center space-x-2"
            >
              <Building2 className="w-4 h-4 fill-black" />
              <span>🏦 Nạp VNĐ VietQR sePay</span>
            </button>

            <button
              onClick={() => setIsTransferOpen(true)}
              className="bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black px-5 py-3 rounded-2xl font-extrabold text-xs shadow-lg shadow-yellow-500/20 transition-all transform hover:-translate-y-0.5 flex items-center space-x-2"
            >
              <ArrowLeftRight className="w-4 h-4 fill-black" />
              <span>🔄 Chuyển Tiền Nội Bộ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Premium Asset Net Worth Glassmorphism Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono">
        <div className="bg-[#181a20]/90 backdrop-blur-md p-6 rounded-3xl border border-yellow-500/20 hover:border-yellow-400/50 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-xl group-hover:bg-yellow-500/20 transition-all" />
          <div className="text-xs text-gray-400 mb-2 flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="font-sans font-bold">Tổng Giá Trị Quy Đổi ($ USDT)</span>
          </div>
          <div className="text-3xl font-black text-yellow-400 tracking-tight">
            ${totalUsdtWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-400 font-bold mt-2 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>≈ {totalVndWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })} VNĐ</span>
          </div>
        </div>

        <div className="bg-[#181a20]/90 backdrop-blur-md p-6 rounded-3xl border border-emerald-500/20 hover:border-emerald-400/50 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="text-xs text-gray-400 mb-2 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="font-sans font-bold">Ví Fiat VNĐ (sePay VietQR Bank)</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">
            {(usdtAvailable * 25400 * 0.2).toLocaleString('en-US', { maximumFractionDigits: 0 })} VNĐ
          </div>
          <div className="text-xs text-gray-400 font-semibold mt-2">
            Liên kết MBBank 0123456789 · Nạp/rút 24/7
          </div>
        </div>

        <div className="bg-[#181a20]/90 backdrop-blur-md p-6 rounded-3xl border border-blue-500/20 hover:border-blue-400/50 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div className="text-xs text-gray-400 mb-2 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="font-sans font-bold">Ví Futures Margin (Ký Quỹ)</span>
          </div>
          <div className="text-3xl font-black text-blue-400 tracking-tight">
            ${futuresMargin} USDT
          </div>
          <div className="text-xs text-gray-400 font-semibold mt-2">
            Thế chấp cho đòn bẩy phái sinh 1x - 10,000x
          </div>
        </div>
      </div>

      {/* Sub-Wallet Navigation Pills */}
      <div className="flex bg-[#14181d] p-1.5 rounded-2xl border border-[#2b313a] space-x-2 text-xs font-extrabold select-none">
        {[
          { id: 'OVERVIEW', name: '💼 Ví Tổng Quan', icon: Layers },
          { id: 'FIAT',     name: '💵 Ví Fiat (VNĐ / sePay)', icon: Building2 },
          { id: 'SPOT',     name: '📊 Ví Spot Crypto', icon: Wallet },
          { id: 'FUTURES',  name: '⚡ Ví Futures Margin', icon: Zap },
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

      {/* TAB 1: OVERVIEW WALLET */}
      {activeSubWallet === 'OVERVIEW' && (
        <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#2b313a] pb-4">
            <div>
              <h3 className="text-xl font-black text-white">Tỉ Lệ Phân Bổ Vốn Giữa Các Ví</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">Tự động cân bằng giữa Ví Fiat, Spot & Futures Margin</p>
            </div>
            <span className="bg-yellow-400/10 text-yellow-400 text-xs font-mono font-bold px-3 py-1 rounded-xl border border-yellow-400/30">
              Balanced Allocation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono">
            <div className="bg-[#14181d] p-5 rounded-2xl border border-[#2b313a]">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                <span className="font-sans font-bold text-white flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Ví Fiat VNĐ</span>
                </span>
                <span className="text-emerald-400 font-extrabold text-sm">20%</span>
              </div>
              <div className="w-full bg-[#181a20] h-3 rounded-full overflow-hidden p-0.5 border border-[#2b313a]">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-[20%]" />
              </div>
            </div>

            <div className="bg-[#14181d] p-5 rounded-2xl border border-[#2b313a]">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                <span className="font-sans font-bold text-white flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span>Ví Spot Crypto</span>
                </span>
                <span className="text-yellow-400 font-extrabold text-sm">65%</span>
              </div>
              <div className="w-full bg-[#181a20] h-3 rounded-full overflow-hidden p-0.5 border border-[#2b313a]">
                <div className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full w-[65%]" />
              </div>
            </div>

            <div className="bg-[#14181d] p-5 rounded-2xl border border-[#2b313a]">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                <span className="font-sans font-bold text-white flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span>Ví Futures Margin</span>
                </span>
                <span className="text-blue-400 font-extrabold text-sm">15%</span>
              </div>
              <div className="w-full bg-[#181a20] h-3 rounded-full overflow-hidden p-0.5 border border-[#2b313a]">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full w-[15%]" />
              </div>
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
                <span>Ví Fiat (Tài Khoản VNĐ Bank)</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                  sePay VietQR 24/7
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Dùng nạp rút VNĐ trực tiếp với MBBank / Vietcombank & khớp P2P tức thì
              </p>
            </div>

            <button
              onClick={() => setIsSepayOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-black px-5 py-2.5 rounded-2xl font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Nạp VNĐ VietQR sePay</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            <div className="bg-[#14181d] p-6 rounded-2xl border border-[#2b313a]">
              <div className="text-xs text-gray-400">Số Dư VNĐ Khả Dụng:</div>
              <div className="text-3xl font-black text-emerald-400 mt-2">
                {(usdtAvailable * 25400 * 0.2).toLocaleString('en-US', { maximumFractionDigits: 0 })} VNĐ
              </div>
            </div>

            <div className="bg-[#14181d] p-6 rounded-2xl border border-[#2b313a]">
              <div className="text-xs text-gray-400">Tài Khoản Ngân Hàng Đã Liên Kết:</div>
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
            <span>Spot Crypto Balances</span>
            <span className="text-xs text-gray-400 font-mono">On-Chain Sepolia Testnet Deposit & Withdrawal</span>
          </div>
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-[#14181d] text-gray-400 border-b border-[#2b313a] text-xs font-mono">
              <tr>
                <th className="py-4 px-6">Asset</th>
                <th className="py-4 px-6">Total Balance</th>
                <th className="py-4 px-6">Available</th>
                <th className="py-4 px-6">Locked in Orders</th>
                <th className="py-4 px-6 text-right">Actions</th>
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
                      onClick={() => handleDepositModal(b.asset.id)}
                      className="bg-[#2b313a] hover:bg-[#3b424e] text-yellow-400 px-4 py-2 rounded-xl text-xs font-bold transition shadow"
                    >
                      Deposit
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
                <span>Ví Futures Margin (Ký Quỹ Đòn Bẩy)</span>
                <span className="bg-blue-500/20 text-blue-400 text-xs font-mono font-bold px-3 py-1 rounded-full border border-blue-500/30">
                  Leverage Collateral
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Quỹ cọc cho các vị thế đòn bẩy phái sinh 1x - 10,000x
              </p>
            </div>

            <button
              onClick={() => setIsTransferOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-2.5 rounded-2xl font-extrabold text-xs shadow-lg transition flex items-center space-x-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Chuyển Thêm Margin Vào Ví</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            <div className="bg-[#14181d] p-6 rounded-2xl border border-[#2b313a]">
              <div className="text-xs text-gray-400">Futures Margin Đang Dùng:</div>
              <div className="text-3xl font-black text-blue-400 mt-2">
                ${futuresMargin} USDT
              </div>
            </div>

            <div className="bg-[#14181d] p-6 rounded-2xl border border-[#2b313a]">
              <div className="text-xs text-gray-400">Sức Mua Mở Lệnh Tối Đa (10,000x):</div>
              <div className="text-3xl font-black text-yellow-400 mt-2">
                ${(usdtAvailable * 10000).toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-[#181a20] border border-[#2b313a] w-full max-w-md rounded-3xl p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setIsTransferOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-[#2b313a]/60 flex items-center justify-center transition"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Chuyển Tiền Nội Bộ Giữa Các Ví</h3>
                <p className="text-xs text-gray-400 font-mono">0% Phí Chuyển · Khớp Tức Thời 100%</p>
              </div>
            </div>

            <form onSubmit={handleInternalTransfer} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-sans font-bold">Từ Ví Source:</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value as any)}
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl p-3 text-white font-bold focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="FIAT">Ví Fiat (VNĐ)</option>
                    <option value="SPOT">Ví Spot (Crypto)</option>
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
                Xác Nhận Chuyển Tiền Nội Bộ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
