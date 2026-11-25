'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUi } from '@/components/providers/UiProvider';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Camera,
  Store,
  User,
  Package,
  Clock,
  MapPin,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
} from 'lucide-react';

function VerificationContent() {
  const { toast } = useUi();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await fetch('/api/sales/deliveries');
      if (res.ok) {
        const data = await res.json();
        const dels = data.deliveries || [];
        setDeliveries(dels);

        if (highlightId) {
          const match = dels.find((d: any) => d.id === highlightId);
          if (match) setSelectedDelivery(match);
        } else if (dels.length > 0) {
          // Select first pending delivery by default
          const firstPending = dels.find((d: any) => d.status === 'SUBMITTED' || d.status === 'PENDING_VERIFICATION') || dels[0];
          setSelectedDelivery((prev: any) => prev || firstPending);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [highlightId]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleDecision = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedDelivery) return;
    if (action === 'REJECT' && !remarks.trim()) {
      toast.error('A rejection reason or remark is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/deliveries/${selectedDelivery.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks: remarks || (action === 'APPROVE' ? 'Approved delivery' : 'Rejected') }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message);
        setRemarks('');
        await fetchDeliveries();
        if (selectedDelivery) {
          setSelectedDelivery({ ...selectedDelivery, status: action === 'APPROVE' ? 'VERIFIED' : 'REJECTED' });
        }
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingList = deliveries.filter((d) => d.status === 'SUBMITTED' || d.status === 'PENDING_VERIFICATION');
  const verifiedList = deliveries.filter((d) => d.status === 'VERIFIED' || d.status === 'COMPLETED');
  const rejectedList = deliveries.filter((d) => d.status === 'REJECTED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Delivery Verification &amp; Audit Center
            </h1>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              {pendingList.length} Pending Approval
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisory review of field product deliveries, photographic proof inspection, and automated warehouse inventory deduction
          </p>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-100 bg-[#F6F5FF] p-4 text-xs font-semibold text-[#5428E8]">
          {feedback}
        </div>
      )}

      {/* Two Column Layout: Left List + Right Detail Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Deliveries Queue (5 cols) */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>DELIVERIES QUEUE ({deliveries.length})</span>
            <span>{pendingList.length} Pending</span>
          </div>

          <div className="space-y-2 max-h-[78vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading audit queue...</div>
            ) : deliveries.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No deliveries in queue.</div>
            ) : (
              deliveries.map((del) => {
                const isSelected = selectedDelivery?.id === del.id;
                return (
                  <div
                    key={del.id}
                    onClick={() => setSelectedDelivery(del)}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected
                        ? 'border-[#5428E8] bg-white shadow-md shadow-[#5428E8]/10'
                        : 'border-[#E6E8F2] bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{del.deliveryNumber}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                          del.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : del.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {del.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-bold text-slate-800">{del.shop?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{del.shop?.address}</p>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <span className="text-slate-500">{del.employee?.firstName} {del.employee?.lastName}</span>
                      <span className="font-mono font-bold text-purple-900">₹{del.finalDeliveryValue?.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Inspector & Verification Action (7 cols) */}
        <div className="lg:col-span-7">
          {selectedDelivery ? (
            <div className="rounded-3xl border border-[#E6E8F2] bg-white p-6 shadow-xs space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{selectedDelivery.deliveryNumber}</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        selectedDelivery.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : selectedDelivery.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {selectedDelivery.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Submitted on {new Date(selectedDelivery.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Final Net Value</span>
                  <p className="text-xl font-black text-purple-900 font-mono">
                    ₹{selectedDelivery.finalDeliveryValue?.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Retailer & Sales Rep Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-[#F6F5FF] p-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Retailer Shop</span>
                  <p className="font-bold text-slate-900 mt-1">{selectedDelivery.shop?.name}</p>
                  <p className="text-[11px] text-slate-500">{selectedDelivery.shop?.ownerName} • {selectedDelivery.shop?.phone}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{selectedDelivery.shop?.address}, {selectedDelivery.shop?.city}</p>
                </div>

                <div className="rounded-2xl bg-[#F6F5FF] p-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Delivering Representative</span>
                  <p className="font-bold text-slate-900 mt-1">
                    {selectedDelivery.employee?.firstName} {selectedDelivery.employee?.lastName}
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedDelivery.employee?.employeeCode}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Check-in Verified via GPS</p>
                </div>
              </div>

              {/* Delivered Products Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase mb-2">
                  Delivered Items ({selectedDelivery.items?.length || 0} product lines, {selectedDelivery.totalQuantity} units)
                </h3>
                <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#F6F5FF] text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Discount</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDelivery.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-800">{item.product?.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">SKU: {item.product?.sku}</p>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-900">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{item.unitPrice}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                            {item.discountAmount > 0 ? `-₹${item.discountAmount}` : '₹0'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{item.totalPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Photos Grid */}
              {selectedDelivery.photos?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase mb-2">Photographic Evidence Proofs</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedDelivery.photos.map((p: any, idx: number) => (
                      <div key={idx} className="group relative rounded-2xl overflow-hidden border border-slate-200">
                        <img src={p.photoUrl} alt={p.category} className="h-32 w-full object-cover" />
                        <div className="p-2 bg-slate-50 text-center">
                          <span className="text-[9px] font-bold text-slate-700 uppercase">{p.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Notes */}
              {selectedDelivery.deliveryNotes && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Remarks</span>
                  <p className="mt-0.5 text-slate-700">{selectedDelivery.deliveryNotes}</p>
                </div>
              )}

              {/* Verification Actions */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Audit / Verification Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter audit notes or rejection reason..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleDecision('REJECT')}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject Delivery</span>
                  </button>

                  <button
                    onClick={() => handleDecision('APPROVE')}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve &amp; Deduct Inventory</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
              Select a delivery from the queue to inspect and verify.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeliveryVerificationCenterPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-400">Loading verification center...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
