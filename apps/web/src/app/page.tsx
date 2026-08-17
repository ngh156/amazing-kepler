'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { TrendingUp, ShieldCheck, Zap, Layers, ChevronRight, Lock, Repeat, Wallet, ArrowUpRight, ArrowDownLeft, PieChart } from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [tickers, setTickers] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);

  useEffect(() => {
    api.get('/marketdata/tickers').then((res) => {
      setTickers(res.data.tickers || []);
    });

    if (isAuthenticated) {
      api.get('/wallets/balances').then((res) => {
        setBalances(res.data.balances || []);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  // Compute Total Portfolio Value in USDT
  const totalUsdtVal = balances.reduce((acc, b) => {
    const avail = parseFloat(b.available || '0');
    const locked = parseFloat(b.locked || '0');
    const total = avail + locked;
    if (b.asset.id === 'USDT') return acc + total;

    const ticker = tickers.find((t) => t.symbol === `${b.asset.id}USDT`);
    const price = ticker ? parseFloat(ticker.lastPrice) : 1;
    return acc + total * price;
  }, 500000); // Default to 500k demo balance if offline

  const btcPrice = tickers.find((t) => t.symbol === 'BTCUSDT')?.lastPrice || 63500;
  const equivBtcVal = totalUsdtVal / parseFloat(btcPrice.toString());

  return (
    <div className="flex-1 flex flex-col bg-[#12161c]">
      {/* Logged In User Total Asset Portfolio Card */}
      {isAuthenticated && (
        <section className="bg-[#181a20] border-b border-[#2b313a] py-6 px-6 font-sans">
          <div className="max-w-6xl mx-auto bg-gradient-to-r from-[#1e2329] via-[#181a20] to-[#1e2329] p-6 rounded-2xl border border-yellow-500/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                <Wallet className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Estimated Total Net Assets</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">Verified</span>
                </div>
                <div className="text-3xl font-extrabold text-white font-mono mt-1">
                  ${totalUsdtVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  <span className="text-yellow-400 text-lg">USDT</span>
                </div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">
                  ≈ {equivBtcVal.toFixed(4)} BTC · 24h PnL: <span className="text-emerald-400 font-bold">+$0.00 (+0.00%)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Link
                href="/wallet"
                className="flex-1 md:flex-none bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-5 py-2.5 rounded-xl transition text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-yellow-500/10"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Deposit USDT</span>
              </Link>
              <Link
                href="/trade/BTCUSDT"
                className="flex-1 md:flex-none bg-[#2b313a] hover:bg-[#363c4e] text-white font-semibold px-5 py-2.5 rounded-xl transition text-xs flex items-center justify-center space-x-1.5 border border-[#363c4e]"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Spot Trade</span>
              </Link>
              <Link
                href="/futures/BTCUSDT"
                className="flex-1 md:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold px-5 py-2.5 rounded-xl transition text-xs flex items-center justify-center space-x-1.5 border border-red-500/30"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Futures 100x</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Hero Banner */}
      <section className="relative py-16 px-6 border-b border-[#2b313a] overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full text-yellow-400 text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" />
            <span>INSTANT IN-MEMORY MATCHING ENGINE & SYNTHETIC LIQUIDITY</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            The Next-Generation <br />
            <span className="bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              Hybrid Crypto Exchange
            </span>{' '}
            Simulation
          </h1>

          <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-10 leading-relaxed">
            Experience real-time order matching, double-entry ledger accounting, external price feed reference, synthetic depth liquidity, Sepolia testnet blockchain deposits, and P2P marketplace escrow.
          </p>

          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/trade/BTCUSDT"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 py-3.5 rounded-xl transition shadow-lg shadow-yellow-500/20 flex items-center space-x-2 text-base"
            >
              <span>Start Spot Trading</span>
              <ChevronRight className="w-5 h-5" />
            </Link>

            <Link
              href="/futures/BTCUSDT"
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold px-6 py-3.5 rounded-xl transition border border-red-500/30 text-base flex items-center space-x-2"
            >
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>Futures 100x Terminal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Top Tickers Table */}
      <section className="py-12 px-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <span>Market Highlights</span>
          </h2>
          <Link href="/markets" className="text-xs text-yellow-400 hover:underline flex items-center space-x-1 font-semibold">
            <span>View All Markets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-[#181a20] border border-[#2b313a] rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-[#1e2329] text-gray-400 border-b border-[#2b313a] text-xs">
              <tr>
                <th className="py-3.5 px-6">Pair</th>
                <th className="py-3.5 px-6">Last Price</th>
                <th className="py-3.5 px-6">24h Change</th>
                <th className="py-3.5 px-6">24h High / Low</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b313a]/50 text-gray-200">
              {tickers.map((t) => {
                const isPos = parseFloat(t.priceChangePercent) >= 0;
                return (
                  <tr key={t.symbol} className="hover:bg-[#2b313a]/30 transition">
                    <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-mono text-xs">
                        {t.symbol.substring(0, 3)}
                      </span>
                      <div>
                        <div>{t.displaySymbol}</div>
                        <div className="text-[10px] text-gray-500 font-mono">SPOT</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono font-semibold text-white">${t.lastPrice}</td>
                    <td className={`py-4 px-6 font-mono font-bold ${isPos ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {isPos ? '+' : ''}
                      {t.priceChangePercent}%
                    </td>
                    <td className="py-4 px-6 font-mono text-gray-400 text-xs">
                      ${t.high24h.toFixed(2)} / ${t.low24h.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/trade/${t.symbol}`}
                        className="bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 font-semibold px-4 py-1.5 rounded-lg text-xs transition border border-yellow-400/30"
                      >
                        Trade
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-6 bg-[#181a20]/50 border-t border-[#2b313a]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#181a20] border border-[#2b313a] p-6 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Price-Time Matching Engine</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              In-memory matching engine supporting Limit and Market orders with real-time order state machine execution.
            </p>
          </div>

          <div className="bg-[#181a20] border border-[#2b313a] p-6 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Double-Entry Financial Ledger</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Strict accounting integrity ensuring total debit equals credit for every trade settlement, lock, and unlock.
            </p>
          </div>

          <div className="bg-[#181a20] border border-[#2b313a] p-6 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Repeat className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">P2P Escrow Marketplace</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Secure P2P fiat marketplace with automatic seller crypto escrow locking, payment verification, and dispute resolution.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
