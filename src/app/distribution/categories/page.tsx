'use client';

import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, Boxes, ArrowRight, Smartphone } from 'lucide-react';
import Link from 'next/link';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/categories');
        if (res.ok) {
          const json = await res.json();
          setCategories(json.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-400" />
            Hardware Categories & Distribution Lines
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active commercial product categories, warehouse stock allocation and dealer margin policies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Loading categories from database...
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.code}
              className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/40 transition-all shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    ACTIVE LINE
                  </span>
                </div>

                <h3 className="font-bold text-white text-base mt-3 group-hover:text-purple-300 transition-colors">
                  {c.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{c.description}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#23294E]/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Catalog SKUs:</span>
                  <span className="font-bold text-white text-sm">{c.productCount} Models</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Stock:</span>
                  <span className="font-bold text-emerald-400 text-sm">{c.totalStock} Units</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
