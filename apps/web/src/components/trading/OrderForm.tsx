'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../lib/socket';

interface OrderFormProps {
  symbol: string;
  selectedPrice?: string;
  onOrderPlaced?: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ symbol, selectedPrice, onOrderPlaced }) => {
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState('0.00');
  const [quantity, setQuantity] = useState('');
  const [percentage, setPercentage] = useState<number | null>(null);
  const [balances, setBalances] = useState<{ available: string; locked: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const baseAsset = symbol.replace('USDT', '');
  const quoteAsset = 'USDT';

  // Fetch initial market price for current symbol
  useEffect(() => {
    api.get('/marketdata/tickers').then((res) => {
      const found = res.data.tickers?.find((t: any) => t.symbol === symbol);
      if (found && !selectedPrice) {
        setPrice(found.lastPrice.toString());
      }
    }).catch(() => {});
  }, [symbol]);

  // Subscribe to real-time ticker updates for price auto-fill if limit order price unedited
  useEffect(() => {
    const socket = getSocket();
    const room = `market:${symbol}:ticker`;
    socket.emit('subscribe', room);

    const onUpdate = (payload: any) => {
      if (payload.channel === room && payload.data?.price) {
        if (!selectedPrice && price === '0.00') {
          setPrice(payload.data.price.toString());
        }
      }
    };

    socket.on('update', onUpdate);
    return () => {
      socket.off('update', onUpdate);
      socket.emit('unsubscribe', room);
    };
  }, [symbol, selectedPrice, price]);

  useEffect(() => {
    if (selectedPrice && orderType === 'LIMIT') {
      setPrice(selectedPrice);
    }
  }, [selectedPrice, orderType]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
    }
  }, [isAuthenticated, symbol, tab]);

  const fetchBalance = async () => {
    try {
      const res = await api.get('/wallets/balances');
      const targetAsset = tab === 'BUY' ? quoteAsset : baseAsset;
      const found = res.data.balances.find((b: any) => b.asset.id === targetAsset);
      setBalances(found ? { available: found.available, locked: found.locked } : { available: '0', locked: '0' });
    } catch (e) {
      console.error('Failed to fetch balance:', e);
    }
  };

  const handlePercentageSelect = (pct: number) => {
    setPercentage(pct);
    if (!balances) return;
    const avail = parseFloat(balances.available);
    if (tab === 'BUY') {
      const p = parseFloat(price) || 1;
      const calcQty = ((avail * (pct / 100)) / p).toFixed(4);
      setQuantity(calcQty);
    } else {
      const calcQty = (avail * (pct / 100)).toFixed(4);
      setQuantity(calcQty);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!isAuthenticated) {
      setMsg({ type: 'error', text: 'Please log in to place orders.' });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/orders', {
        marketId: symbol,
        side: tab,
        type: orderType,
        price: orderType === 'LIMIT' ? price : '0',
        quantity,
      });

      setMsg({ type: 'success', text: `${tab} Order submitted successfully` });
      setQuantity('');
      fetchBalance();
      if (onOrderPlaced) onOrderPlaced();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to place order' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#181a20] border-t md:border-t-0 md:border-l border-[#2b313a] p-4 flex flex-col justify-between font-sans h-full">
      <div>
        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setTab('BUY')}
            className={`py-2 rounded-lg font-bold text-sm transition ${
              tab === 'BUY' ? 'bg-[#0ecb81] text-black shadow-lg shadow-emerald-500/20' : 'bg-[#2b313a] text-gray-400'
            }`}
          >
            Buy {baseAsset}
          </button>
          <button
            onClick={() => setTab('SELL')}
            className={`py-2 rounded-lg font-bold text-sm transition ${
              tab === 'SELL' ? 'bg-[#f6465d] text-white shadow-lg shadow-red-500/20' : 'bg-[#2b313a] text-gray-400'
            }`}
          >
            Sell {baseAsset}
          </button>
        </div>

        {/* Limit / Market Selector */}
        <div className="flex items-center space-x-4 mb-4 text-xs font-semibold text-gray-400">
          <button
            onClick={() => setOrderType('LIMIT')}
            className={`pb-1 border-b-2 transition ${orderType === 'LIMIT' ? 'border-yellow-400 text-yellow-400' : 'border-transparent'}`}
          >
            Limit Order
          </button>
          <button
            onClick={() => setOrderType('MARKET')}
            className={`pb-1 border-b-2 transition ${orderType === 'MARKET' ? 'border-yellow-400 text-yellow-400' : 'border-transparent'}`}
          >
            Market Order
          </button>
        </div>

        {/* Balance Display */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3 bg-[#1e2329] p-2 rounded border border-[#2b313a]">
          <span>Avail Balance:</span>
          <span className="font-mono text-white font-semibold">
            {balances ? parseFloat(balances.available).toFixed(4) : '0.0000'} {tab === 'BUY' ? quoteAsset : baseAsset}
          </span>
        </div>

        {msg && (
          <div
            className={`p-2.5 rounded text-xs mb-3 font-semibold ${
              msg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {orderType === 'LIMIT' && (
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Price ({quoteAsset})</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#14181d] border border-[#2b313a] rounded py-2 px-3 text-sm text-white font-mono focus:outline-none focus:border-yellow-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Amount ({baseAsset})</label>
            <input
              type="number"
              step="0.0001"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#14181d] border border-[#2b313a] rounded py-2 px-3 text-sm text-white font-mono focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Quick Percentage Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                type="button"
                key={pct}
                onClick={() => handlePercentageSelect(pct)}
                className={`py-1 text-[11px] font-mono rounded border transition ${
                  percentage === pct ? 'bg-yellow-500/20 border-yellow-400 text-yellow-400' : 'bg-[#14181d] border-[#2b313a] text-gray-400 hover:text-white'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-bold text-sm transition mt-4 ${
              tab === 'BUY'
                ? 'bg-[#0ecb81] hover:bg-[#0ba368] text-black shadow-lg shadow-emerald-500/20'
                : 'bg-[#f6465d] hover:bg-[#d93a4f] text-white shadow-lg shadow-red-500/20'
            }`}
          >
            {isLoading ? 'Submitting...' : `${tab} ${baseAsset}`}
          </button>
        </form>
      </div>
    </div>
  );
};
