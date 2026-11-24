'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  X,
  RefreshCw,
} from 'lucide-react';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [quoteItems, setQuoteItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 10 },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qRes, rRes, pRes] = await Promise.all([
        fetch('/api/v1/quotations'),
        fetch('/api/v1/retailers'),
        fetch('/api/v1/products'),
      ]);

      if (qRes.ok) {
        const json = await qRes.json();
        setQuotations(json.data || []);
      }
      if (rRes.ok) {
        const rJson = await rRes.json();
        setRetailers(rJson.data || []);
        if (rJson.data?.length > 0 && !selectedRetailerId) {
          setSelectedRetailerId(rJson.data[0]._id);
        }
      }
      if (pRes.ok) {
        const pJson = await pRes.json();
        setProducts(pJson.data || []);
        if (pJson.data?.length > 0 && !quoteItems[0].productId) {
          setQuoteItems([{ productId: pJson.data[0]._id, quantity: 10 }]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const validItems = quoteItems.filter((it) => it.productId && it.quantity > 0);
      if (validItems.length === 0) {
        setModalError('Please add at least one line item');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/v1/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: selectedRetailerId,
          items: validItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error || 'Failed to create quotation');
      } else {
        setShowCreateModal(false);
        fetchData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (quoteId: string) => {
    setConvertingId(quoteId);
    try {
      const res = await fetch(`/api/v1/quotations/${quoteId}/convert`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConvertingId(null);
    }
  };

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
            <FileSpreadsheet className="w-6 h-6 text-purple-400" />
            B2B Commercial Quotations
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal wholesale pricing estimates, trade discount validation, and 1-click conversion to confirmed sales orders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New B2B Quotation</span>
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Quotation Ref</th>
                <th className="py-3 px-4">Retailer Partner</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Taxable Value</th>
                <th className="py-3 px-4">Quoted Total</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No active quotations found.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => {
                  const ret = q.retailerId || {};
                  return (
                    <tr key={q._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{q.quotationNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{ret.name}</div>
                        <div className="text-[10px] text-purple-400 font-mono">{ret.dealerCode}</div>
                      </td>
                      <td className="py-3 px-4">{q.items?.length || 1} SKU lines</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{formatCurrency(q.taxableAmount)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {formatCurrency(q.finalQuotationValue)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        Valid until {new Date(q.validUntil).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {q.status === 'CONVERTED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Converted to Order
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvert(q._id)}
                            disabled={convertingId === q._id}
                            className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                          >
                            {convertingId === q._id ? 'Converting...' : 'Convert to Order →'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80  animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                Issue B2B Commercial Quotation
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateQuotation} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Dealer / Retailer *</label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {retailers.map((r) => (
                    <option key={r._id} value={r._id}>{r.name} ({r.dealerCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Quotation Items</label>
                <div className="space-y-2">
                  {quoteItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const updated = [...quoteItems];
                          updated[idx].productId = e.target.value;
                          setQuoteItems(updated);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white truncate"
                      >
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.sku}) — Wholesale: {formatCurrency(p.dealerPrice)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...quoteItems];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setQuoteItems(updated);
                        }}
                        className="w-20 px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white text-center font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#23294E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#10132A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Issue Formal Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
