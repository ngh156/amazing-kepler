'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { QrCode, Building2, CheckCircle2, AlertCircle, Copy, Check, RefreshCw, Zap, ArrowRight } from 'lucide-react';

interface SepayDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SepayDepositModal: React.FC<SepayDepositModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [amountVND, setAmountVND] = useState('1000000');
  const [depositData, setDepositData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDepositData(null);
      setIsSuccess(false);
      return;
    }

    // Subscribe to real-time deposit WebSocket notifications
    const socket = getSocket();
    const onDepositSuccess = (payload: any) => {
      if (depositData && payload && payload.code === depositData.deposit?.code) {
        setIsSuccess(true);
        setSuccessMsg(`Tự động nạp +${payload.amountUSDT} USDT (${payload.amountVND.toLocaleString()} VNĐ) thành công!`);
        onSuccess();
      }
    };

    socket.on('update', onDepositSuccess);
    return () => {
      socket.off('update', onDepositSuccess);
    };
  }, [isOpen, depositData, onSuccess]);

  const handleCreateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/sepay/deposit-qr', { amountVND });
      setDepositData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo mã VietQR');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!depositData?.deposit?.code) return;
    setSimulating(true);
    try {
      const res = await api.post('/sepay/simulate-webhook', { code: depositData.deposit.code });
      setIsSuccess(true);
      setSuccessMsg(res.data.message);
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Simulate failed');
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'acc') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    }
  };

  if (!isOpen) return null;

  const vndNum = parseFloat(amountVND) || 0;
  const usdtEquiv = (vndNum / 25400).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#181a20] border border-[#2b313a] w-full max-w-lg rounded-2xl p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-[#2b313a]/60 flex items-center justify-center transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
              <span>Nạp Tiền Ngân Hàng Qua sePay VietQR</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                Tự Động 24/7
              </span>
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Quét VietQR từ bất kỳ App Ngân hàng (MB, VCB, Techcombank...) · Khớp tiền tức thì
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-extrabold text-emerald-400">NẠP TIỀN TỰ ĐỘNG THÀNH CÔNG!</h4>
            <p className="text-sm text-gray-300 font-mono max-w-xs mx-auto leading-relaxed bg-[#14181d] p-3 rounded-xl border border-emerald-500/30">
              {successMsg}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-xl shadow-lg transition"
            >
              Hoàn Tất & Về Ví
            </button>
          </div>
        ) : !depositData ? (
          <form onSubmit={handleCreateQR} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Số tiền nạp (VNĐ):
              </label>
              <input
                type="number"
                step="10000"
                min="50000"
                required
                value={amountVND}
                onChange={(e) => setAmountVND(e.target.value)}
                placeholder="1,000,000"
                className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl py-2.5 px-3 text-sm text-white font-mono font-bold focus:border-yellow-400 focus:outline-none"
              />
              <div className="flex justify-between items-center text-xs text-gray-400 font-mono mt-1">
                <span>Tỷ giá cố định: 1 USDT = 25,400 VNĐ</span>
                <span className="text-emerald-400 font-bold">~ {usdtEquiv} USDT</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {['200000', '500000', '1000000', '5000000'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountVND(val)}
                  className={`py-1.5 rounded-lg border transition ${
                    amountVND === val ? 'bg-yellow-400 text-black border-yellow-400 font-bold' : 'bg-[#14181d] border-[#2b313a] text-gray-400 hover:text-white'
                  }`}
                >
                  {(Number(val) / 1000).toLocaleString()}k
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <QrCode className="w-4 h-4" />
              <span>{loading ? 'Đang tạo mã VietQR...' : 'Tạo Mã VietQR Nạp Tiền'}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* VietQR Image */}
            <div className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-inner max-w-[220px] mx-auto border-2 border-emerald-500">
              <img
                src={depositData.qrUrl}
                alt="sePay VietQR"
                className="w-full h-auto rounded-lg"
              />
              <span className="text-[10px] font-bold text-black font-mono mt-1">
                Quét VietQR bằng App Ngân Hàng
              </span>
            </div>

            {/* Bank Transfer Details */}
            <div className="bg-[#14181d] p-3.5 rounded-xl border border-[#2b313a] space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Ngân hàng:</span>
                <span className="text-yellow-400 font-extrabold">{depositData.bankConfig.bankName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Số tài khoản:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-white font-bold">{depositData.bankConfig.accountNo}</span>
                  <button
                    onClick={() => copyToClipboard(depositData.bankConfig.accountNo, 'acc')}
                    className="text-gray-400 hover:text-white"
                  >
                    {copiedAcc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Số tiền VNĐ:</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  {depositData.deposit.amountVND.toLocaleString()} VNĐ (~{depositData.deposit.amountUSDT} USDT)
                </span>
              </div>

              <div className="flex justify-between items-center bg-yellow-400/10 p-2 rounded-lg border border-yellow-400/30">
                <span className="text-yellow-400 font-bold text-[11px]">Nội dung chuyển:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-yellow-400 font-black text-sm">{depositData.deposit.code}</span>
                  <button
                    onClick={() => copyToClipboard(depositData.deposit.code, 'code')}
                    className="text-yellow-400 hover:text-white"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Note & Demo Instant Webhook Button */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2b313a]">
              <div className="text-[10px] text-gray-400 font-mono">
                ⏳ Đang chờ sePay Webhook tự động duyệt...
              </div>

              <button
                onClick={handleSimulateWebhook}
                disabled={simulating}
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>{simulating ? 'Đang duyệt...' : 'Giả Lập Bank Khớp Tiền Nhanh'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
