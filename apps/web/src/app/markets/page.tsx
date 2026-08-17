'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Search, Star, TrendingUp } from 'lucide-react';

export default function MarketsPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'USDT' | 'BTC'>('ALL');

  useEffect(() => {
    api.get('/markets').then((res) => {
      setMarkets(res.data.markets || []);
    });
  }, []);

  const filteredMarkets = markets.filter((m) => {
    const matchesSearch = m.symbol.toLowerCase().includes(search.toLowerCase());
    if (filterTab === 'USDT') return matchesSearch && m.quoteAssetId === 'USDT';
    if (filterTab === 'BTC') return matchesSearch && m.quoteAssetId === 'BTC';
    return matchesSearch;
  });

  return (
    <div className="flex-1 bg-[#12161c] p-6 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-6">Markets Overview</h1>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 bg-[#181a20] p-1 rounded-lg border border-[#2b313a]">
          {['ALL', 'USDT', 'BTC'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTab(t as any)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                filterTab === t ? 'bg-yellow-400 text-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t} Markets
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coin name or pair..."
            className="bg-[#181a20] border border-[#2b313a] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 w-full md:w-64"
          />
        </div>
      </div>

      {/* Markets Table */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-[#1e2329] text-gray-400 border-b border-[#2b313a] text-xs">
            <tr>
              <th className="py-3.5 px-6">Pair</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6">Liquidity Profile</th>
              <th className="py-3.5 px-6">Min Quantity</th>
              <th className="py-3.5 px-6 text-right">Trade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b313a]/50 text-gray-200">
            {filteredMarkets.map((m) => (
              <tr key={m.id} className="hover:bg-[#2b313a]/30 transition">
                <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                  <Star className="w-4 h-4 text-gray-600 hover:text-yellow-400 cursor-pointer" />
                  <span>{m.symbol}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-mono">
                    {m.status}
                  </span>
                </td>
                <td className="py-4 px-6 font-mono text-xs">{m.liquidityProfile}</td>
                <td className="py-4 px-6 font-mono text-xs text-gray-400">{m.minQuantity}</td>
                <td className="py-4 px-6 text-right">
                  <Link
                    href={`/trade/${m.id}`}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-1.5 rounded-lg text-xs transition"
                  >
                    Trade
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
