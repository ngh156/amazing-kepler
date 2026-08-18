'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { X, Lock, Mail, User, KeyRound, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

interface AuthModalProps {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSwitchMode }) => {
  const { requestOtp, verifyOtp } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    setError('');
    setInfoMessage('');
    setIsLoading(true);

    try {
      const res = await requestOtp(email, password, mode);
      setDemoOtpCode(res.demoOtpCode || null);
      setInfoMessage(res.message || 'Mã OTP 6 chữ số đã được gửi về email của bạn.');
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await verifyOtp(email, otpCode, password, nickname, mode);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e2329] border border-[#2b313a] rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {step === 'otp' && (
          <button
            onClick={() => {
              setStep('credentials');
              setError('');
            }}
            className="flex items-center space-x-1 text-xs text-yellow-400 hover:underline mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại nhập thông tin</span>
          </button>
        )}

        <h2 className="text-2xl font-bold text-white mb-1 flex items-center space-x-2">
          <span>{mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Tài Khoản'}</span>
          <ShieldCheck className="w-5 h-5 text-yellow-400" />
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          {step === 'credentials'
            ? mode === 'login'
              ? 'Nhập Email & Mật khẩu để nhận mã xác thực OTP qua Email.'
              : 'Đăng ký tài khoản nhận ngay 100,000 USDT tiền Demo trải nghiệm.'
            : `Nhập mã xác thực 6 chữ số gửi tới email ${email}`}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-4">
            ⚠️ {error}
          </div>
        )}

        {infoMessage && step === 'otp' && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs p-3 rounded-lg mb-4">
            <p>📧 {infoMessage}</p>
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Địa Chỉ Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@kepler.exchange"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Biệt Danh / Nickname (Tùy chọn)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="CryptoTrader88"
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Mật Khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition shadow-lg shadow-yellow-500/10 mt-2 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Đang gửi OTP...' : 'Gửi Mã OTP Xác Thực Email'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-yellow-400 mb-1">Mã Xác Thực OTP Email (6 chữ số)</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-yellow-400 absolute left-3 top-3" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#14181d] border-2 border-yellow-400/80 rounded-lg pl-9 pr-4 py-3 text-lg font-mono tracking-widest text-center text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
              <span>Không nhận được mã?</span>
              <button
                type="button"
                disabled={resendTimer > 0 || isLoading}
                onClick={handleRequestOtp}
                className="text-yellow-400 hover:underline disabled:opacity-50 font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{resendTimer > 0 ? `Gửi lại mã (${resendTimer}s)` : 'Gửi lại mã OTP'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition shadow-lg shadow-yellow-500/10 mt-2"
            >
              {isLoading ? 'Đang xác thực...' : 'Xác Nhận & Đăng Nhập'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-gray-400">
          {mode === 'login' ? (
            <p>
              Chưa có tài khoản?{' '}
              <button
                onClick={() => {
                  setStep('credentials');
                  onSwitchMode('register');
                }}
                className="text-yellow-400 font-semibold hover:underline"
              >
                Đăng ký ngay
              </button>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{' '}
              <button
                onClick={() => {
                  setStep('credentials');
                  onSwitchMode('login');
                }}
                className="text-yellow-400 font-semibold hover:underline"
              >
                Đăng nhập ngay
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
