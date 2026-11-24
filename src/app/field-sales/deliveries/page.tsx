'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  QrCode,
  Smartphone,
  Eye,
  Camera,
  Layers,
  UserCheck,
  Building2,
  AlertCircle,
} from 'lucide-react';

interface DeliveryItem {
  _id: string;
  deliveryNumber: string;
  orderId?: {
    _id: string;
    orderNumber: string;
  };
  retailerId: {
    _id: string;
    shopName: string;
    dealerCode: string;
    phone?: string;
    address?: string;
  };
  items: {
    productId: any;
    productName: string;
    sku: string;
    deliveredQuantity: number;
    assignedImeis?: string[];
  }[];
  totalUnitsDelivered: number;
  totalDeliveryValue: number;
  status: string;
  deliveredAt: string;
  shopAcknowledgement?: {
    receiverName: string;
    receiverPhone?: string;
  };
}

export default function DeliveriesListPage() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inStockImeis, setInStockImeis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Delivery Form
  const [form, setForm] = useState({
    retailerId: '',
    productId: '',
    receiverName: 'Ramesh Patel (Manager)',
    receiverPhone: '9876543210',
    selectedImei: '',
    deliveryNotes: 'Delivered in mint condition with warranty seal intact',
  });

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/electronics/deliveries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchAuxData = useCallback(async () => {
    try {
      const [rRes, pRes, iRes] = await Promise.all([
        fetch('/api/electronics/retailers'),
        fetch('/api/electronics/products'),
        fetch('/api/electronics/imei?status=IN_STOCK'),
      ]);
      if (rRes.ok) {
        const d = await rRes.json();
        setRetailers(d.retailers || []);
        if (d.retailers?.length > 0) {
          setForm((prev) => (prev.retailerId ? prev : { ...prev, retailerId: d.retailers[0]._id }));
        }
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setProducts(d.products || []);
        if (d.products?.length > 0) {
          setForm((prev) => (prev.productId ? prev : { ...prev, productId: d.products[0]._id }));
        }
      }
      if (iRes.ok) {
        const d = await iRes.json();
        setInStockImeis(d.devices || []);
        if (d.devices?.length > 0) {
          setForm((prev) => (prev.selectedImei ? prev : { ...prev, selectedImei: d.devices[0].imei1 }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.retailerId || !form.productId) {
      setFeedback({ type: 'error', message: 'Please select a retailer and product' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const payload = {
        retailerId: form.retailerId,
        deliveryNotes: form.deliveryNotes,
        shopAcknowledgement: {
          receiverName: form.receiverName,
          receiverPhone: form.receiverPhone,
        },
        items: [
          {
            productId: form.productId,
            deliveredQuantity: 1,
            assignedImeis: form.selectedImei ? [form.selectedImei] : [],
          },
        ],
      };

      const res = await fetch('/api/electronics/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Delivery ${data.delivery.deliveryNumber} completed and IMEI assigned!`,
        });
        setIsModalOpen(false);
        fetchDeliveries();
        fetchAuxData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to dispatch delivery' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.deliveryNumber?.toLowerCase().includes(s) ||
      d.retailerId?.shopName?.toLowerCase().includes(s) ||
      d.retailerId?.dealerCode?.toLowerCase().includes(s)
    );
  });

  const totalDeliveredValue = deliveries.reduce((sum, d) => sum + (d.totalDeliveryValue || 0), 0);
  const totalUnits = deliveries.reduce((sum, d) => sum + (d.totalUnitsDelivered || 0), 0);

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              LAST-MILE LOGISTICS
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              IMEI Verified Deliveries
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Product Deliveries Register
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dispatch consignments, scan delivered 15-digit IMEI serial numbers, and capture electronic shop acknowledgements.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
        >
          <Truck className="h-4 w-4" />
          Dispatch New Delivery
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Consignments</span>
            <Truck className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{deliveries.length}</p>
          <span className="text-[11px] text-slate-400">Total delivery dispatches</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Delivered Value</span>
            <span className="text-sm font-bold text-emerald-600">INR</span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            ₹{totalDeliveredValue.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-emerald-600">Total merchandise delivered</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Devices Delivered</span>
            <Smartphone className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">{totalUnits}</p>
          <span className="text-[11px] text-indigo-500">Physical units handed over</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {deliveries.filter((d) => d.status === 'DELIVERED').length}
          </p>
          <span className="text-[11px] text-emerald-600">Signed acknowledgements</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Delivery # or Dealer Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {['ALL', 'DELIVERED', 'IN_TRANSIT'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === st
                  ? 'bg-[#5428E8] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Deliveries' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading deliveries from MongoDB...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <Truck className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No Product Deliveries Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              No delivery dispatches have been registered. Dispatch your first smartphone shipment with IMEI verification.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              <Truck className="h-4 w-4" />
              Dispatch First Delivery
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Delivery #</th>
                  <th className="px-6 py-4">Dealer / Destination</th>
                  <th className="px-6 py-4">Delivered IMEIs</th>
                  <th className="px-6 py-4">Value (₹)</th>
                  <th className="px-6 py-4">Receiver Signed</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.map((del) => (
                  <tr key={del._id} className="hover:bg-indigo-50/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                      {del.deliveryNumber}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{del.retailerId?.shopName || 'Retailer'}</div>
                      <div className="text-xs text-slate-400">{del.retailerId?.dealerCode}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {del.items?.map((it, idx) => (
                          <div key={idx} className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-800">{it.productName} ({it.deliveredQuantity}x)</span>
                            {it.assignedImeis && it.assignedImeis.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {it.assignedImeis.map((imei) => (
                                  <span key={imei} className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                                    {imei}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-extrabold text-slate-900">
                      ₹{(del.totalDeliveryValue || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <div className="font-semibold text-slate-800">
                        {del.shopAcknowledgement?.receiverName || 'In Person'}
                      </div>
                      <div className="text-slate-400">
                        {del.shopAcknowledgement?.receiverPhone || 'Verified'}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> {del.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedDelivery(del)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Delivery Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Delivery Challan Slip
                </span>
                <h3 className="text-xl font-extrabold text-[#11152F] mt-0.5">
                  {selectedDelivery.deliveryNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block font-bold">RETAILER:</span>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedDelivery.retailerId?.shopName}</p>
                <p className="text-slate-500">{selectedDelivery.retailerId?.dealerCode}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">RECEIVER ACKNOWLEDGEMENT:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedDelivery.shopAcknowledgement?.receiverName || 'Authorized Staff'}
                </p>
                <p className="text-slate-500">Phone: {selectedDelivery.shopAcknowledgement?.receiverPhone || 'N/A'}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">Delivered Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5">Assigned IMEI 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDelivery.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-800">{it.productName}</td>
                      <td className="p-2.5 text-center font-bold">{it.deliveredQuantity}</td>
                      <td className="p-2.5 font-mono text-indigo-700 font-bold">
                        {it.assignedImeis?.join(', ') || 'No IMEI required'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={() => setSelectedDelivery(null)}
                className="rounded-xl bg-[#5428E8] px-5 py-2 text-xs font-bold text-white shadow hover:opacity-90"
              >
                Close Challan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 text-[#5428E8]" />
                <h3 className="text-xl font-extrabold text-[#11152F]">Dispatch Product Delivery</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Destination Dealer *
                </label>
                <select
                  value={form.retailerId}
                  onChange={(e) => setForm({ ...form, retailerId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  required
                >
                  {retailers.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name || r.shopName} ({r.dealerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Item *
                </label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  required
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.brand})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign In-Stock IMEI Serial (Auto-Deducts Stock)
                </label>
                {inStockImeis.length === 0 ? (
                  <p className="text-xs text-amber-600 font-semibold">
                    No IN_STOCK IMEIs available. Inward devices in IMEI Inventory first, or proceed without IMEI.
                  </p>
                ) : (
                  <select
                    value={form.selectedImei}
                    onChange={(e) => setForm({ ...form, selectedImei: e.target.value })}
                    className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  >
                    <option value="">-- No IMEI / Non-Cellular Item --</option>
                    {inStockImeis.map((d) => (
                      <option key={d._id} value={d.imei1}>
                        IMEI: {d.imei1} ({d.productId?.name || 'Device'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Receiver Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.receiverName}
                    onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Receiver Phone
                  </label>
                  <input
                    type="text"
                    value={form.receiverPhone}
                    onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || retailers.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-6 py-2.5 text-sm font-bold text-white shadow hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Dispatching...' : 'Confirm Delivery & Assign IMEI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
