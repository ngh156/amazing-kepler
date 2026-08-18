'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { TrendingUp, Wallet, Shield, User as UserIcon, LogOut, Zap, Flame, ShieldCheck, Globe, Bell, ChevronDown, Copy, Check, Lock, Settings, CreditCard, Layers, Sparkles } from 'lucide-react';
import { AuthModal } from './AuthModal';

const formatSmartPrice = (val: number | string) => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || '0'));
  if (!num || isNaN(num)) return '---';
  if (num < 0.00001) return num.toFixed(8);
  if (num < 0.001) return num.toFixed(6);
  if (num < 1) return num.toFixed(4);
  return num.toFixed(2);
};

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, fetchProfile } = useAuthStore();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [tickerList, setTickerList] = useState<any[]>([]);
  const [serverTime, setServerTime] = useState<string>('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [language, setLanguage] = useState<'VN' | 'EN'>('VN');
  const [currency, setCurrency] = useState<'USD' | 'VND'>('USD');

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile();

    // Client-side clock to prevent React Hydration Mismatch
    setServerTime(new Date().toUTCString().slice(17, 25));
    const clockTimer = setInterval(() => {
      setServerTime(new Date().toUTCString().slice(17, 25));
    }, 1000);

    // Fetch live market ticker marquee list
    api.get('/marketdata/tickers').then((res) => {
      const topPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'PEPEUSDT', 'NEARUSDT'];
      const fetched = res.data.tickers || [];
      const filtered = fetched.filter((t: any) => topPairs.includes(t.symbol));
      setTickerList(filtered.length > 0 ? filtered : fetched.slice(0, 10));
    }).catch(() => {});

    // Listen to real-time market updates
    const socket = getSocket();
    const room = 'ticker:*';
    socket.emit('subscribe', room);

    const onUpdate = (payload: any) => {
      if (payload && payload.data && payload.data.symbol) {
        const sym = payload.data.symbol;
        setTickerList((prev) => {
          return prev.map((t) => {
            if (t.symbol === sym) {
              return {
                ...t,
                lastPrice: payload.data.price || t.lastPrice,
                priceChangePercent: payload.data.priceChangePercent !== undefined ? payload.data.priceChangePercent : t.priceChangePercent,
              };
            }
            return t;
          });
        });
      }
    };

    socket.on('update', onUpdate);

    // Close profile dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(clockTimer);
      socket.off('update', onUpdate);
      socket.emit('unsubscribe', room);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fetchProfile]);

  const navLinks = [
    { href: '/markets', label: 'Markets' },
    { href: '/heatmap', label: 'Crypto Heatmap', icon: Flame },
    { href: '/trade/BTCUSDT', label: 'Spot Trade' },
    { href: '/futures/BTCUSDT', label: 'Futures 10000x', icon: Zap },
    { href: '/p2p', label: 'P2P Trading' },
    { href: '/wallet', label: 'Assets & Wallet', icon: Wallet },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    navLinks.push({ href: '/admin', label: 'Backoffice Admin', icon: Shield });
  }

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const userUid = user?.id ? `UID-${user.id.slice(0, 8).toUpperCase()}` : 'UID-89401284';

  return (
    <header className="sticky top-0 z-50 select-none font-sans">
      {/* 1. Main Navigation Header Bar */}
      <nav className="h-16 bg-[#181a20] border-b border-[#2b313a] px-4 md:px-6 flex items-center justify-between shadow-2xl">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2 font-black text-xl text-white tracking-wider">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-yellow-500/20">
              K
            </div>
            <span className="font-extrabold tracking-tight">
              APEX<span className="text-yellow-400 font-normal ml-1">KEPLER</span>
            </span>
            <span className="text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded-full font-mono font-bold tracking-widest">
              PRO CEX
            </span>
          </Link>

          <div className="hidden lg:flex items-center space-x-6">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-extrabold transition-colors flex items-center space-x-1.5 ${
                    isActive ? 'text-yellow-400 border-b-2 border-yellow-400 py-4' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Wallet Button & Rich User Profile Dropdown */}
        <div className="flex items-center space-x-3 text-xs">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3 relative" ref={profileRef}>
              <Link
                href="/wallet"
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-xl font-extrabold font-sans transition shadow-md shadow-yellow-500/20 flex items-center space-x-1.5"
              >
                <Wallet className="w-4 h-4 fill-black" />
                <span>Wallet</span>
              </Link>

              {/* User Profile Card Button */}
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2 bg-[#14181d] hover:bg-[#1e2329] px-3.5 py-1.5 rounded-xl border border-[#2b313a] transition cursor-pointer"
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold font-mono text-xs">
                    {(user.nickname || user.email).slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#14181d]" />
                </div>

                <div className="text-left font-sans hidden sm:block">
                  <div className="font-extrabold text-white leading-tight">
                    {user.nickname || user.email.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-yellow-400 font-mono font-bold flex items-center space-x-1">
                    <span>VIP 9</span>
                    <span>·</span>
                    <span className="text-emerald-400">KYC 2</span>
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Binance-Style Rich User Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-12 w-80 bg-[#181a20] border border-[#2b313a] rounded-2xl shadow-2xl p-5 space-y-4 text-white z-50 animate-fade-in font-sans">
                  {/* Header: User Info & UID */}
                  <div className="flex items-start justify-between border-b border-[#2b313a] pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black flex items-center justify-center font-black text-lg shadow-md">
                        {(user.nickname || user.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-white text-sm flex items-center space-x-1.5">
                          <span>{user.nickname || user.email.split('@')[0]}</span>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{user.email}</div>
                        <button
                          onClick={() => handleCopyUid(userUid)}
                          className="mt-1 text-[11px] font-mono text-gray-400 hover:text-yellow-400 flex items-center space-x-1 transition"
                        >
                          <span>{userUid}</span>
                          {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="bg-[#14181d] p-2.5 rounded-xl border border-yellow-400/30 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <div>
                        <div className="text-yellow-400 font-extrabold">VIP 9 Pro</div>
                        <div className="text-[9px] text-gray-400">Maker: 0.01%</div>
                      </div>
                    </div>

                    <div className="bg-[#14181d] p-2.5 rounded-xl border border-emerald-500/30 flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-emerald-400 font-extrabold">KYC Verified</div>
                        <div className="text-[9px] text-gray-400">Level 2 Approved</div>
                      </div>
                    </div>
                  </div>

                  {/* Moved Language & Currency Switchers */}
                  <div className="bg-[#14181d] p-3 rounded-xl border border-[#2b313a] space-y-2 text-xs">
                    <div className="flex justify-between items-center text-gray-400 font-mono">
                      <span className="flex items-center space-x-1.5">
                        <Globe className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Hiển Thị Ngôn Ngữ:</span>
                      </span>
                      <div className="flex bg-[#181a20] p-0.5 rounded-lg border border-[#2b313a]">
                        <button
                          onClick={() => setLanguage('VN')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${language === 'VN' ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}
                        >
                          VN
                        </button>
                        <button
                          onClick={() => setLanguage('EN')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${language === 'EN' ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}
                        >
                          EN
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-gray-400 font-mono">
                      <span className="flex items-center space-x-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mệnh Giá Quy Đổi:</span>
                      </span>
                      <div className="flex bg-[#181a20] p-0.5 rounded-lg border border-[#2b313a]">
                        <button
                          onClick={() => setCurrency('USD')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${currency === 'USD' ? 'bg-emerald-400 text-black' : 'text-gray-400'}`}
                        >
                          USDT
                        </button>
                        <button
                          onClick={() => setCurrency('VND')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${currency === 'VND' ? 'bg-emerald-400 text-black' : 'text-gray-400'}`}
                        >
                          VND
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Wallet Quick Links */}
                  <div className="space-y-1 pt-1 text-xs">
                    <Link
                      href="/wallet"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 hover:bg-[#2b313a]/50 rounded-xl text-gray-200 hover:text-white transition"
                    >
                      <span className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-yellow-400" />
                        <span>💼 Ví Tổng Quan & Chuyển Tiền</span>
                      </span>
                      <span className="text-[10px] text-yellow-400 font-mono">500,000 USDT</span>
                    </Link>

                    <Link
                      href="/p2p"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 hover:bg-[#2b313a]/50 rounded-xl text-gray-200 hover:text-white transition"
                    >
                      <span className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        <span>💵 Ví Fiat & Nạp VietQR sePay</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Bank Direct</span>
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="border-t border-[#2b313a] pt-3">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-extrabold rounded-xl transition flex items-center justify-center space-x-2 text-xs"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng Xuất Tài Khoản</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="text-white hover:text-yellow-400 font-bold px-3 py-1.5 transition font-sans"
              >
                Log In
              </Link>
              <Link
                href="/login"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold px-4 py-1.5 rounded-xl transition shadow-md font-sans"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="bg-[#14181d] border-b border-[#2b313a] px-4 py-1.5 flex items-center justify-between text-[11px] font-sans text-gray-300 overflow-x-auto">
        <div className="flex items-center space-x-6 whitespace-nowrap font-mono">
          <span className="text-yellow-400 font-extrabold flex items-center space-x-1.5 font-sans">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE CEX TICKERS:</span>
          </span>

          {tickerList.slice(0, 10).map((t) => {
            const pct = parseFloat(t.priceChangePercent || '0');
            const isUp = pct >= 0;
            return (
              <Link
                key={t.symbol}
                href={`/futures/${t.symbol}`}
                className="flex items-center space-x-1.5 hover:text-white transition"
              >
                <span className="font-bold text-white">{t.symbol.replace('USDT', '')}</span>
                <span className="text-gray-300 font-semibold">
                  ${formatSmartPrice(t.lastPrice)}
                </span>
                <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isUp ? '+' : ''}{pct}%
                </span>
              </Link>
            );
          })}
        </div>

        <div className="hidden xl:flex items-center space-x-4 text-gray-400 text-[11px] font-sans font-medium">
          <span className="text-gray-300 tracking-normal" suppressHydrationWarning>Server Time: {serverTime || '07:52:32'} UTC</span>
          <span className="text-emerald-400 font-bold">⚡ WebSocket: 4ms Latency</span>
        </div>
      </div>

      {isAuthOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setIsAuthOpen(false)}
          onSwitchMode={(m) => setAuthMode(m)}
        />
      )}
    </header>
  );
};
