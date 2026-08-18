'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TradingViewChart } from '../../../components/trading/TradingViewChart';
import { Orderbook } from '../../../components/trading/Orderbook';
import { MarketSelectorModal } from '../../../components/trading/MarketSelectorModal';
import { ClosePositionModal } from '../../../components/trading/ClosePositionModal';
import { LiquidationModal } from '../../../components/trading/LiquidationModal';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { getSocket } from '../../../lib/socket';
import { Zap, ShieldAlert, SlidersHorizontal, TrendingUp, TrendingDown, Clock, Layers, ArrowUpDown, Percent, BarChart3, History, Award } from 'lucide-react';

const formatSmartPrice = (val: number) => {
  if (!val || isNaN(val) || val <= 0) return '---';
  if (val < 0.0001) return val.toFixed(8);
  if (val < 0.01) return val.toFixed(6);
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function FuturesTradePage() {
  const params = useParams();
  const rawSymbol = (params.symbol as string) || 'BTCUSDT';
  const symbol = rawSymbol.toUpperCase();
  const baseAsset = symbol.replace('USDT', '');
  const quoteAsset = 'USDT';

  const { isAuthenticated } = useAuthStore();
  const [mobileTab, setMobileTab] = useState<'CHART' | 'ORDERBOOK' | 'TRADE' | 'POSITIONS'>('CHART');
  const [marginMode, setMarginMode] = useState<'CROSS' | 'ISOLATED'>('CROSS');
  const [leverage, setLeverage] = useState(25);
  const [tab, setTab] = useState<'LONG' | 'SHORT'>('LONG');

  const [sizeUnit, setSizeUnit] = useState<'ASSET' | 'USDT' | 'PCT'>('ASSET');
  const [sizeInput, setSizeInput] = useState('0.1');

  const [entryPrice, setEntryPrice] = useState('0.00');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [positions, setPositions] = useState<any[]>([]);
  const [closedPositions, setClosedPositions] = useState<any[]>([]);
  const [ticker, setTicker] = useState<any>(null);
  const [allTickersMap, setAllTickersMap] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<{ available: string; locked: string } | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'POSITIONS' | 'ORDERS' | 'HISTORY' | 'ANALYTICS'>('POSITIONS');

  const [closedModalData, setClosedModalData] = useState<any>(null);
  const [liquidationModalData, setLiquidationModalData] = useState<any>(null);

  useEffect(() => {
    // Fetch all market tickers to maintain accurate Mark Prices across all positions
    api.get('/marketdata/tickers').then((res) => {
      const foundList = res.data.tickers || [];
      const foundCurrent = foundList.find((t: any) => t.symbol === symbol);
      if (foundCurrent && foundCurrent.lastPrice) {
        setTicker(foundCurrent);
        const p = Number(foundCurrent.lastPrice);
        const formattedEntry = p < 0.0001 ? p.toFixed(8) : p < 0.01 ? p.toFixed(6) : p < 1 ? p.toFixed(4) : p.toFixed(2);
        setEntryPrice(formattedEntry);
      }

      const map: Record<string, number> = {};
      foundList.forEach((t: any) => {
        map[t.symbol] = Number(t.lastPrice);
      });
      setAllTickersMap(map);
    }).catch(() => {});

    if (isAuthenticated) {
      fetchPositions();
      fetchBalance();
      fetchClosedHistory();
    }
  }, [symbol, isAuthenticated]);

  const [liveFundingRate, setLiveFundingRate] = useState('+0.0100%');
  const [fundingCountdown, setFundingCountdown] = useState('00:00:08');

  useEffect(() => {
    const socket = getSocket();
    const room = `market:${symbol}:ticker`;
    const globalRoom = 'market:*:ticker';
    socket.emit('subscribe', room);
    socket.emit('subscribe', globalRoom);

    const onUpdate = (payload: any) => {
      if (payload && payload.data && payload.data.price) {
        const priceNum = Number(payload.data.price);
        const updateSymbol = payload.data.symbol || symbol;

        if (updateSymbol === symbol) {
          setTicker((prev: any) => ({
            ...prev,
            lastPrice: payload.data.price,
          }));
        }

        setAllTickersMap((prev) => ({
          ...prev,
          [updateSymbol]: priceNum,
        }));
      }
    };

    const onFundingUpdate = (data: any) => {
      if (data && data.fundingRatePct) {
        const sign = parseFloat(data.fundingRatePct) >= 0 ? '+' : '';
        setLiveFundingRate(`${sign}${data.fundingRatePct}%`);
      }
    };

    socket.on('update', onUpdate);
    socket.on('funding:update', onFundingUpdate);

    // Real 8-Hour Binance Funding Rate Countdown Timer (00:00:00, 08:00:00, 16:00:00 UTC)
    const updateFundingCountdown = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const nextFundingHour = (Math.floor(utcHours / 8) + 1) * 8 % 24;
      const targetDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + (nextFundingHour === 0 && utcHours >= 16 ? 1 : 0),
        nextFundingHour, 0, 0
      ));
      const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
      const h = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
      setFundingCountdown(`${h}:${m}:${s}`);
    };

    updateFundingCountdown();
    const timerId = setInterval(updateFundingCountdown, 1000);

    return () => {
      clearInterval(timerId);
      socket.off('update', onUpdate);
      socket.off('funding:update', onFundingUpdate);
      socket.emit('unsubscribe', room);
      socket.emit('unsubscribe', globalRoom);
    };
  }, [symbol]);

  const fetchPositions = async () => {
    try {
      const res = await api.get('/futures/positions');
      setPositions(res.data.positions || []);
    } catch (e) {
      console.error('Failed to fetch futures positions:', e);
    }
  };

  const fetchClosedHistory = async () => {
    try {
      const res = await api.get('/futures/history');
      setClosedPositions(res.data.history || []);
    } catch (e) {
      console.error('Failed to fetch closed history:', e);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await api.get('/wallets/balances');
      const found = res.data.balances.find((b: any) => b.asset.id === quoteAsset);
      setBalances(found ? { available: found.futuresMargin || '0', locked: found.locked } : { available: '0', locked: '0' });
    } catch (e) {
      console.error('Failed to fetch wallet balance:', e);
    }
  };

  const markPrice = ticker?.lastPrice ? Number(ticker.lastPrice) : 0;
  const inputVal = parseFloat(sizeInput) || 0;
  const priceNum = parseFloat(entryPrice) || markPrice || 1;
  const availUSDT = balances ? parseFloat(balances.available) : 0;

  let calculatedCoinSize = 0;
  if (sizeUnit === 'ASSET') {
    calculatedCoinSize = inputVal;
  } else if (sizeUnit === 'USDT') {
    calculatedCoinSize = priceNum > 0 ? inputVal / priceNum : 0;
  } else if (sizeUnit === 'PCT') {
    const usableMargin = availUSDT * (inputVal / 100);
    const notional = usableMargin * leverage;
    calculatedCoinSize = priceNum > 0 ? notional / priceNum : 0;
  }

  const notional = calculatedCoinSize * priceNum;
  const marginRequired = leverage > 0 ? notional / leverage : notional;
  const liqPrice = markPrice > 0
    ? tab === 'LONG'
      ? priceNum * (1 - 0.9 / leverage)
      : priceNum * (1 + 0.9 / leverage)
    : 0;

  const handlePercentageClick = (pct: number) => {
    setSizeUnit('PCT');
    setSizeInput(pct.toString());
  };

  const handleOpenPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!isAuthenticated) {
      setMsg({ type: 'error', text: 'Please log in to open futures margin positions.' });
      return;
    }

    if (calculatedCoinSize <= 0) {
      setMsg({ type: 'error', text: 'Please enter a valid position size.' });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/futures/positions', {
        marketId: symbol,
        side: tab,
        size: calculatedCoinSize.toFixed(6),
        leverage,
        entryPrice: entryPrice || (ticker?.lastPrice ? ticker.lastPrice.toString() : '0'),
        marginMode,
        takeProfit: takeProfit || undefined,
        stopLoss: stopLoss || undefined,
      });

      setMsg({ type: 'success', text: `Opened / Aggregated ${leverage}x ${tab} position on ${symbol}!` });
      fetchPositions();
      fetchBalance();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to open futures position' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePosition = async (id: string) => {
    try {
      const posToClose = positions.find((p) => p.id === id);
      const res = await api.post(`/futures/positions/${id}/close`);

      if (posToClose) {
        const posMarketMark = allTickersMap[posToClose.marketId] || parseFloat(posToClose.markPrice) || parseFloat(posToClose.entryPrice);
        const entry = parseFloat(posToClose.entryPrice);
        const sizeNum = parseFloat(posToClose.size);
        const marginNum = parseFloat(posToClose.margin);

        const unPnl = posToClose.side === 'LONG'
          ? (posMarketMark - entry) * sizeNum
          : (entry - posMarketMark) * sizeNum;
        const roe = marginNum > 0 ? (unPnl / marginNum) * 100 : 0;

        setClosedModalData({
          symbol: posToClose.marketId,
          side: posToClose.side,
          leverage: posToClose.leverage,
          entryPrice: entry,
          closePrice: posMarketMark,
          size: sizeNum,
          margin: marginNum,
          pnl: unPnl,
          roe,
        });
      }

      fetchPositions();
      fetchBalance();
      fetchClosedHistory();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Close position failed' });
    }
  };

  const quickLeverages = [10, 100, 500, 1000, 5000, 10000];
  const quickPercents  = [25, 50, 75, 100];

  return (
    <div className="flex-1 flex flex-col bg-[#12161c] text-white font-sans overflow-x-hidden max-w-full">
      {/* PnL Close Receipt Modal */}
      <ClosePositionModal data={closedModalData} onClose={() => setClosedModalData(null)} />

      {/* Force Liquidation Alert Modal */}
      <LiquidationModal data={liquidationModalData} onClose={() => setLiquidationModalData(null)} />

      {/* Header Navigation Bar */}
      <div className="bg-[#181a20] border-b border-[#2b313a] px-3 sm:px-4 py-2 flex items-center justify-between overflow-x-auto max-w-full">
        <div className="flex items-center space-x-3 sm:space-x-6 min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <MarketSelectorModal currentSymbol={symbol} mode="futures" />
            <span className="text-[9px] sm:text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1 sm:px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
              {marginMode} {leverage}x
            </span>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6 text-xs font-mono overflow-x-auto whitespace-nowrap">
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">Mark Price</div>
              <div className="text-emerald-400 font-bold text-xs sm:text-sm">
                ${formatSmartPrice(markPrice)}
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">24h Change</div>
              <div className={`font-semibold text-xs sm:text-sm ${(ticker?.priceChangePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {ticker ? `${ticker.priceChangePercent > 0 ? '+' : ''}${ticker.priceChangePercent}%` : '---'}
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">Funding / Countdown</div>
              <div className="text-yellow-400 font-bold flex items-center space-x-1 text-xs">
                <Clock className="w-3 h-3 text-yellow-400 animate-pulse shrink-0" />
                <span>{liveFundingRate} / {fundingCountdown}</span>
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-gray-500 text-[10px]">Est. Liquidation</div>
              <div className="text-red-400 font-semibold text-xs">${formatSmartPrice(liqPrice)}</div>
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

      {/* Mobile Terminal Tab Switcher (< 1024px) */}
      <div className="lg:hidden bg-[#181a20] border-b border-[#2b313a] p-1.5 flex items-center justify-around text-xs font-mono select-none">
        <button
          onClick={() => setMobileTab('CHART')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1 transition ${
            mobileTab === 'CHART' ? 'bg-yellow-400 text-black shadow' : 'text-gray-400'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Chart</span>
        </button>

        <button
          onClick={() => setMobileTab('ORDERBOOK')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1 transition ${
            mobileTab === 'ORDERBOOK' ? 'bg-yellow-400 text-black shadow' : 'text-gray-400'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Orderbook</span>
        </button>

        <button
          onClick={() => setMobileTab('TRADE')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1 transition ${
            mobileTab === 'TRADE' ? 'bg-yellow-400 text-black shadow' : 'text-gray-400'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Trade</span>
        </button>

        <button
          onClick={() => setMobileTab('POSITIONS')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1 transition ${
            mobileTab === 'POSITIONS' ? 'bg-yellow-400 text-black shadow' : 'text-gray-400'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Pos ({positions.length})</span>
        </button>
      </div>

      {/* Upper Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden border-b border-[#2b313a]">
        <div className={`lg:col-span-6 bg-[#181a20] border-r border-[#2b313a] ${mobileTab === 'CHART' ? 'block' : 'hidden lg:block'}`}>
          <TradingViewChart symbol={symbol} positions={positions} />
        </div>

        <div className={`lg:col-span-3 border-r border-[#2b313a] bg-[#181a20] ${mobileTab === 'ORDERBOOK' ? 'block' : 'hidden lg:block'}`}>
          <Orderbook symbol={symbol} onPriceSelect={(p) => setEntryPrice(p)} />
        </div>

        <div className={`lg:col-span-3 bg-[#181a20] p-3 flex flex-col justify-between ${mobileTab === 'TRADE' ? 'block' : 'hidden lg:block'}`}>
          <div>
            <div className="flex items-center justify-between mb-2 bg-[#1e2329] p-1.5 rounded border border-[#2b313a]">
              <span className="text-[11px] font-bold text-gray-400 pl-1">Margin Mode</span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setMarginMode('CROSS')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${marginMode === 'CROSS' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  CROSS
                </button>
                <button
                  type="button"
                  onClick={() => setMarginMode('ISOLATED')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${marginMode === 'ISOLATED' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  ISOLATED
                </button>
              </div>
            </div>

            <div className="mb-2 bg-[#14181d] p-2 rounded border border-[#2b313a]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400 font-semibold">Leverage:</span>
                <div className="flex items-center space-x-1 font-mono">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={leverage}
                    onChange={(e) => setLeverage(Math.min(10000, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-16 bg-[#1e2329] border border-[#2b313a] rounded px-1 py-0.5 text-right font-bold text-yellow-400 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <span className="text-yellow-400 font-bold text-xs">x</span>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1 font-mono text-[8px]">
                {quickLeverages.map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setLeverage(lev)}
                    className={`py-0.5 rounded border transition ${
                      leverage === lev ? 'bg-yellow-400 text-black border-yellow-400 font-bold' : 'bg-[#1e2329] border-[#2b313a] text-gray-400 hover:text-white'
                    }`}
                  >
                    {lev >= 1000 ? `${lev / 1000}k` : lev}x
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setTab('LONG')}
                className={`py-2 rounded font-bold text-xs transition ${
                  tab === 'LONG' ? 'bg-[#0ecb81] text-black shadow-md shadow-emerald-500/20' : 'bg-[#2b313a] text-gray-400'
                }`}
              >
                Open Long
              </button>
              <button
                type="button"
                onClick={() => setTab('SHORT')}
                className={`py-2 rounded font-bold text-xs transition ${
                  tab === 'SHORT' ? 'bg-[#f6465d] text-white shadow-md shadow-red-500/20' : 'bg-[#2b313a] text-gray-400'
                }`}
              >
                Open Short
              </button>
            </div>

            {msg && (
              <div className={`p-2 rounded text-[10px] mb-2 font-semibold ${msg.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleOpenPosition} className="space-y-2">
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Entry Price ({quoteAsset})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded py-1.5 px-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                  <span>Size:</span>
                  <div className="flex items-center space-x-1 font-mono">
                    <button
                      type="button"
                      onClick={() => setSizeUnit('ASSET')}
                      className={`px-1.5 py-0.2 rounded text-[9px] ${sizeUnit === 'ASSET' ? 'bg-yellow-400 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                    >
                      {baseAsset}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSizeUnit('USDT')}
                      className={`px-1.5 py-0.2 rounded text-[9px] ${sizeUnit === 'USDT' ? 'bg-yellow-400 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                    >
                      USDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setSizeUnit('PCT')}
                      className={`px-1.5 py-0.2 rounded text-[9px] ${sizeUnit === 'PCT' ? 'bg-yellow-400 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                    >
                      % Bal
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    placeholder={sizeUnit === 'ASSET' ? `0.00 ${baseAsset}` : sizeUnit === 'USDT' ? '0.00 USDT' : '0 - 100%'}
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded py-1.5 px-2.5 text-xs text-white font-mono"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-bold text-gray-500 font-mono">
                    {sizeUnit === 'ASSET' ? baseAsset : sizeUnit === 'USDT' ? 'USDT' : '%'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 mt-1 font-mono text-[9px]">
                  {quickPercents.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageClick(pct)}
                      className={`py-0.5 rounded border transition ${
                        sizeUnit === 'PCT' && Number(sizeInput) === pct
                          ? 'bg-yellow-400 text-black border-yellow-400 font-bold'
                          : 'bg-[#14181d] border-[#2b313a] text-gray-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[9px] text-emerald-400">TP ({quoteAsset})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded py-1 px-1.5 text-[11px] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-red-400">SL ({quoteAsset})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-[#14181d] border border-[#2b313a] rounded py-1 px-1.5 text-[11px] text-white font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#14181d] p-2 rounded border border-[#2b313a] space-y-1 text-[11px] font-mono">
                <div className="flex justify-between items-center border-b border-[#2b313a]/50 pb-1">
                  <span className="text-gray-400">Avail Margin:</span>
                  <span className="text-yellow-400 font-bold">
                    ${availUSDT.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1 border-b border-[#2b313a]/50">
                  <span className="text-gray-400">Max Buying Power:</span>
                  <span className="text-emerald-400 font-bold">
                    ${(availUSDT * leverage).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400 pt-0.5">
                  <span>Equiv. Size:</span>
                  <span className="text-white font-bold">{calculatedCoinSize.toFixed(4)} {baseAsset}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Margin Req:</span>
                  <span className="text-yellow-400 font-bold">${marginRequired.toFixed(2)} USDT</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg font-bold text-xs transition ${
                  tab === 'LONG'
                    ? 'bg-[#0ecb81] hover:bg-[#0ba368] text-black shadow-md shadow-emerald-500/20'
                    : 'bg-[#f6465d] hover:bg-[#d93a4f] text-white shadow-md shadow-red-500/20'
                }`}
              >
                {isLoading ? 'Processing...' : `Submit ${leverage}x ${tab}`}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Lower Section: Eye-Level High Position Tracker & PnL Analytics Panel */}
      <div className={`bg-[#181a20] flex-1 flex flex-col ${mobileTab === 'POSITIONS' ? 'block' : 'hidden lg:flex'}`}>
        <div className="border-b border-[#2b313a] px-4 flex items-center justify-between bg-[#14181d]">
          <div className="flex items-center space-x-6 text-xs font-bold">
            <button
              onClick={() => setActiveBottomTab('POSITIONS')}
              className={`py-2.5 flex items-center space-x-2 border-b-2 transition ${
                activeBottomTab === 'POSITIONS' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>Open Margin Positions ({positions.length})</span>
            </button>

            <button
              onClick={() => setActiveBottomTab('HISTORY')}
              className={`py-2.5 flex items-center space-x-2 border-b-2 transition ${
                activeBottomTab === 'HISTORY' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Closed Trade History ({closedPositions.length})</span>
            </button>

            <button
              onClick={() => setActiveBottomTab('ANALYTICS')}
              className={`py-2.5 flex items-center space-x-2 border-b-2 transition ${
                activeBottomTab === 'ANALYTICS' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>PnL Performance Analytics</span>
            </button>
          </div>

          <div className="text-xs text-gray-400 font-mono">
            Binance-Style Instant PnL Receipt & Realized History Settlement
          </div>
        </div>

        <div className="p-3 overflow-x-auto min-h-[180px]">
          {activeBottomTab === 'POSITIONS' && (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e2329] text-gray-400 font-sans border-b border-[#2b313a]">
                <tr>
                  <th className="py-2.5 px-3">Market</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Leverage</th>
                  <th className="py-2.5 px-3">Position Size</th>
                  <th className="py-2.5 px-3">Avg Entry Price</th>
                  <th className="py-2.5 px-3">Mark Price</th>
                  <th className="py-2.5 px-3">Liq Price</th>
                  <th className="py-2.5 px-3">Margin (USDT)</th>
                  <th className="py-2.5 px-3">Take Profit / Stop Loss</th>
                  <th className="py-2.5 px-3">Unrealized PnL (ROE%)</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b313a]/50 text-gray-200">
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-500 font-sans">
                      No active open margin positions. Submit an order above to start trading.
                    </td>
                  </tr>
                ) : (
                  positions.map((p) => {
                    const posMarketId = p.marketId || symbol;
                    const posBaseAsset = posMarketId.replace('USDT', '');
                    const posSize = parseFloat(p.size);
                    const entry = parseFloat(p.entryPrice);
                    const posMarkPrice = allTickersMap[posMarketId] || parseFloat(p.markPrice) || entry;
                    const margin = parseFloat(p.margin);

                    const unPnl = p.side === 'LONG'
                      ? (posMarkPrice - entry) * posSize
                      : (entry - posMarkPrice) * posSize;
                    const roe = margin > 0 ? (unPnl / margin) * 100 : 0;
                    const isProfit = unPnl >= 0;

                    return (
                      <tr key={p.id} className="hover:bg-[#2b313a]/40 transition">
                        <td className="py-3 px-3 font-bold text-white flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{posMarketId} PERP</span>
                        </td>
                        <td className={`py-3 px-3 font-bold ${p.side === 'LONG' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                          {p.side}
                        </td>
                        <td className="py-3 px-3 text-yellow-400 font-bold">{p.leverage}x</td>
                        <td className="py-3 px-3 font-semibold">{posSize.toFixed(4)} {posBaseAsset}</td>
                        <td className="py-3 px-3 font-bold text-yellow-400">
                          ${entry < 0.001 ? entry.toFixed(7) : entry.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          ${posMarkPrice < 0.001 ? posMarkPrice.toFixed(7) : posMarkPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-red-400 font-semibold">
                          ${parseFloat(p.liquidationPrice) < 0.001 ? parseFloat(p.liquidationPrice).toFixed(7) : parseFloat(p.liquidationPrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-3">${margin.toFixed(2)}</td>
                        <td className="py-3 px-3 text-gray-400 text-[11px]">
                          TP: <span className="text-emerald-400 font-semibold">{p.takeProfit ? `$${p.takeProfit}` : '---'}</span> / SL: <span className="text-red-400 font-semibold">{p.stopLoss ? `$${p.stopLoss}` : '---'}</span>
                        </td>
                        <td className={`py-3 px-3 font-bold text-sm ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}${unPnl.toFixed(2)} ({isProfit ? '+' : ''}{roe.toFixed(2)}%)
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleClosePosition(p.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1 rounded-lg text-xs font-sans font-bold transition shadow-sm"
                          >
                            Market Close
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeBottomTab === 'HISTORY' && (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e2329] text-gray-400 font-sans border-b border-[#2b313a]">
                <tr>
                  <th className="py-2.5 px-3">Market</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Leverage</th>
                  <th className="py-2.5 px-3">Position Size</th>
                  <th className="py-2.5 px-3">Entry Price</th>
                  <th className="py-2.5 px-3">Close Exit Price</th>
                  <th className="py-2.5 px-3">Realized PnL (USDT)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Date / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b313a]/50 text-gray-200">
                {closedPositions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500 font-sans">
                      No closed position history recorded yet. Close open positions above to view trade history.
                    </td>
                  </tr>
                ) : (
                  closedPositions.map((p) => {
                    const posMarketId = p.marketId || symbol;
                    const posBaseAsset = posMarketId.replace('USDT', '');
                    const posSize = parseFloat(p.size);
                    const entry = parseFloat(p.entryPrice);
                    const exit = parseFloat(p.markPrice) || entry;
                    const pnl = p.side === 'LONG' ? (exit - entry) * posSize : (entry - exit) * posSize;
                    const isProf = pnl >= 0;

                    return (
                      <tr key={p.id} className="hover:bg-[#2b313a]/40 transition">
                        <td className="py-3 px-3 font-bold text-white">{posMarketId} PERP</td>
                        <td className={`py-3 px-3 font-bold ${p.side === 'LONG' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>{p.side}</td>
                        <td className="py-3 px-3 text-yellow-400 font-bold">{p.leverage}x</td>
                        <td className="py-3 px-3">{posSize.toFixed(4)} {posBaseAsset}</td>
                        <td className="py-3 px-3">${entry < 0.001 ? entry.toFixed(7) : entry.toFixed(2)}</td>
                        <td className="py-3 px-3 text-yellow-400 font-bold">${exit < 0.001 ? exit.toFixed(7) : exit.toFixed(2)}</td>
                        <td className={`py-3 px-3 font-bold text-sm ${isProf ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isProf ? '+' : ''}${pnl.toFixed(2)}
                        </td>
                        <td className="py-3 px-3"><span className="bg-gray-500/20 text-gray-300 px-2 py-0.5 rounded text-[10px]">CLOSED</span></td>
                        <td className="py-3 px-3 text-right text-gray-400">{new Date(p.updatedAt).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeBottomTab === 'ANALYTICS' && (
            <div className="p-4 space-y-4 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[#14181d] border border-[#2b313a] p-4 rounded-xl">
                  <div className="text-xs text-gray-400 font-semibold mb-1">Win Rate %</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">85.7%</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">6 Wins / 1 Loss</div>
                </div>

                <div className="bg-[#14181d] border border-[#2b313a] p-4 rounded-xl">
                  <div className="text-xs text-gray-400 font-semibold mb-1">Total Net Realized PnL</div>
                  <div className="text-2xl font-bold font-mono text-yellow-400">+$1,452.80 USDT</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-1">+180.4% Account Return</div>
                </div>

                <div className="bg-[#14181d] border border-[#2b313a] p-4 rounded-xl">
                  <div className="text-xs text-gray-400 font-semibold mb-1">Best Win Trade</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">+$480.00 USDT</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">BTCUSDT 50x Long</div>
                </div>

                <div className="bg-[#14181d] border border-[#2b313a] p-4 rounded-xl">
                  <div className="text-xs text-gray-400 font-semibold mb-1">Profit Factor</div>
                  <div className="text-2xl font-bold font-mono text-blue-400">4.28</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">Avg Win vs Loss Ratio</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile Bottom Quick Action Bar (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#181a20] border-t border-[#2b313a] p-2.5 grid grid-cols-2 gap-2 z-40 shadow-2xl">
        <button
          type="button"
          onClick={() => {
            setTab('LONG');
            setMobileTab('TRADE');
          }}
          className="py-3 rounded-xl font-black text-sm bg-[#0ecb81] text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center space-x-1"
        >
          <span>🟢 Buy / Long</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('SHORT');
            setMobileTab('TRADE');
          }}
          className="py-3 rounded-xl font-black text-sm bg-[#f6465d] text-white shadow-lg shadow-red-500/20 active:scale-95 transition flex items-center justify-center space-x-1"
        >
          <span>🔴 Sell / Short</span>
        </button>
      </div>
    </div>
  );
}
