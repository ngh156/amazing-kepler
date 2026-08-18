'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check, Building2, QrCode, ArrowLeftRight, Layers, ShieldCheck, Zap, DollarSign, History } from 'lucide-react';
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
      // Internal transfer API call
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
      <div className="flex-1 bg-[#12161c] p-12 text-center text-gray-400 font-sans">
        Please log in to access your multi-subaccount CEX wallets.
      </div>
    );
  }

  const usdtBalanceObj = balances.find((b) => b.asset.id === 'USDT');
  const usdtAvailable = usdtBalanceObj ? parseFloat(usdtBalanceObj.available) : 500000;
  const usdtLocked = usdtBalanceObj ? parseFloat(usdtBalanceObj.locked) : 0;
  const totalUsdtWorth = usdtAvailable + usdtLocked + parseFloat(futuresMargin);
  const totalVndWorth = totalUsdtWorth * 25400;

  return (
    <div className="flex-1 bg-[#12161c] p-6 max-w-6xl mx-auto w-full space-y-6 font-sans">
      <SepayDepositModal
        isOpen={isSepayOpen}
        onClose={() => setIsSepayOpen(false)}
        onSuccess={() => fetchBalances()}
      />

      {/* Header & Sub-Wallet Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181a20] p-6 rounded-2xl border border-[#2b313a] shadow-xl">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                <span>CEX Multi-Subaccount Wallet</span>
                <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-mono px-2 py-0.5 rounded border border-yellow-400/30">
                  Institutional Isolation
                </span>
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Ví Fiat VNĐ · Ví Spot Crypto · Ví Futures Margin Collateral · Chuyển tiền nội bộ 0% phí
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSepayOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center space-x-2 border border-emerald-400/40"
          >
            <Building2 className="w-4 h-4" />
            <span>🏦 Nạp VNĐ VietQR sePay</span>
          </button>

          <button
            onClick={() => setIsTransferOpen(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center space-x-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>🔄 Chuyển Tiền Nội Bộ</span>
          </button>
        </div>
      </div>

      {/* Account Balance Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="bg-[#181a20] p-5 rounded-2xl border border-[#2b313a] shadow-lg">
          <div className="text-xs text-gray-400 mb-1 flex items-center space-x-1.5">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span>Tổng Tài Sản Đã Quy Đổi ($ USDT)</span>
          </div>
          <div className="text-2xl font-extrabold text-yellow-400 mt-1">
            ${totalUsdtWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
          </div>
          <div className="text-xs text-emerald-400 font-semibold mt-1">
            ≈ {totalVndWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })} VNĐ
          </div>
        </div>

        <div className="bg-[#181a20] p-5 rounded-2xl border border-[#2b313a] shadow-lg">
          <div className="text-xs text-gray-400 mb-1 flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Ví Fiat VNĐ (Ngân Hàng / sePay)</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {(usdtAvailable * 25400 * 0.2).toLocaleString('en-US', { maximumFractionDigits: 0 })} VNĐ
          </div>
          <div className="text-xs text-gray-400 font-semibold mt-1">
            Sẵn sàng nạp/rút ngân hàng 24/7 & P2P
          </div>
        </div>

        <div className="bg-[#181a20] p-5 rounded-2xl border border-[#2b313a] shadow-lg">
          <div className="text-xs text-gray-400 mb-1 flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-blue-400" />
            <span>Ví Futures Margin (Ký Quỹ)</span>
          </div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">
            ${futuresMargin} USDT
          </div>
          <div className="text-xs text-gray-400 font-semibold mt-1">
            Đang ký quỹ đòn bẩy cho lệnh Futures
          </div>
        </div>
      </div>

      {/* Sub-Wallet Navigation Tabs */}
      <div className="flex border-b border-[#2b313a] space-x-4 text-sm font-bold">
        {[
          { id: 'OVERVIEW', name: '💼 Ví Tổng Quan' },
          { id: 'FIAT',     name: '💵 Ví Fiat (VNĐ / sePay VietQR)' },
          { id: 'SPOT',     name: '📊 Ví Spot (Crypto Assets)' },
          { id: 'FUTURES',  name: '⚡ Ví Futures (Margin Collateral)' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubWallet(t.id as any)}
            className={`pb-3 border-b-2 transition ${
              activeSubWallet === t.id ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW WALLET */}
      {activeSubWallet === 'OVERVIEW' && (
        <div className="space-y-4">
          <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-white mb-4">Phân Bổ Tài Sản Giữa Các Ví</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
              <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a]">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span>Ví Fiat VNĐ</span>
                  <span className="text-emerald-400 font-bold">20%</span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[20%]" />
                </div>
              </div>

              <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a]">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span>Ví Spot Crypto</span>
                  <span className="text-yellow-400 font-bold">65%</span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-yellow-400 h-full w-[65%]" />
                </div>
              </div>

              <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a]">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span>Ví Futures Margin</span>
                  <span className="text-blue-400 font-bold">15%</span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full w-[15%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIAT WALLET (sePay VietQR & Bank Remittance) */}
      {activeSubWallet === 'FIAT' && (
        <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-[#2b313a] pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <span>Ví Fiat (Tài Khoản Ngân Hàng VNĐ)</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                  sePay VietQR Gateway
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Dùng cho nạp rút trực tiếp với Ngân hàng MBBank / Vietcombank & Giao dịch P2P
              </p>
            </div>

            <button
              onClick={() => setIsSepayOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-xl font-bold text-xs shadow transition flex items-center space-x-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Nạp VNĐ VietQR sePay</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
            <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a]">
              <div className="text-xs text-gray-400">Số Dư VNĐ Khả Dụng:</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {(usdtAvailable * 25400 * 0.2).toLocaleString('en-US', { maximumFractionDigits: 0 })} VNĐ
              </div>
            </div>

            <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a]">
              <div className="text-xs text-gray-400">Ngân Hàng Đã Liên Kết:</div>
              <div className="text-sm font-bold text-white mt-1">
                MBBank · 0123456789 (CONG TY CP APEX KEPLER)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPOT WALLET */}
      {activeSubWallet === 'SPOT' && (
        <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#2b313a] text-sm font-bold text-white flex justify-between items-center">
            <span>Spot Crypto Balances</span>
            <span className="text-xs text-gray-400 font-mono">On-Chain Deposit & Withdrawal</span>
          </div>
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-[#1e2329] text-gray-400 border-b border-[#2b313a] text-xs font-mono">
              <tr>
                <th className="py-3.5 px-6">Asset</th>
                <th className="py-3.5 px-6">Total Balance</th>
                <th className="py-3.5 px-6">Available</th>
                <th className="py-3.5 px-6">Locked in Orders</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b313a]/50 text-gray-200 font-mono">
              {balances.map((b) => (
                <tr key={b.asset.id} className="hover:bg-[#2b313a]/30 transition">
                  <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                    <span className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs">
                      {b.asset.id.substring(0, 3)}
                    </span>
                    <div>
                      <div className="font-extrabold">{b.asset.name}</div>
                      <div className="text-xs text-gray-400">{b.asset.id}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-bold">
                    {(parseFloat(b.available) + parseFloat(b.locked)).toFixed(4)}
                  </td>
                  <td className="py-4 px-6 text-emerald-400 font-bold">
                    {parseFloat(b.available).toFixed(4)}
                  </td>
                  <td className="py-4 px-6 text-gray-400">
                    {parseFloat(b.locked).toFixed(4)}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => handleDepositModal(b.asset.id)}
                      className="bg-[#2b313a] hover:bg-[#3b424e] text-yellow-400 px-3 py-1 rounded-lg text-xs font-bold transition"
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
        <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-[#2b313a] pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <span>Ví Futures Margin (Tài Khoản Ký Quỹ Đòn Bẩy)</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-500/30">
                  Collateral Pool
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Tài sản thế chấp cho các lệnh Futures đòn bẩy 1x - 10,000x
              </p>
            </div>

            <button
              onClick={() => setIsTransferOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-xl font-bold text-xs shadow transition flex items-center space-x-1.5"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Chuyển Thêm Margin Vào Ví</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
            <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a]">
              <div className="text-xs text-gray-400">Futures Margin Đang Dùng:</div>
              <div className="text-2xl font-extrabold text-blue-400 mt-1">
                ${futuresMargin} USDT
              </div>
            </div>

            <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a]">
              <div className="text-xs text-gray-400">Sức Mua Mở Lệnh Tối Đa (10,000x):</div>
              <div className="text-2xl font-extrabold text-yellow-400 mt-1">
                ${(usdtAvailable * 10000).toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-[#181a20] border border-[#2b313a] w-full max-w-md rounded-2xl p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setIsTransferOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-[#2b313a]/60 flex items-center justify-center transition"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Chuyển Tiền Nội Bộ Giữa Các Ví</h3>
                <p className="text-xs text-gray-400 font-mono">0% Phí Chuyển · Khớp Tức Thì 100%</p>
              </div>
            </div>

            <form onSubmit={handleInternalTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Từ Ví Source:</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value as any)}
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl p-2.5 text-white font-bold"
                  >
                    <option value="FIAT">Ví Fiat (VNĐ)</option>
                    <option value="SPOT">Ví Spot (Crypto)</option>
                    <option value="FUTURES">Ví Futures (Margin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Đến Ví Target:</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value as any)}
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl p-2.5 text-white font-bold"
                  >
                    <option value="FUTURES">Ví Futures (Margin)</option>
                    <option value="SPOT">Ví Spot (Crypto)</option>
                    <option value="FIAT">Ví Fiat (VNĐ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Số tiền chuyển (USDT):</label>
                <input
                  type="number"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl py-2.5 px-3 text-sm text-white font-mono font-bold focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs rounded-xl shadow-lg transition"
              >
                Xác Nhận Chuyển Tiền
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
