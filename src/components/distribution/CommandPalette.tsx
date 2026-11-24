'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Smartphone,
  Layers,
  Award,
  Boxes,
  ShoppingCart,
  Store,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Truck,
  Settings,
  X,
  ArrowRight,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  category: string;
  href: string;
  icon: any;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { id: '1', title: 'Enterprise Dashboard', category: 'Navigation', href: '/distribution', icon: LayoutDashboard },
  { id: '2', title: 'Products & Hardware Catalog', category: 'Catalog', href: '/distribution/products', icon: Smartphone },
  { id: '3', title: 'Categories Management', category: 'Catalog', href: '/distribution/categories', icon: Layers },
  { id: '4', title: 'Partner Brands & Tiering', category: 'Catalog', href: '/distribution/brands', icon: Award },
  { id: '5', title: 'Multi-Warehouse Inventory', category: 'Inventory', href: '/distribution/inventory', icon: Boxes },
  { id: '6', title: 'B2B Sales Orders', category: 'Sales', href: '/distribution/orders', icon: ShoppingCart },
  { id: '7', title: 'Formal Quotations', category: 'Sales', href: '/distribution/quotations', icon: FileSpreadsheet },
  { id: '8', title: 'Retailer CRM & Dealers', category: 'Dealers', href: '/distribution/retailers', icon: Store },
  { id: '9', title: 'GST Tax Invoices', category: 'Finance', href: '/distribution/invoices', icon: Receipt },
  { id: '10', title: 'Payment Collections', category: 'Finance', href: '/distribution/payments', icon: CreditCard },
  { id: '11', title: 'Logistics & Dispatch Deliveries', category: 'Logistics', href: '/distribution/deliveries', icon: Truck },
  { id: '12', title: 'System & Distribution Settings', category: 'Settings', href: '/distribution/settings', icon: Settings },
];

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent can toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = PALETTE_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: PaletteItem) => {
    router.push(item.href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl overflow-hidden ring-1 ring-purple-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#23294E] bg-[#111533]">
          <Search className="w-5 h-5 text-purple-400 mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or jump to module..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-400"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching modules or actions found for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSel = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSel ? 'bg-[#713BFF] text-white shadow-md' : 'text-slate-300 hover:bg-[#1E2552]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSel ? 'text-white' : 'text-purple-400'}`} />
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${isSel ? 'bg-purple-800/60 text-purple-200' : 'bg-[#10132A] text-slate-400 border border-white/5'}`}>
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 opacity-70 ${isSel ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[#0c0e22] border-t border-[#23294E] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#151A38] border border-white/10 text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#151A38] border border-white/10 text-[10px]">↵</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#151A38] border border-white/10 text-[10px]">ESC</kbd> Close</span>
          </div>
          <span className="text-purple-400 font-semibold">Salman Enterprises Command</span>
        </div>
      </div>
    </div>
  );
}
