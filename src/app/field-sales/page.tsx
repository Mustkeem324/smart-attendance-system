'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Store,
  QrCode,
  ShoppingBag,
  Truck,
  ShieldCheck,
  CreditCard,
  Receipt,
  Boxes,
  Users,
  Calendar,
  Download,
  PlusCircle,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sparkles,
  TrendingUp,
  Package,
  MapPin,
  Camera,
  ExternalLink,
  Check,
  X,
  FileCheck,
  RefreshCw,
  Building2,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AndroidBottomNav from '@/components/mobile/AndroidBottomNav';

export default function AdvancedFieldSalesAdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inspectPhotoModal, setInspectPhotoModal] = useState<any>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/field-sales/analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load field sales analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Approval handlers
  const handleApprovePriceOverride = async (overrideId: string) => {
    setActionLoading(overrideId);
    try {
      const res = await fetch(`/api/v1/admin/field-sales/price-overrides/${overrideId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPriceOverride = async (overrideId: string) => {
    const reason = prompt('Specify rejection reason:');
    if (!reason) return;
    setActionLoading(overrideId);
    try {
      const res = await fetch(`/api/v1/admin/field-sales/price-overrides/${overrideId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: reason }),
      });
      if (res.ok) {
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveShopApplication = async (appId: string) => {
    setActionLoading(appId);
    try {
      const res = await fetch(`/api/v1/admin/field-sales/shop-applications/${appId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectShopApplication = async (appId: string) => {
    const reason = prompt('Specify rejection reason:');
    if (!reason) return;
    setActionLoading(appId);
    try {
      const res = await fetch(`/api/v1/admin/field-sales/shop-applications/${appId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: reason }),
      });
      if (res.ok) {
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const kpis = data?.kpis || {};
  const analytics = data?.analytics || {};
  const mapMarkers = data?.mapMarkers || [];
  const pendingOverrides = data?.recentPendingOverrides || [];
  const pendingApplications = data?.recentPendingApplications || [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Status */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Advanced Field Sales &amp; Shop Visit Management
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time GPS geofenced shop visits, dual photographic verification, standard vs. manual pricing audit, and
            approval pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/field-sales/mobile"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#5428E8]/20 hover:opacity-95 transition"
          >
            <Smartphone className="h-4 w-4" />
            <span>Launch Mobile Field App</span>
          </Link>

          <Link
            href="/distribution"
            className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition"
          >
            <Building2 className="h-4 w-4 text-purple-500" />
            <span>Distribution Console</span>
          </Link>
        </div>
      </div>

      {/* 2. Primary 9 KPI Cards Grid (Section 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E122A] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Field Reps</span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {kpis.totalFieldEmployees ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active field specialists</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E122A] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Today Visits</span>
            <Store className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {kpis.todayVisitsCount ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{kpis.completedVisitsCount ?? 0} completed</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E122A] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>New Shops</span>
            <PlusCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {kpis.newShopsRegisteredCount ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Onboarded via field</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E122A] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Units Sold</span>
            <Package className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {kpis.totalUnitsSold ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Physical devices booked</p>
        </div>

        <div className="rounded-2xl border border-purple-200 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-xs font-bold">
            <span>Total Field Sales</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-900 dark:text-purple-100 truncate">
            ₹{(kpis.totalFieldSalesRevenue ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-purple-600 dark:text-purple-300/70 mt-0.5">Standard: ₹{(kpis.totalStandardValue ?? 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* 3. Approval Center & Price Overrides Pipeline */}
      {(pendingOverrides.length > 0 || pendingApplications.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Price Overrides Awaiting Approval */}
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/15 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Manual Price Overrides ({pendingOverrides.length})
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase">
                Pending Manager Approval
              </span>
            </div>

            <div className="space-y-2">
              {pendingOverrides.map((ovr: any) => (
                <div
                  key={ovr._id || ovr.overrideId}
                  className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#0E122A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {ovr.overrideId}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{ovr.productNameSnapshot}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {ovr.shopNameSnapshot} &bull; Standard: ₹{ovr.standardPrice?.toLocaleString('en-IN')} &rarr;{' '}
                      <strong className="text-rose-600 dark:text-rose-400">
                        Requested: ₹{ovr.requestedPrice?.toLocaleString('en-IN')}
                      </strong>
                    </p>
                    <p className="text-[10px] text-slate-400 italic mt-0.5">&ldquo;{ovr.reason}&rdquo;</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRejectPriceOverride(ovr.overrideId)}
                      disabled={Boolean(actionLoading)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprovePriceOverride(ovr.overrideId)}
                      disabled={Boolean(actionLoading)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold shadow-xs"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Shop Applications Awaiting Verification */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/15 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Shop Onboarding Applications ({pendingApplications.length})
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 uppercase">
                KYC Verification
              </span>
            </div>

            <div className="space-y-2">
              {pendingApplications.map((app: any) => (
                <div
                  key={app._id || app.applicationId}
                  className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-white dark:bg-[#0E122A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {app.applicationId}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{app.shopDetails?.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {app.shopDetails?.ownerName} &bull; {app.shopDetails?.phone} &bull; {app.shopDetails?.city}
                    </p>
                    {app.duplicateCheckResults && app.duplicateCheckResults.length > 0 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                        ⚠ Duplicate check: {app.duplicateCheckResults.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRejectShopApplication(app.applicationId)}
                      disabled={Boolean(actionLoading)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveShopApplication(app.applicationId)}
                      disabled={Boolean(actionLoading)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold shadow-xs"
                    >
                      Verify &amp; Onboard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Interactive Map & Live Geofence Visits List */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E122A] p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Field Visit GPS Telemetry &amp; Coordinates Registry
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              High-accuracy device GPS markers, Google Maps links, and physical photographic evidence
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
            {mapMarkers.length} Locations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mapMarkers.map((marker: any, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] hover:border-purple-500/40 transition space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    {marker.visitId}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{marker.shopName}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{marker.city}</p>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    marker.locationVerificationStatus === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {marker.locationVerificationStatus}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-200 dark:border-white/5">
                <span className="text-[10px] text-slate-400">
                  {marker.latitude?.toFixed(4)}, {marker.longitude?.toFixed(4)}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{marker.salesValue?.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                {marker.googleMapsUrl && (
                  <a
                    href={marker.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Google Maps</span>
                  </a>
                )}

                {marker.hasPhotos && marker.photoUrl && (
                  <button
                    onClick={() => setInspectPhotoModal(marker)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Camera className="h-3 w-3" />
                    <span>View Photos</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Analytics Tables (Brand-wise & Top Reps) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Brand-Wise Breakdown */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E122A] p-5 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            Brand-Wise Sales Turnover
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {(analytics.brandSales || []).map((b: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{b.brand}</p>
                  <p className="text-[10px] text-slate-400">{b.units} units booked</p>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ₹{b.amount?.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Representative Performance */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E122A] p-5 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            Field Specialist Output
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {(analytics.employeeSales || []).map((emp: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{emp.name || 'Sales Representative'}</p>
                  <p className="text-[10px] text-slate-400">{emp.visits} visits completed &bull; {emp.units} units</p>
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{emp.amount?.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {inspectPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0E122A] border border-white/15 p-6 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">{inspectPhotoModal.shopName} — Photographic Record</h3>
              <button onClick={() => setInspectPhotoModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-video bg-black/50 border border-white/10">
              <img src={inspectPhotoModal.photoUrl} alt="Storefront" className="w-full h-full object-cover" />
            </div>

            <p className="text-[11px] text-slate-400">
              Captured during visit {inspectPhotoModal.visitId} at coordinates {inspectPhotoModal.latitude?.toFixed(5)},{' '}
              {inspectPhotoModal.longitude?.toFixed(5)}.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectPhotoModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Android Bottom Nav */}
      <AndroidBottomNav />
    </div>
  );
}
