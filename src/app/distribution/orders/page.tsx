'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  X,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Order Creation State
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 5 },
  ]);
  const [paymentTerms, setPaymentTerms] = useState('Net 15 Days');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/orders', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);

      const [ordRes, retRes, prodRes] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/v1/retailers'),
        fetch('/api/v1/products'),
      ]);

      if (ordRes.ok) {
        const json = await ordRes.json();
        setOrders(json.data || []);
      }
      if (retRes.ok) {
        const retJson = await retRes.json();
        setRetailers(retJson.data || []);
        if (retJson.data?.length > 0 && !selectedRetailerId) {
          setSelectedRetailerId(retJson.data[0]._id);
        }
      }
      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        setProducts(prodJson.data || []);
        if (prodJson.data?.length > 0 && !orderItems[0].productId) {
          setOrderItems([{ productId: prodJson.data[0]._id, quantity: 5 }]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const validItems = orderItems.filter((it) => it.productId && it.quantity > 0);
      if (validItems.length === 0) {
        setModalError('Please add at least one product with quantity');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: selectedRetailerId,
          items: validItems,
          paymentTerms,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error || 'Failed to place sales order');
      } else {
        setShowCreateModal(false);
        fetchOrders();
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchOrders();
    } catch (e) {
      console.error(e);
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
            <ShoppingCart className="w-6 h-6 text-purple-400" />
            B2B Sales Orders Console
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full lifecycle management: order booking, inventory allocation, GST Rule 46 calculation and dispatch routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New B2B Order</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by order number or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#10132A] border border-[#23294E] focus:border-purple-500 text-xs text-white placeholder-slate-400 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="APPROVED">Approved / Confirmed</option>
            <option value="PROCESSING">Processing / Reserved</option>
            <option value="DISPATCHED">Dispatched / In-Transit</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Retailer & Location</th>
                <th className="py-3 px-4">Units & Lines</th>
                <th className="py-3 px-4">Taxable Value</th>
                <th className="py-3 px-4">GST (18%)</th>
                <th className="py-3 px-4">Final Order Value</th>
                <th className="py-3 px-4">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading orders from database...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const gstTotal = (o.cgstTotal || 0) + (o.sgstTotal || 0) + (o.igstTotal || 0);
                  const ret = o.retailerId || {};

                  return (
                    <tr key={o._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {o.orderNumber}
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          {new Date(o.orderDate || o.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{ret.name || 'Retail Partner'}</div>
                        <div className="text-[10px] text-purple-400">
                          {ret.dealerCode} • {ret.city || 'Bangalore'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">{o.totalUnits} Units</span>
                        <div className="text-[10px] text-slate-400">{o.totalLines || o.items?.length || 1} SKUs</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{formatCurrency(o.taxableValue)}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{formatCurrency(gstTotal)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {formatCurrency(o.finalOrderValue)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.status === 'DELIVERED'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : o.status === 'DISPATCHED'
                                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                : o.status === 'PROCESSING' || o.status === 'APPROVED'
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            }`}
                          >
                            {o.status}
                          </span>

                          {o.status === 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateStatus(o._id, 'PROCESSING')}
                              className="px-2 py-0.5 rounded bg-[#1C234E] hover:bg-[#28326D] text-[10px] text-purple-300 font-semibold"
                            >
                              Process
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80  animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                Book Direct B2B Sales Order
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

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Retailer Partner *</label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {retailers.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.dealerCode}) — Credit Balance: {formatCurrency(r.outstandingBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Order Line Items</label>
                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[idx].productId = e.target.value;
                          setOrderItems(updated);
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
                          const updated = [...orderItems];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setOrderItems(updated);
                        }}
                        className="w-20 px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white text-center font-mono"
                      />
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                          className="p-2 text-rose-400 hover:text-rose-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setOrderItems([...orderItems, { productId: products[0]?._id, quantity: 5 }])}
                  className="mt-2 text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Product Line</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment SLA Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  <option value="Net 15 Days">Net 15 Days (Authorized Dealer Credit)</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Immediate Bank Transfer">Immediate Bank Transfer</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                </select>
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Confirming Order & Reserving Stock...' : 'Submit & Reserve Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
