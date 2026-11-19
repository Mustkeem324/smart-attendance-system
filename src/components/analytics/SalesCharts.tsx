'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#5428E8', '#8055F7', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'];

function downloadChartDataCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map((d) => keys.map((k) => `"${d[k] ?? ''}"`).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// 1. Daily Delivery Trend (Area/Line)
export function DailyDeliveryTrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No delivery trends recorded for this period</div>;
  }

  return (
    <div className="relative">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => downloadChartDataCSV(data, 'delivery_trend')}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <Download className="h-3 w-3" /> Export CSV
        </button>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDeliveryVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5428E8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#5428E8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
            <Tooltip
              formatter={(val: any, name: any) => [
                name === 'value' ? `₹${Number(val).toLocaleString()}` : val,
                name === 'value' ? 'Delivery Turnover' : 'Units Delivered',
              ]}
              contentStyle={{
                backgroundColor: '#11152F',
                borderRadius: '12px',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#5428E8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDeliveryVal)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 2. Product Category Distribution Pie
export function ProductCategoryPieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No category breakdown recorded</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={88}
            paddingAngle={4}
            dataKey="totalValue"
            nameKey="categoryName"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Delivery Value']}
            contentStyle={{
              backgroundColor: '#11152F',
              borderRadius: '12px',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748B' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// 3. Top Delivered Products Bar Chart
export function TopProductsBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No product delivery records found</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#1E293B' }} axisLine={false} tickLine={false} width={100} />
          <Tooltip
            formatter={(val: any) => [`${val} units`, 'Quantity Delivered']}
            contentStyle={{
              backgroundColor: '#11152F',
              borderRadius: '12px',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="totalQty" fill="#8055F7" radius={[0, 8, 8, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
