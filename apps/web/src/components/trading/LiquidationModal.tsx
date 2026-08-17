'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface LiquidationModalProps {
  data: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    leverage: number;
    entryPrice: number;
    liquidationPrice: number;
    markPrice: number;
    lossUSDT: number;
  } | null;
  onClose: () => void;
}

export const LiquidationModal: React.FC<LiquidationModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#181a20] border-2 border-red-500/80 w-full max-w-md rounded-2xl p-6 text-white font-sans shadow-2xl shadow-red-500/20 relative overflow-hidden">
        {/* Top Warning Glow Header */}
        <div className="flex items-center space-x-3 mb-4 border-b border-red-500/30 pb-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-500 animate-pulse">
            <ShieldAlert className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-red-500 tracking-wide">
              FORCE LIQUIDATION EXECUTED
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Margin Call Triggered · Maintenance Margin Breached
            </p>
          </div>
        </div>

        {/* Position Details */}
        <div className="space-y-3 font-mono text-xs bg-[#14181d] p-4 rounded-xl border border-red-500/20 mb-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#2b313a]">
            <span className="text-gray-400">Position Market:</span>
            <span className="text-white font-extrabold text-sm">{data.symbol} PERP</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-[#2b313a]">
            <span className="text-gray-400">Side & Leverage:</span>
            <span className={`font-bold ${data.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.side} {data.leverage}x
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-[#2b313a]">
            <span className="text-gray-400">Entry Price:</span>
            <span className="text-gray-300 font-semibold">${data.entryPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-[#2b313a]">
            <span className="text-gray-400">Liquidation Trigger Price:</span>
            <span className="text-red-400 font-extrabold">${data.liquidationPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-[#2b313a]">
            <span className="text-gray-400">Mark Price At Liquidation:</span>
            <span className="text-yellow-400 font-bold">${data.markPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-gray-400">Seized Initial Margin:</span>
            <span className="text-red-500 font-extrabold">-${data.lossUSDT.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Notice Info */}
        <p className="text-[11px] text-gray-400 mb-5 leading-relaxed bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          ⚠️ Your position was liquidated because the Mark Price reached the Liquidation Price threshold. The remaining margin was transferred to the Exchange Insurance Fund to prevent negative account balances.
        </p>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl transition shadow-lg shadow-red-500/30 flex items-center justify-center space-x-2"
        >
          <span>Acknowledge & Re-enter Market</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
