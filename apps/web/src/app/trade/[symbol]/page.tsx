'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TradingViewChart } from '../../../components/trading/TradingViewChart';
import { Orderbook } from '../../../components/trading/Orderbook';
import { RecentTrades } from '../../../components/trading/RecentTrades';
import { OrderForm } from '../../../components/trading/OrderForm';
import { OrderHistoryTable } from '../../../components/trading/OrderHistoryTable';
import { MarketSelectorModal } from '../../../components/trading/MarketSelectorModal';
import { api } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';

export default function SpotTradePage() {
  const params = useParams();
  const rawSymbol = (params.symbol as string) || 'BTCUSDT';
  const symbol = rawSymbol.toUpperCase();

  const [selectedPrice, setSelectedPrice] = useState<string | undefined>();
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [ticker, setTicker] = useState<any>(null);

  const baseAsset = symbol.replace('USDT', '');

  useEffect(() => {
    api.get(`/markets/${symbol}`).then((res) => {
      setMarketInfo(res.data.market);
    }).catch(() => {});

    api.get('/marketdata/tickers').then((res) => {
      const found = res.data.tickers?.find((t: any) => t.symbol === symbol);
      if (found) setTicker(found);
    }).catch(() => {});
  }, [symbol]);

  // Real-time WebSocket ticker updates for top header bar
  useEffect(() => {
    const socket = getSocket();
    const room = `market:${symbol}:ticker`;
    socket.emit('subscribe', room);

    const onUpdate = (payload: any) => {
      if (payload.channel === room && payload.data) {
        setTicker((prev: any) => ({
          ...prev,
          lastPrice: payload.data.price,
        }));
      }
    };

    socket.on('update', onUpdate);
    return () => {
      socket.off('update', onUpdate);
      socket.emit('unsubscribe', room);
    };
  }, [symbol]);

  return (
    <div className="flex-1 flex flex-col bg-[#12161c] text-white overflow-x-hidden max-w-full">
      {/* Top Header Bar with Market Selector Dropdown */}
      <div className="bg-[#181a20] border-b border-[#2b313a] px-3 sm:px-4 py-2 flex items-center justify-between font-sans overflow-x-auto max-w-full">
        <div className="flex items-center space-x-3 sm:space-x-6 min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <MarketSelectorModal currentSymbol={symbol} mode="spot" />
            <span className="text-[9px] sm:text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-1 sm:px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
              SPOT
            </span>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6 text-xs font-mono overflow-x-auto whitespace-nowrap">
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">Last Price</div>
              <div className="text-emerald-400 font-bold text-xs sm:text-sm">
                ${ticker ? Number(ticker.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '---'}
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">24h Change</div>
              <div className={`font-semibold text-xs sm:text-sm ${(ticker?.priceChangePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {ticker ? `${ticker.priceChangePercent > 0 ? '+' : ''}${ticker.priceChangePercent}%` : '---'}
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">24h High</div>
              <div className="text-gray-300 text-xs">
                ${ticker ? Number(ticker.high24h).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '---'}
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">24h Low</div>
              <div className="text-gray-300 text-xs">
                ${ticker ? Number(ticker.low24h).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '---'}
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">24h Volume ({baseAsset})</div>
              <div className="text-gray-300 text-xs">
                {ticker ? `${Number(ticker.volume24h).toLocaleString()} ${baseAsset}` : '---'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Chart & Bottom History (Cols 7) */}
        <div className="lg:col-span-7 flex flex-col border-r border-[#2b313a]">
          <div className="flex-1 bg-[#181a20]">
            <TradingViewChart symbol={symbol} />
          </div>
          <OrderHistoryTable />
        </div>

        {/* Middle: Orderbook & Recent Trades (Cols 3) */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 divide-y lg:divide-y-0 border-r border-[#2b313a]">
          <Orderbook symbol={symbol} onPriceSelect={(p) => setSelectedPrice(p)} />
          <RecentTrades symbol={symbol} />
        </div>

        {/* Right: Buy & Sell Order Form (Cols 2) */}
        <div className="lg:col-span-2 bg-[#181a20]">
          <OrderForm symbol={symbol} selectedPrice={selectedPrice} />
        </div>
      </div>
    </div>
  );
}
