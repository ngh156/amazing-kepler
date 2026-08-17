'use client';

import React from 'react';
import { X, CheckCircle, TrendingUp, TrendingDown, Share2, Sparkles, ShieldCheck } from 'lucide-react';

interface ClosedPositionData {
  symbol: string;
  side: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  closePrice: number;
  size: number;
  margin: number;
  pnl: number;
  roe: number;
}

interface ClosePositionModalProps {
  data: ClosedPositionData | null;
  onClose: () => void;
}

export const ClosePositionModal: React.FC<ClosePositionModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  const isProfit = data.pnl >= 0;
  const baseAsset = data.symbol.replace('USDT', '');

  return (
    <div className="fixed inset-[#0000] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-[#181a20] border border-yellow-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#1e2329] via-[#2b313a] to-[#1e2329] px-6 py-4 border-b border-[#2b313a] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold text-sm">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider text-yellow-400">APEX CEX FUTURES</div>
              <div className="text-[10px] text-gray-400 font-mono">POSITION CLOSE RECEIPT</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2b313a] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main PnL Card Body */}
        <div className="p-6 text-center space-y-6">
          {/* Market & Side Badge */}
          <div className="flex items-center justify-center space-x-3">
            <span className="text-lg font-extrabold text-white font-mono">{data.symbol} PERP</span>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
                data.side === 'LONG'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {data.side} {data.leverage}x
            </span>
          </div>

          {/* Big PnL & ROE% Display */}
          <div
            className={`p-6 rounded-2xl border ${
              isProfit
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 glow-green'
                : 'bg-red-500/10 border-red-500/30 text-red-400 glow-red'
            }`}
          >
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
              {isProfit ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
              <span>Realized Settlement PnL</span>
            </div>

            <div className="text-4xl font-extrabold font-mono tracking-tight my-2">
              {isProfit ? '+' : ''}${data.pnl.toFixed(2)}{' '}
              <span className="text-lg text-gray-300">USDT</span>
            </div>

            <div className="text-xl font-bold font-mono">
              {isProfit ? '+' : ''}{data.roe.toFixed(2)}% <span className="text-xs text-gray-400 font-sans">ROE</span>
            </div>
          </div>

          {/* Detailed Execution Breakdown Table */}
          <div className="bg-[#14181d] p-4 rounded-xl border border-[#2b313a] space-y-2 text-xs font-mono">
            <div className="flex justify-between text-gray-400">
              <span>Entry Price:</span>
              <span className="text-white font-semibold">${data.entryPrice.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-gray-400">
              <span>Close Exit Price:</span>
              <span className="text-yellow-400 font-bold">${data.closePrice.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-gray-400">
              <span>Position Size:</span>
              <span className="text-white font-semibold">{data.size.toFixed(4)} {baseAsset}</span>
            </div>

            <div className="flex justify-between text-gray-400">
              <span>Margin Deposited:</span>
              <span className="text-gray-300">${data.margin.toFixed(2)} USDT</span>
            </div>

            <div className="border-t border-[#2b313a] pt-2 flex justify-between items-center text-gray-400">
              <span>Settlement Account:</span>
              <span className="text-emerald-400 font-bold flex items-center space-x-1 font-sans text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>USDT Spot Wallet</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => alert('PnL Share Card saved! Share code: APEX-' + Math.random().toString(36).substring(7).toUpperCase())}
              className="py-2.5 px-4 rounded-xl bg-[#2b313a] hover:bg-[#363c4e] text-white font-bold text-xs transition border border-[#363c4e] flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4 text-yellow-400" />
              <span>Share PnL Card</span>
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs transition shadow-lg shadow-yellow-500/20 flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>Trade Again</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
