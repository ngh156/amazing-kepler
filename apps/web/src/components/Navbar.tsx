'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { TrendingUp, Wallet, Shield, User as UserIcon, LogOut, Zap, Flame } from 'lucide-react';
import { AuthModal } from './AuthModal';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, fetchProfile } = useAuthStore();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const navLinks = [
    { href: '/markets', label: 'Markets' },
    { href: '/heatmap', label: 'Crypto Heatmap', icon: Flame },
    { href: '/trade/BTCUSDT', label: 'Spot Trade' },
    { href: '/futures/BTCUSDT', label: 'Futures 100x', icon: Zap },
    { href: '/p2p', label: 'P2P Trading' },
    { href: '/wallet', label: 'Assets & Wallet', icon: Wallet },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    navLinks.push({ href: '/admin', label: 'Backoffice Admin', icon: Shield });
  }

  return (
    <>
      <nav className="h-16 bg-[#181a20] border-b border-[#2b313a] px-6 flex items-center justify-between sticky top-0 z-50">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2 font-bold text-xl text-white tracking-wider">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-black text-lg shadow-lg shadow-yellow-500/20">
              K
            </div>
            <span>
              APEX<span className="text-yellow-400 font-normal ml-1">KEPLER</span>
            </span>
            <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-mono">
              SIMULATION
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    isActive ? 'text-yellow-400 font-semibold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Auth Controls & Profile */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-4">
              <Link href="/wallet" className="flex items-center space-x-2 bg-[#2b313a] hover:bg-[#363c4e] text-white px-3 py-1.5 rounded-md text-sm font-medium transition">
                <Wallet className="w-4 h-4 text-yellow-400" />
                <span>Wallet</span>
              </Link>
              <div className="flex items-center space-x-2 text-sm text-gray-300 bg-[#1e2329] px-3 py-1.5 rounded-md border border-[#2b313a]">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span className="font-mono text-white">{user.nickname || user.email.split('@')[0]}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded">
                  {user.kycLevel}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-400 p-2 rounded-md transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                className="text-sm font-medium text-white hover:text-yellow-400 px-3 py-1.5 transition"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setAuthMode('register');
                  setIsAuthOpen(true);
                }}
                className="text-sm font-medium bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-1.5 rounded-md font-semibold transition shadow-md shadow-yellow-500/10"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </nav>

      {isAuthOpen && (
        <AuthModal mode={authMode} onClose={() => setIsAuthOpen(false)} onSwitchMode={(m) => setAuthMode(m)} />
      )}
    </>
  );
};
