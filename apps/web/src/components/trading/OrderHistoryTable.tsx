'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { RefreshCw } from 'lucide-react';

export const OrderHistoryTable: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<'OPEN' | 'HISTORY'>('OPEN');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const endpoint = tab === 'OPEN' ? '/orders/open' : '/orders/history';
      const res = await api.get(endpoint);
      setOrders(res.data.orders || []);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated, tab]);

  const handleCancel = async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/cancel`);
      fetchOrders();
    } catch (e) {
      console.error('Cancel order failed:', e);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-[#181a20] border-t border-[#2b313a] p-8 text-center text-gray-500 text-sm">
        Please log in to view your open orders and trade history.
      </div>
    );
  }

  return (
    <div className="bg-[#181a20] border-t border-[#2b313a] flex flex-col font-sans">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 border-b border-[#2b313a]">
        <div className="flex space-x-6 text-sm font-semibold">
          <button
            onClick={() => setTab('OPEN')}
            className={`py-3 border-b-2 transition ${tab === 'OPEN' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Open Orders ({tab === 'OPEN' ? orders.length : 0})
          </button>
          <button
            onClick={() => setTab('HISTORY')}
            className={`py-3 border-b-2 transition ${tab === 'HISTORY' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Order History
          </button>
        </div>

        <button onClick={fetchOrders} className="text-gray-400 hover:text-white p-1">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#1e2329] text-gray-500 font-sans border-b border-[#2b313a]">
            <tr>
              <th className="py-2.5 px-4">Time</th>
              <th className="py-2.5 px-4">Pair</th>
              <th className="py-2.5 px-4">Type</th>
              <th className="py-2.5 px-4">Side</th>
              <th className="py-2.5 px-4">Price</th>
              <th className="py-2.5 px-4">Amount</th>
              <th className="py-2.5 px-4">Executed</th>
              <th className="py-2.5 px-4">Status</th>
              {tab === 'OPEN' && <th className="py-2.5 px-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b313a]/40 text-gray-300">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500 font-sans">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#2b313a]/30">
                  <td className="py-2.5 px-4 text-gray-500">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="py-2.5 px-4 font-bold text-white">{o.marketId}</td>
                  <td className="py-2.5 px-4">{o.type}</td>
                  <td className={`py-2.5 px-4 font-bold ${o.side === 'BUY' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {o.side}
                  </td>
                  <td className="py-2.5 px-4">{parseFloat(o.price).toFixed(2)}</td>
                  <td className="py-2.5 px-4">{parseFloat(o.originalQuantity).toFixed(4)}</td>
                  <td className="py-2.5 px-4">{parseFloat(o.executedQuantity).toFixed(4)}</td>
                  <td className="py-2.5 px-4">
                    <span className="bg-[#2b313a] px-2 py-0.5 rounded text-[10px] text-gray-300 font-sans">
                      {o.status}
                    </span>
                  </td>
                  {tab === 'OPEN' && (
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleCancel(o.id)}
                        className="text-red-400 hover:text-red-300 hover:underline font-sans text-xs"
                      >
                        Cancel
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
