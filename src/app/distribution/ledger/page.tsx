'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Printer,
} from 'lucide-react';

export default function LedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0 });

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/ledger', window.location.origin);
      if (selectedRetailerId !== 'ALL') url.searchParams.set('retailerId', selectedRetailerId);
      if (typeFilter !== 'ALL') url.searchParams.set('transactionType', typeFilter);

      const [ledRes, retRes] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/v1/retailers'),
      ]);

      if (ledRes.ok) {
        const json = await ledRes.json();
        setEntries(json.data || []);
        if (json.summary) setSummary(json.summary);
      }
      if (retRes.ok) {
        const retJson = await retRes.json();
        setRetailers(retJson.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedRetailerId, typeFilter]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-400" />
            Dealer Double-Entry Ledger Statements
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable audit record of invoice debits, payment credits, credit adjustments and running balance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E2552] hover:bg-[#28326D] text-white text-xs font-semibold border border-purple-500/30 transition-all"
          >
            <Printer className="w-4 h-4 text-purple-400" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-lg">
          <div className="text-xs text-slate-400">Total Invoiced Debits</div>
          <div className="text-xl font-bold text-rose-400 mt-1 font-mono">{formatCurrency(summary.totalDebit)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Hardware supplied under credit</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-lg">
          <div className="text-xs text-slate-400">Total Realized Credits</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{formatCurrency(summary.totalCredit)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">UPI, NEFT & bank payments</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-lg">
          <div className="text-xs text-slate-400">Net Ledger Balance</div>
          <div className="text-xl font-bold text-amber-300 mt-1 font-mono">
            {formatCurrency(Math.max(0, summary.totalDebit - summary.totalCredit))}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Current outstanding across selected filter</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedRetailerId}
            onChange={(e) => setSelectedRetailerId(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Retailer Partners</option>
            {retailers.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} ({r.dealerCode})
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="INVOICE_DEBIT">Invoice Debits</option>
            <option value="PAYMENT_CREDIT">Payment Credits</option>
            <option value="RETURN_CREDIT">Sales Returns</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Posting Date</th>
                <th className="py-3 px-4">Dealer / Account</th>
                <th className="py-3 px-4">Reference ID</th>
                <th className="py-3 px-4">Transaction Details</th>
                <th className="py-3 px-4 text-right">Debit (+)</th>
                <th className="py-3 px-4 text-right">Credit (-)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Calculating ledger balances...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No ledger entries found.
                  </td>
                </tr>
              ) : (
                entries.map((ent) => {
                  const ret = ent.retailerId || {};
                  const isDebit = ent.debitAmount > 0;

                  return (
                    <tr key={ent._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(ent.date || ent.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{ret.name || 'Dealer'}</div>
                        <div className="text-[10px] text-purple-400 font-mono">{ret.dealerCode}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-white">{ent.referenceId}</td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs">{ent.description}</td>
                      <td className="py-3 px-4 font-mono text-right font-medium text-rose-400">
                        {ent.debitAmount > 0 ? formatCurrency(ent.debitAmount) : '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-medium text-emerald-400">
                        {ent.creditAmount > 0 ? formatCurrency(ent.creditAmount) : '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-bold text-white">
                        {formatCurrency(ent.balance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
