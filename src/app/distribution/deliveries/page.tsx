'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  RefreshCw,
  Building,
  Scan,
} from 'lucide-react';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [receiverName, setReceiverName] = useState('Store Manager');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Dispatch Form
  const [dispatchData, setDispatchData] = useState({
    orderId: '',
    warehouseId: '',
    imeiInput: '',
    deliveryNotes: 'Standard secure hardware courier',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/deliveries', window.location.origin);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);

      const [dlvRes, ordRes, whRes] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/v1/orders?status=APPROVED'),
        fetch('/api/v1/warehouses'),
      ]);

      if (dlvRes.ok) {
        const json = await dlvRes.json();
        setDeliveries(json.data || []);
      }
      if (ordRes.ok) {
        const ordJson = await ordRes.json();
        setOrders(ordJson.data || []);
        if (ordJson.data?.length > 0 && !dispatchData.orderId) {
          setDispatchData((prev) => ({ ...prev, orderId: ordJson.data[0]._id }));
        }
      }
      if (whRes.ok) {
        const whJson = await whRes.json();
        setWarehouses(whJson.data || []);
        if (whJson.data?.length > 0 && !dispatchData.warehouseId) {
          setDispatchData((prev) => ({ ...prev, warehouseId: whJson.data[0]._id }));
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
  }, [statusFilter]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const order = orders.find((o) => o._id === dispatchData.orderId);
      if (!order) {
        setModalError('Please select a valid order');
        setSubmitting(false);
        return;
      }

      const imeis = dispatchData.imeiInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const items = (order.items || []).map((it: any) => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        orderedQuantity: it.quantity,
        deliveredQuantity: it.quantity,
        unitPrice: it.unitPrice,
        assignedImeis: imeis,
      }));

      const res = await fetch('/api/v1/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: dispatchData.orderId,
          warehouseId: dispatchData.warehouseId,
          items,
          deliveryNotes: dispatchData.deliveryNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error || 'Failed to dispatch delivery');
      } else {
        setShowDispatchModal(false);
        fetchData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/deliveries/${selectedDeliveryId}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverName }),
      });
      if (res.ok) {
        setShowConfirmModal(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
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
            <Truck className="w-6 h-6 text-purple-400" />
            Dispatch & Logistics Console
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Warehouse dispatch management, dual IMEI allocation, courier custody and customer proof-of-delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDispatchModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch New Shipment</span>
          </button>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Dispatch Ref</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Retailer Destination</th>
                <th className="py-3 px-4">Warehouse Origin</th>
                <th className="py-3 px-4">Units Dispatched</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Status & POD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading deliveries from database...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No active dispatches or deliveries found.
                  </td>
                </tr>
              ) : (
                deliveries.map((dlv) => {
                  const ret = dlv.retailerId || {};
                  const ord = dlv.orderId || {};
                  const wh = dlv.warehouseId || {};

                  return (
                    <tr key={dlv._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {dlv.deliveryNumber}
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          {new Date(dlv.deliveredAt || dlv.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-purple-300">{ord.orderNumber || 'Direct'}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{ret.name}</div>
                        <div className="text-[10px] text-slate-400">{ret.city || 'Bangalore'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{wh.name || 'Central Hub'}</td>
                      <td className="py-3 px-4 font-bold text-white">{dlv.totalUnitsDelivered} Units</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {formatCurrency(dlv.totalDeliveryValue)}
                      </td>
                      <td className="py-3 px-4">
                        {dlv.status === 'COMPLETED' ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Delivered to {dlv.shopAcknowledgement?.receiverName || 'Store'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                              IN TRANSIT
                            </span>
                            <button
                              onClick={() => {
                                setSelectedDeliveryId(dlv._id);
                                setShowConfirmModal(true);
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px]"
                            >
                              Confirm POD
                            </button>
                          </div>
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

      {/* Dispatch Shipment Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-400" />
                Dispatch Order with IMEI Allocation
              </h2>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleDispatch} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Confirmed Order *</label>
                <select
                  value={dispatchData.orderId}
                  onChange={(e) => setDispatchData({ ...dispatchData, orderId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {orders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} — {o.retailerId?.name} ({o.totalUnits} Units, {formatCurrency(o.finalOrderValue)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dispatching Warehouse *</label>
                <select
                  value={dispatchData.warehouseId}
                  onChange={(e) => setDispatchData({ ...dispatchData, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Scan / Paste Device Dual IMEIs (1 per line)
                </label>
                <textarea
                  rows={4}
                  placeholder="358941091234567&#10;358941091234568&#10;358941091234569"
                  value={dispatchData.imeiInput}
                  onChange={(e) => setDispatchData({ ...dispatchData, imeiInput: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#23294E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#10132A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Dispatching...' : 'Dispatch Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delivery Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <h3 className="text-base font-bold text-white mb-2">Confirm Proof of Delivery (POD)</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the store recipient&apos;s name. This will mark delivery completed, activate device warranties, and issue the GST Tax Invoice.
            </p>

            <form onSubmit={handleConfirmDelivery} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Receiver Name *</label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#23294E]">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#10132A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold"
                >
                  {submitting ? 'Confirming...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
