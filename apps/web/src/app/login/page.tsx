'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { Zap, ShieldCheck, Mail, Lock, UserCheck, KeyRound, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp } = useAuthStore();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('demo@kepler.io');
  const [password, setPassword] = useState('123456');
  const [nickname, setNickname] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const startCountdown = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const mode = isLoginTab ? 'login' : 'register';
      const res = await requestOtp(email, password, mode);
      setDemoOtpCode(res.demoOtpCode || null);
      setInfoMessage(res.message || 'Mã OTP 6 chữ số đã được gửi về email của bạn.');
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại Email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const mode = isLoginTab ? 'login' : 'register';
      await verifyOtp(email, otpCode, password, nickname, mode);
      router.push('/futures/BTCUSDT');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (acctEmail: string) => {
    setEmail(acctEmail);
    setPassword('Password123!');
    setIsLoginTab(true);
    setStep('credentials');
  };

  return (
    <div className="min-h-screen bg-[#12161c] flex items-center justify-center p-4 font-sans select-none text-white">
      <div className="w-full max-w-md bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 mb-6 border-b border-[#2b313a] pb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center font-black text-black text-xl shadow-lg">
            K
          </div>
          <div>
            <h2 className="text-xl font-extrabold flex items-center space-x-2">
              <span>APEX KEPLER</span>
              <span className="bg-yellow-400/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded font-mono border border-yellow-400/30">
                CEX Portal
              </span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Institutional Hybrid Exchange Gateway
            </p>
          </div>
        </div>

        {/* Auth Tab Switcher */}
        {step === 'credentials' ? (
          <div className="flex bg-[#14181d] p-1 rounded-xl border border-[#2b313a] mb-5">
            <button
              onClick={() => setIsLoginTab(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                isLoginTab ? 'bg-yellow-400 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              onClick={() => setIsLoginTab(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                !isLoginTab ? 'bg-yellow-400 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tạo Tài Khoản
            </button>
          </div>
        ) : (
          <button
            onClick={() => setStep('credentials')}
            className="flex items-center space-x-1.5 text-xs text-yellow-400 hover:underline mb-4 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại nhập email & mật khẩu</span>
          </button>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl mb-4 text-red-400 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Info Message & Demo OTP Helper */}
        {infoMessage && step === 'otp' && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs p-3 rounded-xl mb-4">
            <p>📧 {infoMessage}</p>
          </div>
        )}

        {/* Form Step 1: Email & Password */}
        {step === 'credentials' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {!isLoginTab && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nickname (Biệt danh)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Satoshi_Trader"
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:border-yellow-400 focus:outline-none"
                  />
                  <UserCheck className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Địa Chỉ Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@kepler.io"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:border-yellow-400 focus:outline-none"
                />
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Mật Khẩu</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:border-yellow-400 focus:outline-none"
                />
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Đang gửi OTP Email...' : 'Gửi Mã OTP Xác Thực'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Form Step 2: 6-digit OTP Verification */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-yellow-400 mb-1">Mã Xác Thực OTP 6 Chữ Số</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#14181d] border-2 border-yellow-400/80 rounded-xl py-3 text-xl font-mono text-center tracking-widest text-white focus:border-yellow-400 focus:outline-none"
                />
                <KeyRound className="w-5 h-5 text-yellow-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
              <span>Không nhận được mã?</span>
              <button
                type="button"
                disabled={resendTimer > 0 || loading}
                onClick={handleRequestOtp}
                className="text-yellow-400 hover:underline disabled:opacity-50 font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{resendTimer > 0 ? `Gửi lại mã (${resendTimer}s)` : 'Gửi lại mã OTP'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Đang xác thực phiên...' : 'Xác Nhận & Vào Sàn Giao Dịch'}</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 1-Click Quick Demo Account Buttons */}
        <div className="mt-6 border-t border-[#2b313a] pt-4">
          <div className="text-[11px] text-gray-400 font-semibold mb-2">1-Click Quick Demo Credentials ($500k Funded):</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillQuickAccount('admin@kepler.exchange')}
              className="bg-[#14181d] hover:bg-[#2b313a] p-2 rounded-lg border border-yellow-400/30 text-left transition"
            >
              <div className="text-[10px] font-bold text-yellow-400">👑 Admin</div>
              <div className="text-[9px] text-gray-400 font-mono truncate">admin@...</div>
            </button>

            <button
              onClick={() => fillQuickAccount('merchant@kepler.exchange')}
              className="bg-[#14181d] hover:bg-[#2b313a] p-2 rounded-lg border border-emerald-500/30 text-left transition"
            >
              <div className="text-[10px] font-bold text-emerald-400">💼 Merchant</div>
              <div className="text-[9px] text-gray-400 font-mono truncate">merchant@...</div>
            </button>

            <button
              onClick={() => fillQuickAccount('trader@kepler.exchange')}
              className="bg-[#14181d] hover:bg-[#2b313a] p-2 rounded-lg border border-blue-400/30 text-left transition"
            >
              <div className="text-[10px] font-bold text-blue-400">📈 Trader</div>
              <div className="text-[9px] text-gray-400 font-mono truncate">trader@...</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
