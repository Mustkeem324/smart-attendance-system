'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Store,
  MapPin,
  Phone,
  User,
  Calendar,
  Truck,
  Receipt,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Clock,
  ExternalLink,
  ShieldCheck,
  Package,
} from 'lucide-react';

export default function ShopDetailPage() {
  const params = useParams();
  const shopId = params.id as string;

  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'visits' | 'payments' | 'photos'>('deliveries');

  const fetchShop = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales/shops/${shopId}`);
      if (res.ok) {
        const data = await res.json();
        setShop(data.shop);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (shopId) fetchShop();
  }, [shopId, fetchShop]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5428E8] border-t-transparent" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
        <Store className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-2 text-base font-bold text-slate-800">Shop Not Found</h3>
        <p className="mt-1 text-xs text-slate-400">The requested retailer store does not exist or has been archived.</p>
        <Link
          href="/field-sales/shops"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  const deliveries: any[] = shop.deliveries || [];
  const visits: any[] = shop.visits || [];
  const payments: any[] = shop.payments || [];

  const totalDeliveredValue = deliveries
    .filter((d) => d.status === 'VERIFIED' || d.status === 'COMPLETED')
    .reduce((sum, d) => sum + d.finalDeliveryValue, 0);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = Math.max(0, totalDeliveredValue - totalPaid);

  // Collect all photos from visits and deliveries
  const allPhotos: any[] = [];
  deliveries.forEach((d) => {
    if (d.photos && d.photos.length > 0) {
      d.photos.forEach((p: any) => allPhotos.push({ ...p, source: `Delivery #${d.deliveryNumber}` }));
    }
  });
  visits.forEach((v) => {
    if (v.photoUrl) {
      allPhotos.push({ photoUrl: v.photoUrl, category: 'VISIT_CHECKIN', source: `Visit on ${v.visitDate}` });
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex items-center justify-between">
        <Link
          href="/field-sales/shops"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Shop Directory</span>
        </Link>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          ● {shop.status}
        </span>
      </div>

      {/* Header Card */}
      <div className="rounded-3xl border border-[#E6E8F2] bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#5428E8]/10 text-[#5428E8]">
              <Store className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">{shop.name}</h1>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-[#5428E8]">
                  {shop.category}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Owner: <span className="font-semibold text-slate-800">{shop.ownerName}</span> • Phone: <span className="font-semibold text-slate-800">{shop.phone}</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{shop.address}, {shop.city} - {shop.pincode}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-100 bg-[#F6F5FF] p-3 text-center min-w-[120px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Sales</p>
              <p className="text-base font-black text-slate-900 font-mono">₹{totalDeliveredValue.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-[#F6F5FF] p-3 text-center min-w-[120px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Paid Amount</p>
              <p className="text-base font-black text-emerald-600 font-mono">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-[#F6F5FF] p-3 text-center min-w-[120px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Outstanding</p>
              <p className="text-base font-black text-amber-600 font-mono">₹{outstandingBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Rep & Geofence info */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Representative</span>
            <p className="font-bold text-slate-800 mt-0.5">
              {shop.assignedEmployee ? `${shop.assignedEmployee.firstName} ${shop.assignedEmployee.lastName} (${shop.assignedEmployee.employeeCode})` : 'Unassigned'}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">GPS Geofence</span>
            <p className="font-bold text-slate-800 mt-0.5 font-mono">
              {shop.latitude.toFixed(4)}, {shop.longitude.toFixed(4)} (Radius: {shop.geofenceRadiusMeters}m)
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Registration Date</span>
            <p className="font-bold text-slate-800 mt-0.5">
              {new Date(shop.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { key: 'deliveries', label: 'Delivery History', icon: Truck, count: deliveries.length },
          { key: 'visits', label: 'Visit History', icon: Clock, count: visits.length },
          { key: 'payments', label: 'Payment Collections', icon: Receipt, count: payments.length },
          { key: 'photos', label: 'Photo Evidence', icon: Camera, count: allPhotos.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                isActive
                  ? 'bg-[#5428E8] text-white shadow-md shadow-[#5428E8]/20'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Deliveries */}
      {activeTab === 'deliveries' && (
        <div className="rounded-3xl border border-[#E6E8F2] bg-white p-5 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-[#F6F5FF] text-[10px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Delivery #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Delivered By</th>
                  <th className="py-2.5 px-2 text-center">Items</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Final Value</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No product deliveries recorded yet for this shop.</td>
                  </tr>
                ) : (
                  deliveries.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{d.deliveryNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(d.createdAt).toISOString().replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {d.employee.firstName} {d.employee.lastName}
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium">{d.totalLines} lines</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800">{d.totalQuantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{d.finalDeliveryValue.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            d.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : d.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Visits */}
      {activeTab === 'visits' && (
        <div className="rounded-3xl border border-[#E6E8F2] bg-white p-5 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-[#F6F5FF] text-[10px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Representative</th>
                  <th className="py-2.5 px-3">GPS Distance</th>
                  <th className="py-2.5 px-3">Geofence Status</th>
                  <th className="py-2.5 px-3">Checkout Time</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No shop visits logged yet.</td>
                  </tr>
                ) : (
                  visits.map((v: any) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {new Date(v.checkInTime).toISOString().replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {v.employee.firstName} {v.employee.lastName}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{v.distanceFromShopMeters}m</td>
                      <td className="py-2.5 px-3">
                        {v.isWithinGeofence ? (
                          <span className="flex items-center gap-1 font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Within Geofence</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-semibold text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>Outside Geofence</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {v.checkOutTime ? new Date(v.checkOutTime).toISOString().replace('T', ' ').slice(11, 16) : 'In Progress'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{v.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Payments */}
      {activeTab === 'payments' && (
        <div className="rounded-3xl border border-[#E6E8F2] bg-white p-5 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-[#F6F5FF] text-[10px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Collection Date</th>
                  <th className="py-2.5 px-3">Collected By</th>
                  <th className="py-2.5 px-3">Payment Mode</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3">Reference / Transaction ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No payment collections recorded yet.</td>
                  </tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 text-slate-500">{p.collectedDate}</td>
                      <td className="py-2.5 px-3 font-medium">
                        {p.employee.firstName} {p.employee.lastName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {p.paymentMode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{p.paymentReference || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Photo Proofs */}
      {activeTab === 'photos' && (
        <div className="rounded-3xl border border-[#E6E8F2] bg-white p-5 shadow-xs">
          {allPhotos.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No photographic proof uploaded for visits or deliveries to this shop.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {allPhotos.map((photo, idx) => (
                <div key={idx} className="group relative overflow-hidden rounded-2xl border border-slate-200">
                  <img
                    src={photo.photoUrl}
                    alt={photo.category}
                    className="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                    <span className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-bold uppercase ">
                      {photo.category}
                    </span>
                    <p className="mt-1 text-[10px] text-slate-200 truncate">{photo.source}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
