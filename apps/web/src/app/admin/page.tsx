'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Shield, Users, PlusCircle, Activity } from 'lucide-react';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const [newSymbol, setNewSymbol] = useState('');
  const [baseAsset, setBaseAsset] = useState('SOL');
  const [quoteAsset, setQuoteAsset] = useState('USDT');

  const fetchAdminData = async () => {
    if (!isAuthenticated) return;
    try {
      const usersRes = await api.get('/admin/users');
      setUsersList(usersRes.data.users || []);

      const logsRes = await api.get('/admin/audit-logs');
      setAuditLogs(logsRes.data.logs || []);
    } catch (e) {
      console.error('Failed to fetch admin data:', e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [isAuthenticated]);

  const handleFreezeToggle = async (userId: string, currentFreeze: boolean) => {
    try {
      await api.post(`/admin/users/${userId}/freeze`, { isFrozen: !currentFreeze });
      setMsg(`User freeze status updated`);
      fetchAdminData();
    } catch (e) {
      console.error('Freeze failed:', e);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/markets', {
        symbol: newSymbol || `${baseAsset}/${quoteAsset}`,
        baseAssetId: baseAsset,
        quoteAssetId: quoteAsset,
      });
      setMsg(`Market ${newSymbol || `${baseAsset}/${quoteAsset}`} created successfully!`);
      setNewSymbol('');
    } catch (err: any) {
      setMsg(`Failed to create market: ${err.response?.data?.message || 'Error'}`);
    }
  };

  if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
    return (
      <div className="flex-1 bg-[#12161c] p-12 text-center text-red-400 font-bold">
        Access Denied. You must be logged in as an Administrator to view Backoffice operations.
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#12161c] p-6 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex items-center space-x-3 border-b border-[#2b313a] pb-4">
        <Shield className="w-8 h-8 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Backoffice Operations Dashboard</h1>
          <p className="text-xs text-gray-400">Admin Control Center & Security Audit Trail</p>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs rounded-lg font-semibold">
          {msg}
        </div>
      )}

      {/* Grid: Create Market & Users */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Market Form */}
        <div className="bg-[#181a20] border border-[#2b313a] rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-yellow-400" />
            <span>List New Trading Pair</span>
          </h2>

          <form onSubmit={handleCreateMarket} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Pair Symbol</label>
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="SOL/USDT"
                className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Base Asset</label>
                <input
                  type="text"
                  value={baseAsset}
                  onChange={(e) => setBaseAsset(e.target.value)}
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Quote Asset</label>
                <input
                  type="text"
                  value={quoteAsset}
                  onChange={(e) => setQuoteAsset(e.target.value)}
                  className="w-full bg-[#14181d] border border-[#2b313a] rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2.5 rounded-lg text-xs transition"
            >
              List Market
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="md:col-span-2 bg-[#181a20] border border-[#2b313a] rounded-xl p-6 shadow-xl overflow-hidden">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>User Management ({usersList.length})</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e2329] text-gray-400 border-b border-[#2b313a] font-sans">
                <tr>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">KYC</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b313a]/50 text-gray-300">
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-3 font-semibold text-white">{u.email}</td>
                    <td className="py-3 px-3">{u.role}</td>
                    <td className="py-3 px-3 text-emerald-400">{u.kycLevel}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${u.isFrozen ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {u.isFrozen ? 'FROZEN' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleFreezeToggle(u.id, u.isFrozen)}
                        className="text-yellow-400 hover:underline font-sans text-xs"
                      >
                        {u.isFrozen ? 'Unfreeze' : 'Freeze'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Trail Log */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <span>Security Audit Trail Log</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#1e2329] text-gray-400 border-b border-[#2b313a] font-sans">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b313a]/50 text-gray-400">
              {auditLogs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 px-3 text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-white">{l.actor.email}</td>
                  <td className="py-2.5 px-3 text-yellow-400 font-bold">{l.action}</td>
                  <td className="py-2.5 px-3">{l.resource}</td>
                  <td className="py-2.5 px-3 text-gray-500">{l.metadata || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
