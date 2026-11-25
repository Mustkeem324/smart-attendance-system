'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Search,
  Filter,
  Plus,
  Boxes,
  CheckCircle2,
  Truck,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  UploadCloud,
  Layers,
  Copy,
  Check,
  Building2,
  Calendar,
} from 'lucide-react';

interface DeviceItem {
  _id: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  stockStatus: string;
  condition: string;
  batchNumber?: string;
  warrantyExpiry?: string;
  createdAt: string;
  productId?: {
    _id: string;
    name: string;
    brand: string;
    modelNumber: string;
    sku: string;
  };
  retailerId?: {
    _id: string;
    shopName: string;
    dealerCode: string;
  };
}

export default function ImeiInventoryPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    productId: '',
    warehouseId: 'default-main-wh',
    imei1: '',
    imei2: '',
    serialNumber: '',
    batchNumber: 'LOT-2026-A',
    condition: 'BRAND_NEW',
    warrantyMonths: 12,
  });

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/electronics/imei?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error('Failed to fetch devices', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/electronics/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.products && data.products.length > 0) {
          setForm((prev) => (prev.productId ? prev : { ...prev, productId: data.products[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInwardDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId) {
      setFeedback({ type: 'error', message: 'Please select a product model' });
      return;
    }
    if (!form.imei1 || form.imei1.length < 14) {
      setFeedback({ type: 'error', message: 'Valid 14-16 digit IMEI 1 is required' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const payload = {
        productId: form.productId,
        warehouseId: form.warehouseId,
        devices: [
          {
            imei1: form.imei1.trim(),
            imei2: form.imei2.trim() || undefined,
            serialNumber: form.serialNumber.trim() || undefined,
            batchNumber: form.batchNumber.trim(),
            condition: form.condition,
            warrantyMonths: Number(form.warrantyMonths),
          },
        ],
      };

      const res = await fetch('/api/electronics/imei', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: `Device registered successfully with IMEI ${form.imei1}` });
        setForm({
          ...form,
          imei1: '',
          imei2: '',
          serialNumber: '',
        });
        setIsModalOpen(false);
        fetchDevices();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to register device' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const countInStock = devices.filter((d) => d.stockStatus === 'IN_STOCK').length;
  const countDispatched = devices.filter((d) => d.stockStatus === 'DISPATCHED' || d.stockStatus === 'ALLOCATED').length;
  const countDelivered = devices.filter((d) => d.stockStatus === 'DELIVERED').length;
  const countDefective = devices.filter((d) => d.stockStatus === 'DEFECTIVE' || d.stockStatus === 'RETURNED').length;

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              HARDWARE ASSET TRACKING
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Real-time Database
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            IMEI & Serial Number Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track individual smartphones, cellular devices, and electronics with dual IMEI validation and live warranty lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/field-sales/import"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#5428E8] shadow-sm hover:bg-indigo-50 transition"
          >
            <UploadCloud className="h-4 w-4" />
            Bulk Import CSV
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            Inward New Device
          </button>
        </div>
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
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded</span>
            <Boxes className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{devices.length}</p>
          <span className="text-[11px] text-slate-400">All registered device serials</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">In Stock Ready</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{countInStock}</p>
          <span className="text-[11px] text-emerald-600">Available in warehouse</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Delivered</span>
            <Truck className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">{countDelivered}</p>
          <span className="text-[11px] text-indigo-500">Active with retailers</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Dispatched / transit</span>
            <RotateCcw className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{countDispatched + countDefective}</p>
          <span className="text-[11px] text-amber-500">In transit or RMA claims</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by IMEI 1, IMEI 2, Serial, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {['ALL', 'IN_STOCK', 'ALLOCATED', 'DELIVERED', 'DEFECTIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#5428E8] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Status' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table / Empty State */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading device IMEI records...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <QrCode className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No IMEI Device Records Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              There are no physical IMEI serial records matching this query in the database. Inward your first batch of devices or import from a spreadsheet.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
              >
                <Plus className="h-4 w-4" />
                Inward First Device
              </button>
              <Link
                href="/field-sales/import"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <UploadCloud className="h-4 w-4" />
                Import Excel/CSV
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Device Model & SKU</th>
                  <th className="px-6 py-4">Primary IMEI 1</th>
                  <th className="px-6 py-4">Secondary IMEI 2 / Serial</th>
                  <th className="px-6 py-4">Stock Status</th>
                  <th className="px-6 py-4">Assigned Retailer</th>
                  <th className="px-6 py-4">Inward Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map((device) => {
                  const statusColors: Record<string, string> = {
                    IN_STOCK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    ALLOCATED: 'bg-sky-50 text-sky-700 border-sky-200',
                    DISPATCHED: 'bg-amber-50 text-amber-700 border-amber-200',
                    DELIVERED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    DEFECTIVE: 'bg-rose-50 text-rose-700 border-rose-200',
                    RETURNED: 'bg-orange-50 text-orange-700 border-orange-200',
                  };

                  return (
                    <tr key={device._id} className="hover:bg-indigo-50/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#11152F] flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span>{device.productId?.name || 'Device Model'}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          SKU: <span className="font-mono text-slate-600">{device.productId?.sku || 'N/A'}</span>
                          {device.productId?.brand && ` • ${device.productId.brand}`}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {device.imei1}
                          </span>
                          <button
                            onClick={() => handleCopy(device.imei1, device._id + '-1')}
                            title="Copy IMEI 1"
                            className="text-slate-400 hover:text-indigo-600 p-1"
                          >
                            {copiedId === device._id + '-1' ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {device.imei2 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{device.imei2}</span>
                          </div>
                        ) : device.serialNumber ? (
                          <span>SN: {device.serialNumber}</span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
                            statusColors[device.stockStatus] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {device.stockStatus}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {device.retailerId ? (
                          <div>
                            <div className="font-bold text-slate-900">{device.retailerId.shopName}</div>
                            <div className="text-slate-400">{device.retailerId.dealerCode}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Warehouse Stock</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(device.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inward Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="h-6 w-6 text-[#5428E8]" />
                <h3 className="text-xl font-extrabold text-[#11152F]">Inward New Device</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInwardDevice} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Model *
                </label>
                {products.length === 0 ? (
                  <p className="text-xs text-rose-600 font-semibold">
                    No products found in catalog. Please create a product first or import from CSV.
                  </p>
                ) : (
                  <select
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                    required
                  >
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.brand}) - SKU: {p.sku}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary IMEI 1 (15 Digits) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  placeholder="e.g. 860123456789012"
                  value={form.imei1}
                  onChange={(e) => setForm({ ...form, imei1: e.target.value })}
                  className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Secondary IMEI 2
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="e.g. 860123456789013"
                    value={form.imei2}
                    onChange={(e) => setForm({ ...form, imei2: e.target.value })}
                    className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-SAM-00192"
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Batch / Lot No.
                  </label>
                  <input
                    type="text"
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Warranty (Months)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={36}
                    value={form.warrantyMonths}
                    onChange={(e) => setForm({ ...form, warrantyMonths: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2 text-sm font-bold text-white shadow hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register IMEI Inward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
