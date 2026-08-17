'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Flame, TrendingUp, TrendingDown, Layers, Filter, Search, RefreshCw, Zap, ArrowUpRight } from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL',        name: 'All Coins (100+ Market Pairs)' },
  { id: 'TOP10',      name: 'Top 10 Mega Caps' },
  { id: 'MEMES_SHIT', name: 'Meme & Low-Cap Shitcoins 🚀' },
  { id: 'LAYER1',     name: 'Layer 1 / Layer 2' },
  { id: 'DEFI_AI',    name: 'DeFi & AI Ecosystem' },
];

const MEME_MICRO_SYMBOLS = ['DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'WIFUSDT', 'FLOKIUSDT', 'BONKUSDT', 'BOMEUSDT', 'MEMEUSDT', 'MEWUSDT', 'POPCATUSDT', 'TURBOUSDT', 'MOGUSDT', 'BRETTUSDT', 'NEIROUSDT', 'MYROUSDT', 'SPXUSDT', 'CATUSDT', 'SUNDOGUSDT'];
const TOP10_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'];

// Estimated Market Capitalizations ($ USD) for Sizing Treemap Bubbles
const MARKET_CAPS: Record<string, number> = {
  BTCUSDT:   1_350_000_000_000,
  ETHUSDT:     420_000_000_000,
  SOLUSDT:      68_000_000_000,
  BNBUSDT:      85_000_000_000,
  XRPUSDT:      32_000_000_000,
  DOGEUSDT:     18_000_000_000,
  AVAXUSDT:     10_500_000_000,
  SHIBUSDT:      9_800_000_000,
  DOTUSDT:       8_200_000_000,
  LINKUSDT:      7_500_000_000,
  PEPEUSDT:      4_100_000_000,
  WIFUSDT:       1_800_000_000,
  FLOKIUSDT:     1_250_000_000,
  BONKUSDT:      1_100_000_000,
  TURBOUSDT:       450_000_000,
  BRETTUSDT:       380_000_000,
  MOGUSDT:         320_000_000,
  NEIROUSDT:       280_000_000,
};

export default function HeatmapPage() {
  const router = useRouter();
  const [tickers, setTickers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sizingMode, setSizingMode] = useState<'MARKET_CAP' | 'VOLUME'>('VOLUME');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    // Fetch 100% real authoritative transformed 24h tickers from Backend REST API
    api.get('/marketdata/tickers').then((res) => {
      const fetched = res.data.tickers || [];
      const enriched = fetched.map((t: any) => ({
        ...t,
        marketCap: MARKET_CAPS[t.symbol] ?? (parseFloat(t.volume24h || '1000') * parseFloat(t.lastPrice || '1') * 25),
      }));
      setTickers(enriched);
      setLastUpdated(new Date());
    }).catch(() => {});

    // Subscribe to real-time ticker stream across all symbol streams
    const socket = getSocket();
    const room = 'market:*:ticker';
    socket.emit('subscribe', room);

    const onUpdate = (payload: any) => {
      if (payload && payload.data && payload.data.symbol) {
        setTickers((prev) => {
          const map = new Map(prev.map((t) => [t.symbol, t]));
          const existing = map.get(payload.data.symbol) || {
            marketCap: MARKET_CAPS[payload.data.symbol] ?? 500_000_000,
            priceChangePercent: 0,
          };

          map.set(payload.data.symbol, {
            ...existing,
            symbol: payload.data.symbol,
            lastPrice: payload.data.price,
            priceChangePercent: payload.data.priceChangePercent ?? existing.priceChangePercent,
          });
          return Array.from(map.values());
        });
        setLastUpdated(new Date());
      }
    };

    socket.on('update', onUpdate);

    return () => {
      socket.off('update', onUpdate);
      socket.emit('unsubscribe', room);
    };
  }, []);

  const filteredTickers = tickers
    .filter((t) => {
      if (!t || !t.symbol) return false;
      const matchesSearch = String(t.symbol).toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (selectedCategory === 'TOP10') return TOP10_SYMBOLS.includes(t.symbol);
      if (selectedCategory === 'MEMES_SHIT') return MEME_MICRO_SYMBOLS.includes(t.symbol);
      return true;
    })
    .sort((a, b) => {
      if (sizingMode === 'VOLUME') {
        const volA = parseFloat(a.volume24h || '0') * parseFloat(a.lastPrice || '1');
        const volB = parseFloat(b.volume24h || '0') * parseFloat(b.lastPrice || '1');
        return volB - volA;
      }
      return (b.marketCap ?? 0) - (a.marketCap ?? 0);
    });

  // Top Gainers and Losers Calculation
  const topGainers = [...tickers].sort((a, b) => (b.priceChangePercent ?? 0) - (a.priceChangePercent ?? 0)).slice(0, 5);
  const topLosers = [...tickers].sort((a, b) => (a.priceChangePercent ?? 0) - (b.priceChangePercent ?? 0)).slice(0, 5);

  const getTileColorClass = (pct: number) => {
    if (pct >= 5)    return 'bg-[#0ecb81] text-black shadow-lg shadow-emerald-500/20 font-extrabold animate-pulse';
    if (pct >= 2)    return 'bg-[#26a69a] text-black font-bold';
    if (pct > 0)     return 'bg-[#004d40] text-emerald-300 border border-emerald-500/40';
    if (pct === 0)   return 'bg-[#2b313a] text-gray-300';
    if (pct > -2)    return 'bg-[#801313] text-red-300 border border-red-500/40';
    if (pct > -5)    return 'bg-[#d93a4f] text-white font-bold';
    return 'bg-[#f6465d] text-white shadow-lg shadow-red-500/20 font-extrabold animate-pulse';
  };

  const getTileSizeClass = (index: number) => {
    if (index === 0) return 'col-span-12 md:col-span-4 row-span-2 min-h-[180px] text-lg';
    if (index < 3)   return 'col-span-6 md:col-span-3 min-h-[140px] text-base';
    if (index < 8)   return 'col-span-6 md:col-span-2 min-h-[110px] text-sm';
    return 'col-span-4 md:col-span-1 min-h-[90px] text-xs';
  };

  return (
    <div className="flex-1 bg-[#12161c] text-white p-4 font-sans space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181a20] p-4 rounded-xl border border-[#2b313a]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-extrabold text-xl shadow-lg">
            <Flame className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold flex items-center space-x-2">
              <span>Crypto Heatmap & Market Bubbles</span>
              <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-mono px-2 py-0.5 rounded border border-yellow-400/30">
                100+ Live Pairs
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Real-time WebSocket Heatmap Tile Flashes · Click Any Coin Tile To Open Futures Terminal
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-[#14181d] p-1 rounded-lg border border-[#2b313a]">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  selectedCategory === c.id ? 'bg-yellow-400 text-black shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Sizing Mode Toggle */}
          <div className="flex items-center space-x-1 bg-[#14181d] p-1 rounded-lg border border-[#2b313a] text-xs font-mono">
            <button
              onClick={() => setSizingMode('VOLUME')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                sizingMode === 'VOLUME' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Size by 24h Volume
            </button>
            <button
              onClick={() => setSizingMode('MARKET_CAP')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                sizingMode === 'MARKET_CAP' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Size by Market Cap
            </button>
          </div>
        </div>
      </div>

      {/* Top Gainers & Top Losers Marquee Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#181a20] border border-[#2b313a] p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Top 24h Gainers:</span>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono overflow-x-auto">
            {topGainers.map((t) => (
              <Link
                key={t.symbol}
                href={`/futures/${t.symbol}`}
                className="bg-[#14181d] hover:bg-[#2b313a] px-2.5 py-1 rounded border border-emerald-500/30 flex items-center space-x-1.5 transition"
              >
                <span className="font-bold text-white">{t.symbol.replace('USDT', '')}</span>
                <span className="text-emerald-400 font-extrabold">+{t.priceChangePercent}%</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-[#181a20] border border-[#2b313a] p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-red-400">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span>Top 24h Losers:</span>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono overflow-x-auto">
            {topLosers.map((t) => (
              <Link
                key={t.symbol}
                href={`/futures/${t.symbol}`}
                className="bg-[#14181d] hover:bg-[#2b313a] px-2.5 py-1 rounded border border-red-500/30 flex items-center space-x-1.5 transition"
              >
                <span className="font-bold text-white">{t.symbol.replace('USDT', '')}</span>
                <span className="text-red-400 font-extrabold">{t.priceChangePercent}%</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Treemap Tile Grid with Direct Click-To-Trade */}
      <div className="grid grid-cols-12 gap-2 auto-rows-min">
        {filteredTickers.map((t, idx) => {
          const price = parseFloat(t.lastPrice || '0');
          const pct = parseFloat(t.priceChangePercent || '0');
          const isProf = pct >= 0;
          const baseAsset = t.symbol.replace('USDT', '');

          return (
            <div
              key={t.symbol}
              onClick={() => router.push(`/futures/${t.symbol}`)}
              className={`${getTileSizeClass(idx)} ${getTileColorClass(
                pct
              )} p-3 rounded-xl border border-white/10 cursor-pointer hover:scale-[1.02] transition-transform duration-150 flex flex-col justify-between group relative overflow-hidden shadow-lg`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-extrabold tracking-wider font-mono flex items-center space-x-1">
                    <span>{baseAsset}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] opacity-75 font-mono">
                    ${price > 0 ? (price < 0.001 ? price.toFixed(7) : price.toFixed(2)) : '---'}
                  </div>
                </div>

                <div className="text-right font-mono text-xs font-extrabold">
                  {isProf ? '+' : ''}{pct}%
                </div>
              </div>

              <div className="flex justify-between items-end text-[9px] opacity-70 font-mono mt-2">
                <span>Vol: ${(parseFloat(t.volume24h || '0') * price).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                <span className="bg-black/20 px-1 rounded">24h</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
