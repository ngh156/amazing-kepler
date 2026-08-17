'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';

interface RecentTradesProps {
  symbol: string;
}

export const RecentTrades: React.FC<RecentTradesProps> = ({ symbol }) => {
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/marketdata/trades/${symbol}`).then((res) => {
      setTrades(res.data.trades || []);
    });

    const socket = getSocket();
    const room = `market:${symbol}:trades`;
    socket.emit('subscribe', room);

    socket.on('update', (payload: any) => {
      if (payload.channel === room && payload.data) {
        setTrades((prev) => [payload.data, ...prev.slice(0, 49)]);
      }
    });

    return () => {
      socket.emit('unsubscribe', room);
    };
  }, [symbol]);

  return (
    <div className="bg-[#181a20] border-l border-[#2b313a] h-full flex flex-col text-xs font-mono">
      <div className="p-3 border-b border-[#2b313a] text-gray-400 font-sans font-semibold">
        Market Trades
      </div>

      <div className="grid grid-cols-3 px-3 py-1.5 text-gray-500 border-b border-[#2b313a]/50">
        <span>Price (USDT)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-transparent">
        {trades.map((t, idx) => {
          const isBuy = t.makerSide === 'SELL'; // Taker buy
          const timeStr = new Date(t.timestamp).toLocaleTimeString();
          return (
            <div key={`trade-${idx}`} className="grid grid-cols-3 px-3 py-1 hover:bg-[#2b313a]/40">
              <span className={`font-semibold ${isBuy ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {parseFloat(t.price).toFixed(2)}
              </span>
              <span className="text-right text-gray-300">{parseFloat(t.quantity).toFixed(4)}</span>
              <span className="text-right text-gray-500 text-[10px]">{timeStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
