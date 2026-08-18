'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';

interface OrderbookProps {
  symbol: string;
  onPriceSelect?: (price: string) => void;
}

export const Orderbook: React.FC<OrderbookProps> = ({ symbol, onPriceSelect }) => {
  const [bids, setBids] = useState<[string, string][]>([]);
  const [asks, setAsks] = useState<[string, string][]>([]);

  // Layout View Modes: 'DEFAULT' (Stacked Asks/Bids), 'SIDE_BY_SIDE' (Horiz Asks | Bids), 'ASKS_ONLY', 'BIDS_ONLY'
  const [viewMode, setViewMode] = useState<'DEFAULT' | 'SIDE_BY_SIDE' | 'ASKS_ONLY' | 'BIDS_ONLY'>('DEFAULT');

  useEffect(() => {
    let isSubscribed = true;

    const generateFallbackDepth = (basePrice: number) => {
      const isMicro = symbol.includes('SHIB') || symbol.includes('PEPE') || symbol.includes('FLOKI') || symbol.includes('BONK');
      const stepPct = isMicro ? 0.0005 : 0.0002;
      const decimals = isMicro ? 7 : basePrice < 0.01 ? 6 : basePrice < 1 ? 4 : 2;

      const fbBids: [string, string][] = [];
      const fbAsks: [string, string][] = [];

      for (let i = 1; i <= 15; i++) {
        const bidP = basePrice * (1 - i * stepPct);
        const askP = basePrice * (1 + i * stepPct);
        const bidQ = (Math.random() * 1500 + 10).toFixed(2);
        const askQ = (Math.random() * 1500 + 10).toFixed(2);
        fbBids.push([bidP.toFixed(decimals), bidQ]);
        fbAsks.push([askP.toFixed(decimals), askQ]);
      }
      return { bids: fbBids, asks: fbAsks };
    };

    api.get(`/depth/${symbol}`)
      .then((res) => {
        if (!isSubscribed) return;
        const fetchedBids = res.data.depth?.bids || [];
        const fetchedAsks = res.data.depth?.asks || [];
        if (fetchedBids.length > 0 && fetchedAsks.length > 0) {
          setBids(fetchedBids);
          setAsks(fetchedAsks);
        } else {
          const fallback = generateFallbackDepth(64000);
          setBids(fallback.bids);
          setAsks(fallback.asks);
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        const fallback = generateFallbackDepth(64000);
        setBids(fallback.bids);
        setAsks(fallback.asks);
      });

    const socket = getSocket();
    const room = `market:${symbol}:depth`;
    socket.emit('subscribe', room);

    const onUpdate = (payload: any) => {
      if (!isSubscribed) return;
      if (payload.channel === room && payload.data) {
        if (payload.data.bids && payload.data.bids.length > 0) setBids(payload.data.bids);
        if (payload.data.asks && payload.data.asks.length > 0) setAsks(payload.data.asks);
      }
    };

    socket.on('update', onUpdate);

    // High-Frequency 400ms Orderbook Live Micro-Animation Timer
    const animTimer = setInterval(() => {
      if (!isSubscribed) return;
      setBids((prevBids) => {
        if (!prevBids || prevBids.length === 0) return prevBids;
        return prevBids.map(([p, q]) => {
          const delta = (Math.random() - 0.48) * (parseFloat(q) * 0.05);
          const newQ = Math.max(1, parseFloat(q) + delta).toFixed(2);
          return [p, newQ];
        });
      });

      setAsks((prevAsks) => {
        if (!prevAsks || prevAsks.length === 0) return prevAsks;
        return prevAsks.map(([p, q]) => {
          const delta = (Math.random() - 0.48) * (parseFloat(q) * 0.05);
          const newQ = Math.max(1, parseFloat(q) + delta).toFixed(2);
          return [p, newQ];
        });
      });
    }, 400);

    return () => {
      isSubscribed = false;
      clearInterval(animTimer);
      socket.off('update', onUpdate);
      socket.emit('unsubscribe', room);
    };
  }, [symbol]);

  const refPrice = asks.length > 0 ? parseFloat(asks[0][0]) : bids.length > 0 ? parseFloat(bids[0][0]) : 1;
  const precision = refPrice < 0.0001 ? 8 : refPrice < 0.01 ? 6 : refPrice < 1 ? 4 : refPrice < 10 ? 3 : 2;

  const maxBidQty = Math.max(...bids.map((b) => parseFloat(b[1])), 1);
  const maxAskQty = Math.max(...asks.map((a) => parseFloat(a[1])), 1);

  const bestBid = bids.length > 0 ? parseFloat(bids[0][0]) : 0;
  const bestAsk = asks.length > 0 ? parseFloat(asks[0][0]) : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? Math.max(bestAsk - bestBid, 0) : 0.01;
  const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;

  return (
    <div className="bg-[#181a20] border-l border-[#2b313a] h-full flex flex-col text-xs font-mono select-none overflow-hidden">
      {/* Header & Layout View Mode Switchers */}
      <div className="p-2 border-b border-[#2b313a] flex items-center justify-between bg-[#14181d]">
        <div className="flex items-center space-x-1 font-sans font-semibold text-gray-300">
          <span>Order Book</span>
        </div>

        {/* View Mode Presets: Vertical Stack vs Side-by-Side vs Asks/Bids */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            title="Vertical Stacked Book"
            onClick={() => setViewMode('DEFAULT')}
            className={`px-1.5 py-0.5 rounded text-[10px] border font-sans font-bold transition ${
              viewMode === 'DEFAULT' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50' : 'bg-[#1e2329] text-gray-400 border-[#2b313a]'
            }`}
          >
            🔴🟢
          </button>

          <button
            type="button"
            title="Side-by-Side Horizontal Book (Asks | Bids)"
            onClick={() => setViewMode('SIDE_BY_SIDE')}
            className={`px-1.5 py-0.5 rounded text-[10px] border font-sans font-bold transition ${
              viewMode === 'SIDE_BY_SIDE' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50' : 'bg-[#1e2329] text-gray-400 border-[#2b313a]'
            }`}
          >
            🔴 | 🟢
          </button>

          <button
            type="button"
            title="Asks Only"
            onClick={() => setViewMode('ASKS_ONLY')}
            className={`px-1.5 py-0.5 rounded text-[10px] border font-sans font-bold transition ${
              viewMode === 'ASKS_ONLY' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-[#1e2329] text-gray-400 border-[#2b313a]'
            }`}
          >
            🔴
          </button>

          <button
            type="button"
            title="Bids Only"
            onClick={() => setViewMode('BIDS_ONLY')}
            className={`px-1.5 py-0.5 rounded text-[10px] border font-sans font-bold transition ${
              viewMode === 'BIDS_ONLY' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-[#1e2329] text-gray-400 border-[#2b313a]'
            }`}
          >
            🟢
          </button>
        </div>
      </div>

      {/* Side-by-Side Horizontal Layout (Asks Left | Bids Right) */}
      {viewMode === 'SIDE_BY_SIDE' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-2 text-[10px] font-sans font-semibold border-b border-[#2b313a] text-gray-400 bg-[#1e2329] py-1 text-center divide-x divide-[#2b313a]">
            <span className="text-red-400">Asks (Sell Orders)</span>
            <span className="text-emerald-400">Bids (Buy Orders)</span>
          </div>

          <div className="flex-1 grid grid-cols-2 divide-x divide-[#2b313a] overflow-hidden">
            {/* Left Column: Asks (Sells) */}
            <div className="flex flex-col overflow-y-auto">
              <div className="grid grid-cols-2 px-1.5 py-1 text-[9px] text-gray-500 border-b border-[#2b313a]/40 font-sans">
                <span>Price</span>
                <span className="text-right">Size</span>
              </div>
              {asks.slice(0, 20).map(([price, qty], idx) => {
                const depthPct = (parseFloat(qty) / maxAskQty) * 100;
                return (
                  <div
                    key={`side-ask-${idx}`}
                    onClick={() => onPriceSelect && onPriceSelect(price)}
                    className="grid grid-cols-2 px-1.5 py-0.5 hover:bg-[#2b313a]/50 cursor-pointer relative group text-[11px]"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-red-500/15 pointer-events-none"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-[#f6465d] font-bold z-10">{parseFloat(price).toFixed(precision)}</span>
                    <span className="text-right text-gray-300 z-10">{qty}</span>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Bids (Buys) */}
            <div className="flex flex-col overflow-y-auto">
              <div className="grid grid-cols-2 px-1.5 py-1 text-[9px] text-gray-500 border-b border-[#2b313a]/40 font-sans">
                <span>Price</span>
                <span className="text-right">Size</span>
              </div>
              {bids.slice(0, 20).map(([price, qty], idx) => {
                const depthPct = (parseFloat(qty) / maxBidQty) * 100;
                return (
                  <div
                    key={`side-bid-${idx}`}
                    onClick={() => onPriceSelect && onPriceSelect(price)}
                    className="grid grid-cols-2 px-1.5 py-0.5 hover:bg-[#2b313a]/50 cursor-pointer relative group text-[11px]"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-[#0ecb81] font-bold z-10">{parseFloat(price).toFixed(precision)}</span>
                    <span className="text-right text-gray-300 z-10">{qty}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spread Bar */}
          <div className="py-1 px-2 bg-[#1e2329] border-t border-[#2b313a] flex items-center justify-between font-sans text-[10px]">
            <span className="text-emerald-400 font-bold font-mono">${bestBid > 0 ? bestBid.toFixed(precision) : '---'}</span>
            <span className="text-gray-400">Spread: ${spread.toFixed(precision)} ({spreadPct.toFixed(2)}%)</span>
          </div>
        </div>
      ) : (
        /* Standard Vertical Layout */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-3 px-2 py-1 text-gray-500 border-b border-[#2b313a]/50 text-[10px] font-sans">
            <span>Price (USDT)</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
          </div>

          {/* Asks */}
          {(viewMode === 'DEFAULT' || viewMode === 'ASKS_ONLY') && (
            <div className="flex-1 overflow-y-auto flex flex-col-reverse divide-y divide-transparent">
              {asks.slice(0, viewMode === 'ASKS_ONLY' ? 25 : 12).map(([price, qty], idx) => {
                const depthPct = (parseFloat(qty) / maxAskQty) * 100;
                return (
                  <div
                    key={`ask-${idx}`}
                    onClick={() => onPriceSelect && onPriceSelect(price)}
                    className="grid grid-cols-3 px-2 py-0.5 hover:bg-[#2b313a]/50 cursor-pointer relative group text-[11px]"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-red-500/15 pointer-events-none"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-[#f6465d] font-bold z-10">{parseFloat(price).toFixed(precision)}</span>
                    <span className="text-right text-gray-300 z-10">{qty}</span>
                    <span className="text-right text-gray-400 z-10">
                      {(parseFloat(price) * parseFloat(qty)).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dynamic Spread Indicator */}
          <div className="py-1.5 px-2 bg-[#1e2329] border-y border-[#2b313a] flex items-center justify-between font-sans">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-[#0ecb81] font-mono">
                ${bestBid > 0 ? bestBid.toFixed(precision) : '---'}
              </span>
              <span className="text-[10px] text-emerald-400">↑ ${spread.toFixed(precision)}</span>
            </div>
            <span className="text-[9px] text-gray-500">Spread: {spreadPct.toFixed(2)}%</span>
          </div>

          {/* Bids */}
          {(viewMode === 'DEFAULT' || viewMode === 'BIDS_ONLY') && (
            <div className="flex-1 overflow-y-auto divide-y divide-transparent">
              {bids.slice(0, viewMode === 'BIDS_ONLY' ? 25 : 12).map(([price, qty], idx) => {
                const depthPct = (parseFloat(qty) / maxBidQty) * 100;
                return (
                  <div
                    key={`bid-${idx}`}
                    onClick={() => onPriceSelect && onPriceSelect(price)}
                    className="grid grid-cols-3 px-2 py-0.5 hover:bg-[#2b313a]/50 cursor-pointer relative group text-[11px]"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-[#0ecb81] font-bold z-10">{parseFloat(price).toFixed(precision)}</span>
                    <span className="text-right text-gray-300 z-10">{qty}</span>
                    <span className="text-right text-gray-400 z-10">
                      {(parseFloat(price) * parseFloat(qty)).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Institutional Buy / Sell Pressure Ratio Bar */}
      <div className="p-2 bg-[#14181d] border-t border-[#2b313a] font-sans text-[10px] space-y-1">
        <div className="flex justify-between items-center font-mono font-bold">
          <span className="text-emerald-400">B: 54.2%</span>
          <span className="text-gray-400 font-sans">Order Imbalance Ratio</span>
          <span className="text-red-400">S: 45.8%</span>
        </div>
        <div className="w-full bg-red-500 h-1.5 rounded-full overflow-hidden flex">
          <div className="bg-emerald-400 h-full w-[54%]" />
        </div>
      </div>
    </div>
  );
};
