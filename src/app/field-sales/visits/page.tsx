'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Camera,
  Store,
  Clock,
  Filter,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface VisitItem {
  _id: string;
  retailerId: {
    _id: string;
    shopName: string;
    dealerCode: string;
    ownerName?: string;
    phone?: string;
    city?: string;
    area?: string;
  };
  employeeId: string;
  visitDate: string;
  checkInTime: string;
  checkOutTime?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  distanceFromShopMeters: number;
  isWithinGeofence: boolean;
  notes?: string;
  purpose?: string;
  photos?: {
    photoUrl: string;
    category: string;
    caption?: string;
  }[];
}

export default function ShopVisitMonitorPage() {
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);

      const res = await fetch(`/api/electronics/visits?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const filteredVisits = visits.filter((v) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      v.retailerId?.shopName?.toLowerCase().includes(term) ||
      v.retailerId?.dealerCode?.toLowerCase().includes(term) ||
      v.retailerId?.city?.toLowerCase().includes(term) ||
      v.retailerId?.ownerName?.toLowerCase().includes(term)
    );
  });

  const verifiedCount = visits.filter((v) => v.isWithinGeofence).length;

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 uppercase tracking-wider inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE FIELD VERIFICATION
            </span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              GPS Geofence Checked
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Shop Visit & Audit Monitor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time shop visit telemetry, Haversine GPS geofence radius audits, and photographic store proof.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/field-sales/mobile"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
          >
            <Radio className="h-4 w-4" />
            Simulate Field Check-in
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Visits</span>
            <Radio className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{visits.length}</p>
          <span className="text-[11px] text-slate-400">Total retailer audit check-ins</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Geofence Verified</span>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{verifiedCount}</p>
          <span className="text-[11px] text-emerald-600">Within authorized 100m perimeter</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Out of Bounds</span>
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{visits.length - verifiedCount}</p>
          <span className="text-[11px] text-amber-500">Exceeded shop geofence radius</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Photo Proofs</span>
            <Camera className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">
            {visits.reduce((acc, v) => acc + (v.photos?.length || 0), 0)}
          </p>
          <span className="text-[11px] text-indigo-500">Store shelf & branding photos</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop name, dealer code, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-[#5428E8] focus:outline-none"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Visits Table */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading visits from MongoDB...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <Radio className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No Shop Visits Recorded</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Visits made by sales representatives with GPS coordinates and photos will automatically stream to this dashboard.
            </p>
            <Link
              href="/field-sales/mobile"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              <Radio className="h-4 w-4" />
              Open Mobile Field Visit App
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Dealer / Shop</th>
                  <th className="px-6 py-4">Check-In Time</th>
                  <th className="px-6 py-4">GPS Geofence Status</th>
                  <th className="px-6 py-4">Distance from Shop</th>
                  <th className="px-6 py-4">Purpose & Notes</th>
                  <th className="px-6 py-4 text-right">Photo Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.map((v) => (
                  <tr key={v._id} className="hover:bg-indigo-50/40 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{v.retailerId?.shopName || 'Retailer'}</div>
                      <div className="text-xs text-slate-400">
                        {v.retailerId?.dealerCode} • {v.retailerId?.city || 'City'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-700 whitespace-nowrap">
                      <div className="font-semibold">
                        {new Date(v.checkInTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="text-slate-400">
                        {new Date(v.checkInTime).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {v.isWithinGeofence ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> VERIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-extrabold text-rose-700 border border-rose-200">
                          <AlertCircle className="h-3 w-3" /> MISMATCH
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {Math.round(v.distanceFromShopMeters || 0)} meters
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {v.notes || v.purpose || 'Store audit & order collection'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {v.photos && v.photos.length > 0 ? (
                        <button
                          onClick={() => setSelectedPhoto(v.photos![0].photoUrl)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {v.photos.length} Photo{v.photos.length > 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-xs">No photos</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-indigo-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h4 className="font-bold text-slate-800 text-sm">Store Visit Photographic Proof</h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedPhoto}
              alt="Shop Visit Proof"
              className="w-full h-80 object-cover rounded-2xl border border-slate-200"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
