'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { TrendingUp, Wallet, Shield, User as UserIcon, LogOut, Zap, Flame, ShieldCheck, Globe, Bell, ChevronDown } from 'lucide-react';
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

  useEffect(() => {
    fetchProfile();

    // Client-side clock to prevent React Hydration Mismatch
    setServerTime(new Date().toUTCString().slice(17, 25));
    const clockTimer = setInterval(() => {
      setServerTime(new Date().toUTCString().slice(17, 25));
    }, 1000);

    // Fetch live market ticker marquee list
    api.get('/marketdata/tickers').then((res) => {
      const topPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'PEPEUSDT', 'TURBOUSDT'];
      const fetched = res.data.tickers || [];
      const filtered = fetched.filter((t: any) => topPairs.includes(t.symbol));
      setTickerList(filtered.length > 0 ? filtered : fetched.slice(0, 7));
    }).catch(() => {});

    // Listen to real-time market updates
    const socket = getSocket();
    const room = 'market:*:ticker';
    socket.emit('subscribe', room);

    const onUpdate = (payload: any) => {
      if (payload && payload.data && payload.data.symbol) {
        setTickerList((prev) => {
          const map = new Map(prev.map((t) => [t.symbol, t]));
          const existing = map.get(payload.data.symbol) || {};
          map.set(payload.data.symbol, {
            ...existing,
            symbol: payload.data.symbol,
            lastPrice: payload.data.price,
            priceChangePercent: payload.data.priceChangePercent ?? existing.priceChangePercent,
          });
          return Array.from(map.values());
        });
      }
    };

    socket.on('update', onUpdate);
    return () => {
      clearInterval(clockTimer);
      socket.off('update', onUpdate);
      socket.emit('unsubscribe', room);
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

        {/* Right: Auth Controls, User Profile, Language & Currency */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="hidden md:flex items-center space-x-2 bg-[#14181d] px-2.5 py-1 rounded-xl border border-[#2b313a] text-[11px] text-gray-300">
            <Globe className="w-3.5 h-3.5 text-yellow-400" />
            <span>VN / EN</span>
            <span className="text-gray-600">|</span>
            <span className="text-emerald-400 font-bold">USDT / VND</span>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <Link
                href="/wallet"
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-3.5 py-1.5 rounded-xl font-bold font-sans transition shadow-md shadow-yellow-500/20 flex items-center space-x-1.5"
              >
                <Wallet className="w-3.5 h-3.5 fill-black" />
                <span>Wallet</span>
              </Link>

              <div className="flex items-center space-x-2 bg-[#14181d] px-3 py-1.5 rounded-xl border border-[#2b313a]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white font-sans">{user.nickname || user.email.split('@')[0]}</span>
                <span className="bg-yellow-400/20 text-yellow-400 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono border border-yellow-400/30">
                  VIP 9
                </span>
              </div>

              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-[#2b313a] transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
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

      {/* 2. Sub-Header Live Market Ticker Marquee Bar */}
      <div className="bg-[#14181d] border-b border-[#2b313a] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-gray-300 overflow-x-auto">
        <div className="flex items-center space-x-6 whitespace-nowrap">
          <span className="text-yellow-400 font-extrabold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE CEX TICKERS:</span>
          </span>

          {tickerList.slice(0, 7).map((t) => {
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

        <div className="hidden xl:flex items-center space-x-4 text-gray-400 text-[10px]">
          <span suppressHydrationWarning>Server Time: {serverTime || '07:19:12'} UTC</span>
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
