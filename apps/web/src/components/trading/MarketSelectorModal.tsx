'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Search, ChevronDown, TrendingUp, TrendingDown, ArrowUpDown, Star } from 'lucide-react';

interface MarketSelectorModalProps {
  currentSymbol: string;
  mode: 'spot' | 'futures';
}

export const MarketSelectorModal: React.FC<MarketSelectorModalProps> = ({ currentSymbol, mode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tickers, setTickers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'ALL' | 'MEMES' | 'LAYER1' | 'DEFI'>('ALL');
  const [sortBy, setSortBy] = useState<'GAINERS' | 'LOSERS' | 'VOLUME' | 'NAME'>('VOLUME');

  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const formattedCurrent = `${(currentSymbol || 'BTCUSDT').replace('USDT', '')}/USDT`;

  useEffect(() => {
    // Fetch initial tickers
    api.get('/marketdata/tickers').then((res) => {
      if (res.data && Array.isArray(res.data.tickers)) {
        setTickers(res.data.tickers);
      }
    }).catch(() => {});

    // Subscribe to real-time ticker updates
    const socket = getSocket();
    const room = 'market:*:ticker';
    socket.emit('subscribe', room);

    const onUpdate = (payload: any) => {
      if (payload && payload.data && payload.data.symbol) {
        setTickers((prev) => {
          const map = new Map(prev.map((t) => [t.symbol, t]));
          const existing = map.get(payload.data.symbol) || {};
          map.set(payload.data.symbol, {
            ...existing,
            symbol: payload.data.symbol,
            lastPrice: payload.data.price,
          });
          return Array.from(map.values());
        });
      }
    };

    socket.on('update', onUpdate);

    return () => {
      socket.off('update', onUpdate);
      socket.emit('unsubscribe', room);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const MEME_LIST = ['DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'WIFUSDT', 'FLOKIUSDT', 'BONKUSDT'];
  const DEFI_LIST = ['UNIUSDT', 'AAVEUSDT', 'LINKUSDT', 'FETUSDT', 'RNDRUSDT', 'INJUSDT', 'TIAUSDT', 'FILUSDT', 'ICPUSDT', 'STXUSDT'];

  const filteredTickers = tickers
    .filter((t) => {
      if (!t || !t.symbol) return false;
      const matchSearch = String(t.symbol).toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (category === 'MEMES') return MEME_LIST.includes(t.symbol);
      if (category === 'DEFI') return DEFI_LIST.includes(t.symbol);
      return true;
    })
    .sort((a, b) => {
      const pctA = a.priceChangePercent ?? 0;
      const pctB = b.priceChangePercent ?? 0;
      const volA = Number(a.volume24h ?? 0);
      const volB = Number(b.volume24h ?? 0);

      if (sortBy === 'GAINERS') return pctB - pctA;
      if (sortBy === 'LOSERS') return pctA - pctB;
      if (sortBy === 'VOLUME') return volB - volA;
      return (a.symbol || '').localeCompare(b.symbol || '');
    });

  const handleSelectMarket = (targetSymbol: string) => {
    setIsOpen(false);
    const targetPath = mode === 'futures' ? `/futures/${targetSymbol}` : `/trade/${targetSymbol}`;
    router.push(targetPath);
  };

  return (
    <div className="relative font-sans z-40" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-[#1e2329] hover:bg-[#2b313a] border border-[#2b313a] px-3 py-1.5 rounded-lg transition"
      >
        <span className="font-bold text-base text-white">{formattedCurrent}</span>
        <ChevronDown className={`w-4 h-4 text-yellow-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Selector Dropdown Modal */}
      {isOpen && (
        <div className="absolute left-0 top-11 w-[380px] bg-[#181a20] border border-[#2b313a] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol (e.g. BTC, PEPE, SOL)..."
              className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 mb-3 border-b border-[#2b313a] pb-2 text-[11px] font-semibold">
            {['ALL', 'MEMES', 'DEFI'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat as any)}
                className={`px-2.5 py-1 rounded transition ${
                  category === cat ? 'bg-yellow-400 text-black font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mb-2 px-1">
            <span>Sort by:</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSortBy('GAINERS')}
                className={`flex items-center space-x-1 ${sortBy === 'GAINERS' ? 'text-emerald-400 font-bold' : 'hover:text-white'}`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Gainers</span>
              </button>
              <button
                onClick={() => setSortBy('LOSERS')}
                className={`flex items-center space-x-1 ${sortBy === 'LOSERS' ? 'text-red-400 font-bold' : 'hover:text-white'}`}
              >
                <TrendingDown className="w-3 h-3" />
                <span>Losers</span>
              </button>
              <button
                onClick={() => setSortBy('VOLUME')}
                className={`flex items-center space-x-1 ${sortBy === 'VOLUME' ? 'text-yellow-400 font-bold' : 'hover:text-white'}`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>Volume</span>
              </button>
            </div>
          </div>

          {/* Markets List Table */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#2b313a]/40 font-mono text-xs">
            {filteredTickers.length === 0 ? (
              <div className="py-6 text-center text-gray-500 font-sans">No pairs found matching search</div>
            ) : (
              filteredTickers.map((t) => {
                const base = t.symbol.replace('USDT', '');
                const pct = t.priceChangePercent ?? 0;
                const isProfit = pct >= 0;
                const price = Number(t.lastPrice || 0);

                return (
                  <div
                    key={t.symbol}
                    onClick={() => handleSelectMarket(t.symbol)}
                    className="flex items-center justify-between py-2 px-2 hover:bg-[#2b313a]/50 cursor-pointer rounded transition group"
                  >
                    <div className="flex items-center space-x-2">
                      <Star className="w-3.5 h-3.5 text-gray-600 group-hover:text-yellow-400 transition" />
                      <span className="font-bold text-white group-hover:text-yellow-400 transition">
                        {base}<span className="text-gray-500 text-[10px]">/USDT</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-white font-semibold">
                        ${price < 0.01 ? price.toFixed(6) : price.toFixed(2)}
                      </div>
                      <div className={`text-[11px] font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isProfit ? '+' : ''}{pct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
