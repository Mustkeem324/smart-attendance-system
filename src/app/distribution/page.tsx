'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ShoppingCart,
  Boxes,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Truck,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  PackageCheck,
  Building,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';

export default function DistributionDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/v1/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const tables = data?.tables || {};

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Salman Enterprises Distribution Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time B2B hardware distribution, warehouse telemetry, retailer credit and ledger operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151A38] hover:bg-[#1E2552] border border-[#23294E] text-xs text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            <span>Sync DB</span>
          </button>
          <Link
            href="/distribution/orders"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Manage Orders</span>
          </Link>
        </div>
      </div>

      {/* 8 Database-Driven KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Retailers */}
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Retailers</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? '...' : kpis.activeRetailers?.value ?? 0}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +{kpis.activeRetailers?.changePercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.activeRetailers?.subtext || 'Verified dealer network'}
          </p>
        </div>

        {/* 2. Total Orders */}
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total B2B Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? '...' : kpis.totalOrders?.value ?? 0}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +{kpis.totalOrders?.changePercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.totalOrders?.subtext || 'Wholesale order volume'}
          </p>
        </div>

        {/* 3. Units Sold */}
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Hardware Units Sold</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? '...' : kpis.unitsSold?.value ?? 0}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +{kpis.unitsSold?.changePercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.unitsSold?.subtext || 'Smartphones & audio units'}
          </p>
        </div>

        {/* 4. Sales Revenue */}
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sales Turnover</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? '...' : formatCurrency(kpis.salesRevenue?.value || 0)}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +{kpis.salesRevenue?.changePercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.salesRevenue?.subtext || 'Total invoiced B2B sales'}
          </p>
        </div>

        {/* 5. Payments Collected */}
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Collections Realized</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? '...' : formatCurrency(kpis.paymentsCollected?.value || 0)}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +{kpis.paymentsCollected?.changePercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.paymentsCollected?.subtext || 'UPI & NEFT realizations'}
          </p>
        </div>

        {/* 6. Outstanding Receivables */}
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Outstanding Credit</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-amber-300 tracking-tight">
              {loading ? '...' : formatCurrency(kpis.outstandingReceivables?.value || 0)}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3" />
              {kpis.outstandingReceivables?.changePercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.outstandingReceivables?.subtext || 'Active dealer ledger balance'}
          </p>
        </div>

        {/* 7. Pending Orders */}
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Fulfillment</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? '...' : kpis.pendingFulfillment?.value ?? 0}
            </div>
            <span className="text-[11px] font-semibold text-purple-400">Queued</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.pendingFulfillment?.subtext || 'Awaiting IMEI scanning'}
          </p>
        </div>

        {/* 8. Available Inventory & Valuation */}
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? '...' : formatCurrency(kpis.inventoryValuation?.value || 0)}
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {kpis.inventoryValuation?.units || 0} Units
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.inventoryValuation?.subtext || 'At Central Bangalore Hub'}
          </p>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#23294E]">
            <div>
              <h2 className="text-sm font-semibold text-white">Turnover & Collections Trajectory</h2>
              <p className="text-[11px] text-slate-400">Last 6 months comparison of invoiced turnover vs realized collections</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#713BFF]" />
                Invoiced Revenue
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#20D69A]" />
                Collections
              </span>
            </div>
          </div>

          <div className="pt-6">
            <div className="h-56 flex items-end justify-between gap-3 px-2">
              {(charts.monthlyTrends || []).map((m: any, i: number) => {
                const maxVal = Math.max(
                  ...charts.monthlyTrends.map((t: any) => Math.max(t.revenue, t.collections)),
                  100000
                );
                const revHeight = Math.max(12, Math.round((m.revenue / maxVal) * 180));
                const colHeight = Math.max(10, Math.round((m.collections / maxVal) * 180));

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-48">
                      {/* Revenue Bar */}
                      <div
                        style={{ height: `${revHeight}px` }}
                        className="w-1/2 max-w-[28px] rounded-t-lg bg-gradient-to-t from-[#5428E8] to-[#804DFF] group-hover:brightness-110 transition-all relative"
                        title={`Revenue: ${formatCurrency(m.revenue)}`}
                      />
                      {/* Collection Bar */}
                      <div
                        style={{ height: `${colHeight}px` }}
                        className="w-1/2 max-w-[28px] rounded-t-lg bg-gradient-to-t from-[#16A36A] to-[#20D69A] group-hover:brightness-110 transition-all relative"
                        title={`Collections: ${formatCurrency(m.collections)}`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors">
                      {m.month.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Brand Performance Split */}
        <div className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#23294E]">
              <div>
                <h2 className="text-sm font-semibold text-white">Brand Sales Split</h2>
                <p className="text-[11px] text-slate-400">Turnover contribution by tier 1 brands</p>
              </div>
              <Award className="w-4 h-4 text-purple-400" />
            </div>

            <div className="pt-4 space-y-3">
              {(charts.brandPerformance || []).slice(0, 5).map((b: any, idx: number) => {
                const totalAmt = (charts.brandPerformance || []).reduce((sum: number, x: any) => sum + x.amount, 0) || 1;
                const pct = Math.round((b.amount / totalAmt) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{b.brand}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{formatCurrency(b.amount)} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#10132A] overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#23294E] mt-4">
            <Link
              href="/distribution/brands"
              className="flex items-center justify-between text-xs text-purple-400 hover:text-purple-300 font-medium"
            >
              <span>Explore All 10 Partner Brands</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Grids: Recent Orders & Low Stock Alert Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent B2B Orders</h2>
              <p className="text-[11px] text-slate-400">Incoming retailer and showroom hardware requests</p>
            </div>
            <Link
              href="/distribution/orders"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E]/60 bg-[#10132A]/50">
                <tr>
                  <th className="py-2.5 px-3">Order Number</th>
                  <th className="py-2.5 px-3">Retailer</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3">Total Value</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23294E]/40 text-slate-300">
                {(tables.recentOrders || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No orders currently recorded in the platform
                    </td>
                  </tr>
                ) : (
                  (tables.recentOrders || []).map((o: any) => (
                    <tr key={o._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-white">{o.orderNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{o.retailerId?.name || 'Retail Partner'}</div>
                        <div className="text-[10px] text-slate-400">{o.retailerId?.dealerCode}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{o.retailerId?.city || 'Bangalore'}</td>
                      <td className="py-3 px-3 font-medium text-slate-200">{formatCurrency(o.finalOrderValue)}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                            o.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : o.status === 'APPROVED' || o.status === 'PROCESSING'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Reorder Alerts */}
        <div className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <div>
                <h2 className="text-sm font-semibold text-white">Stock Reorder Alerts</h2>
                <p className="text-[11px] text-slate-400">Products near or below reorder threshold</p>
              </div>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>

            <div className="mt-3 divide-y divide-[#23294E]/50 max-h-72 overflow-y-auto">
              {(tables.lowStockProducts || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <PackageCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                  All warehouse inventory stock levels are healthy
                </div>
              ) : (
                (tables.lowStockProducts || []).map((p: any) => (
                  <div key={p._id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-slate-200 truncate max-w-[160px]">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-[10px]">
                        {p.stockQuantity} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#23294E] mt-3">
            <Link
              href="/distribution/inventory"
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1C234E] hover:bg-[#232B60] text-xs font-semibold text-purple-300 transition-colors"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Open Warehouse Stock Console</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Retailer Applications & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Retailer Inquiries */}
        <div className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
            <div>
              <h2 className="text-sm font-semibold text-white">New Dealer Partnership Inquiries</h2>
              <p className="text-[11px] text-slate-400">Review and activate retail accounts</p>
            </div>
            <Link
              href="/distribution/retailer-applications"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium"
            >
              View Pipeline →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#23294E]/40">
            {(tables.pendingInquiries || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No pending dealer inquiries</div>
            ) : (
              (tables.pendingInquiries || []).map((inq: any) => (
                <div key={inq._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">{inq.businessName}</p>
                    <p className="text-[11px] text-slate-400">
                      {inq.ownerName} • {inq.city}, {inq.state} • {inq.phone}
                    </p>
                  </div>
                  <Link
                    href={`/distribution/retailer-applications`}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors"
                  >
                    Review & Approve
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Operational Audit Feed */}
        <div className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
            <div>
              <h2 className="text-sm font-semibold text-white">System Activity Feed</h2>
              <p className="text-[11px] text-slate-400">Traceable audit logs of inventory, orders & finance</p>
            </div>
            <Link
              href="/distribution/audit-logs"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium"
            >
              All Logs →
            </Link>
          </div>

          <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto">
            {(tables.recentAuditLogs || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No activity recorded yet</div>
            ) : (
              (tables.recentAuditLogs || []).map((log: any) => (
                <div key={log._id} className="p-2.5 rounded-xl bg-[#10132A]/60 border border-white/5 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="font-mono text-[11px] font-semibold text-slate-300">{log.action}</span>
                    <span className="text-[11px] text-slate-400">by {log.userId}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
