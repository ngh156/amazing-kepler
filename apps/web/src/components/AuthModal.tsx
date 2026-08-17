'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { X, Lock, Mail, User } from 'lucide-react';

interface AuthModalProps {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSwitchMode }) => {
  const { login, register } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, nickname);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check details.');
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

        <h2 className="text-2xl font-bold text-white mb-2">
          {mode === 'login' ? 'Welcome Back' : 'Create Kepler Account'}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {mode === 'login'
            ? 'Sign in to access your simulated crypto exchange balance.'
            : 'Register to receive 100,000 USDT test funds for spot trading.'}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
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
              <label className="block text-xs font-medium text-gray-400 mb-1">Nickname (Optional)</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="CryptoKing99"
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
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
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-semibold py-3 rounded-lg transition shadow-lg shadow-yellow-500/10 mt-2"
          >
            {isLoading ? 'Processing...' : mode === 'login' ? 'Log In' : 'Register Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button onClick={() => onSwitchMode('register')} className="text-yellow-400 font-semibold hover:underline">
                Register now
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button onClick={() => onSwitchMode('login')} className="text-yellow-400 font-semibold hover:underline">
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
