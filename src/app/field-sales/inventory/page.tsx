'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Building2,
  Plus,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Layers,
  Smartphone,
  QrCode,
  Tag,
  CheckCircle2,
  Package,
} from 'lucide-react';

export default function WarehouseInventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/electronics/inventory');
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.warehouses || []);
        setInventoryItems(data.inventoryItems || []);
        setLowStockAlerts(data.lowStockAlerts || []);
        setRecentMovements(data.recentMovements || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredItems = inventoryItems.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.productId?.name?.toLowerCase().includes(s) ||
      item.productId?.sku?.toLowerCase().includes(s) ||
      item.productId?.brand?.toLowerCase().includes(s)
    );
  });

  const totalOnHand = inventoryItems.reduce((sum, it) => sum + (it.onHandStock || 0), 0);
  const totalAllocated = inventoryItems.reduce((sum, it) => sum + (it.allocatedStock || 0), 0);

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              WAREHOUSE LOGISTICS
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Live Warehouse Stock
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Warehouse Inventory & Stock Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Central distribution warehouse stock levels, allocated consignments, low-stock threshold alerts, and inward/outward ledger trails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/field-sales/imei"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
          >
            <QrCode className="h-4 w-4" />
            Manage IMEI Device Serials
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On-Hand Stock</span>
            <Boxes className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{totalOnHand}</p>
          <span className="text-[11px] text-slate-400">Total physical devices in warehouse</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Available Stock</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{totalOnHand - totalAllocated}</p>
          <span className="text-[11px] text-emerald-600">Ready for sales booking</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Allocated</span>
            <Layers className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{totalAllocated}</p>
          <span className="text-[11px] text-amber-500">Reserved for pending dispatch</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{lowStockAlerts.length}</p>
          <span className="text-[11px] text-rose-500">Items below minimum threshold</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, brand, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>
      </div>

      {/* Inventory Items Table */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-[#11152F] uppercase tracking-wider">
            Current Product Stock Levels
          </h3>
          <span className="text-xs text-slate-400">{filteredItems.length} Products Monitored</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading warehouse inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <Boxes className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No Warehouse Inventory Records</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              When products and IMEI devices are created or inwarded, warehouse inventory records are automatically generated and tracked.
            </p>
            <Link
              href="/field-sales/products"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              <Smartphone className="h-4 w-4" />
              Go to Product Catalog
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Product & SKU</th>
                  <th className="px-6 py-4">Brand</th>
                  <th className="px-6 py-4 text-center">On Hand</th>
                  <th className="px-6 py-4 text-center">Allocated</th>
                  <th className="px-6 py-4 text-center">Available</th>
                  <th className="px-6 py-4 text-center">Threshold</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isLow = (item.onHandStock || 0) <= (item.minimumThreshold || 0);
                  return (
                    <tr key={item._id} className="hover:bg-indigo-50/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#11152F]">{item.productId?.name || 'Product'}</div>
                        <div className="font-mono text-xs text-slate-400">{item.productId?.sku}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-[#5428E8] border border-indigo-100">
                          {item.productId?.brand || 'Brand'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-black text-slate-900 text-sm">
                        {item.onHandStock || 0}
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-amber-600 text-sm">
                        {item.allocatedStock || 0}
                      </td>

                      <td className="px-6 py-4 text-center font-black text-emerald-700 text-sm">
                        {(item.onHandStock || 0) - (item.allocatedStock || 0)}
                      </td>

                      <td className="px-6 py-4 text-center text-xs text-slate-400">
                        {item.minimumThreshold || 10}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-extrabold text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3 w-3" /> LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> SUFFICIENT
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Stock Movements */}
      {recentMovements.length > 0 && (
        <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-sm text-[#11152F] uppercase tracking-wider">
              Stock Movement Audit Ledger
            </h3>
            <span className="text-xs text-slate-400">Automatic Warehousing Records</span>
          </div>

          <div className="space-y-2">
            {recentMovements.slice(0, 10).map((mov) => {
              const isInward = mov.movementType === 'INWARD' || mov.movementType === 'RETURN_IN';
              return (
                <div
                  key={mov._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3">
                    {isInward ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                        <ArrowDownLeft className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    )}
                    <div>
                      <p className="font-bold text-slate-900">
                        {mov.productId?.name || 'Device Item'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Ref: {mov.referenceNumber || 'Warehouse Entry'} • {mov.movementType}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black font-mono text-sm ${
                        isInward ? 'text-emerald-700' : 'text-indigo-700'
                      }`}
                    >
                      {isInward ? `+${mov.quantity}` : `-${mov.quantity}`} units
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {new Date(mov.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
