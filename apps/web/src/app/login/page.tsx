'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';
import { Zap, ShieldCheck, Mail, Lock, UserCheck, KeyRound, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('admin@kepler.exchange');
  const [password, setPassword] = useState('Password123!');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLoginTab) {
        const res = await api.post('/auth/login', { email, password });
        login(res.data.user, res.data.accessToken);
        router.push('/futures/BTCUSDT');
      } else {
        const res = await api.post('/auth/register', { email, password, nickname: nickname || email.split('@')[0] });
        login(res.data.user, res.data.accessToken);
        router.push('/futures/BTCUSDT');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (acctEmail: string) => {
    setEmail(acctEmail);
    setPassword('Password123!');
    setIsLoginTab(true);
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
        <div className="flex bg-[#14181d] p-1 rounded-xl border border-[#2b313a] mb-5">
          <button
            onClick={() => setIsLoginTab(true)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              isLoginTab ? 'bg-yellow-400 text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLoginTab(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              !isLoginTab ? 'bg-yellow-400 text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl mb-4 text-red-400 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginTab && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Nickname</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Satoshi_Trader"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:border-yellow-400 focus:outline-none"
                />
                <UserCheck className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#14181d] border border-[#2b313a] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:border-yellow-400 focus:outline-none"
              />
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Password</label>
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
            <span>{loading ? 'Authenticating...' : isLoginTab ? 'Sign In to Trade' : 'Create Free Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

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
