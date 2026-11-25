'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useUi } from '@/components/providers/UiProvider';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  FileText,
  AlertCircle,
  ArrowRight,
  Eye,
  Store,
  Calendar,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  hsnCode?: string;
  subtotal: number;
  totalTax: number;
  totalAmount: number;
}

interface SalesOrder {
  _id: string;
  orderNumber: string;
  retailerId: {
    _id: string;
    shopName: string;
    dealerCode: string;
    ownerName?: string;
    phone?: string;
  };
  employeeId?: string;
  items: OrderItem[];
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  paymentTerms: string;
  orderDate: string;
  notes?: string;
}

export default function SalesOrdersPage() {
  const { toast, confirm } = useUi();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Order Form
  const [newOrder, setNewOrder] = useState({
    retailerId: '',
    paymentTerms: 'NET_15',
    notes: '',
    items: [
      {
        productId: '',
        quantity: 1,
        unitPrice: 0,
        taxRatePercent: 18,
        discountPercent: 0,
      },
    ],
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/electronics/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchAuxData = useCallback(async () => {
    try {
      const [retRes, prodRes] = await Promise.all([
        fetch('/api/electronics/retailers'),
        fetch('/api/electronics/products'),
      ]);
      if (retRes.ok) {
        const d = await retRes.json();
        setRetailers(d.retailers || []);
        if (d.retailers?.length > 0) {
          setNewOrder((prev) => (prev.retailerId ? prev : { ...prev, retailerId: d.retailers[0]._id }));
        }
      }
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || []);
        if (d.products?.length > 0) {
          setNewOrder((prev) => ({
            ...prev,
            items: [
              {
                productId: d.products[0]._id,
                quantity: 1,
                unitPrice: d.products[0].sellingPrice || 10000,
                taxRatePercent: 18,
                discountPercent: 0,
              },
            ],
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  const handleApproveOrder = async (orderId: string) => {
    const ok = await confirm({
      title: 'Approve Wholesale Sales Order',
      message:
        'Approving this sales order will generate the GST Tax Invoice and charge the dealer ledger.',
      confirmText: 'Approve & Generate Invoice',
    });
    if (!ok) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/electronics/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Order approved! Tax Invoice ${data.invoice?.invoiceNumber || ''} generated successfully.`,
        });
        setSelectedOrder(null);
        fetchOrders();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to approve order' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    setNewOrder((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: products[0]._id,
          quantity: 1,
          unitPrice: products[0].sellingPrice || 10000,
          taxRatePercent: 18,
          discountPercent: 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (newOrder.items.length <= 1) return;
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...newOrder.items];
    if (field === 'productId') {
      const prod = products.find((p) => p._id === value);
      updated[index] = {
        ...updated[index],
        productId: value,
        unitPrice: prod?.sellingPrice || 10000,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setNewOrder((prev) => ({ ...prev, items: updated }));
  };

  const calculateFormTotal = () => {
    let sub = 0;
    newOrder.items.forEach((item) => {
      sub += Number(item.unitPrice || 0) * Number(item.quantity || 1);
    });
    const gst = sub * 0.18;
    return { subtotal: sub, gst, total: sub + gst };
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.retailerId) {
      setFeedback({ type: 'error', message: 'Please select a retailer' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const payload = {
        retailerId: newOrder.retailerId,
        paymentTerms: newOrder.paymentTerms,
        notes: newOrder.notes,
        items: newOrder.items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          taxRatePercent: 18,
          discountPercent: Number(it.discountPercent || 0),
        })),
      };

      const res = await fetch('/api/electronics/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Sales Order ${data.order.orderNumber} booked successfully!`,
        });
        setIsCreateOpen(false);
        fetchOrders();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create sales order' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalBookedValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingApprovalCount = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;
  const approvedCount = orders.filter((o) => o.status === 'APPROVED' || o.status === 'DELIVERED').length;

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              ORDER MANAGEMENT
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              GST Tax Compliant
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Sales Orders & Bookings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Book multi-item smartphone and electronics orders, manage approvals, and automate tax invoice generation.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" />
          Book New Sales Order
        </button>
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
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{orders.length}</p>
          <span className="text-[11px] text-slate-400">Total bookings received</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Value</span>
            <span className="text-sm font-extrabold text-emerald-600">INR</span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            ₹{totalBookedValue.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-emerald-600">Gross order value booked</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Approval</span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{pendingApprovalCount}</p>
          <span className="text-[11px] text-amber-500">Awaiting manager sign-off</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Approved / Active</span>
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">{approvedCount}</p>
          <span className="text-[11px] text-indigo-500">Invoicing & fulfillment ready</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'DELIVERED', 'CANCELLED'].map((st) => (
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

      {/* Orders Table */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading wholesale sales orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No Sales Orders Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              No sales orders matching your criteria. Start booking orders for retailers and authorized mobile dealers.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" />
              Book First Sales Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order Number</th>
                  <th className="px-6 py-4">Dealer / Retailer</th>
                  <th className="px-6 py-4">Items Summary</th>
                  <th className="px-6 py-4">Total Amount (Inc. GST)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Order Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const statusColors: Record<string, string> = {
                    PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
                    APPROVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
                  };

                  return (
                    <tr key={order._id} className="hover:bg-indigo-50/40 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                        {order.orderNumber}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{order.retailerId?.shopName || 'Unknown Dealer'}</div>
                        <div className="text-xs text-slate-400">
                          {order.retailerId?.dealerCode} • {order.retailerId?.phone || 'No Phone'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-800">
                          {order.items?.length || 0} Products
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {order.items?.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        ₹{(order.totalAmount || 0).toLocaleString('en-IN')}
                        <div className="text-[11px] font-normal text-slate-400">
                          Tax: ₹{((order.cgstAmount || 0) + (order.sgstAmount || 0)).toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
                            statusColors[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(order.orderDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {order.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleApproveOrder(order._id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Sales Order Specification
                </span>
                <h3 className="text-xl font-extrabold text-[#11152F] mt-0.5">
                  {selectedOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 my-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs">
              <div>
                <span className="text-slate-400 block">Retailer:</span>
                <span className="font-bold text-slate-800 text-sm">{selectedOrder.retailerId?.shopName}</span>
                <span className="block text-slate-500">{selectedOrder.retailerId?.dealerCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <span className="font-bold text-slate-800 text-sm">{selectedOrder.status}</span>
                <span className="block text-slate-500">Terms: {selectedOrder.paymentTerms}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">SKU / HSN</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-semibold text-slate-800">{item.productName}</td>
                      <td className="p-2.5 font-mono text-slate-500">{item.sku}</td>
                      <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                      <td className="p-2.5 text-right">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        ₹{(item.totalAmount || item.quantity * item.unitPrice).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-xs text-right border-t pt-3">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>₹{(selectedOrder.subtotal || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>CGST (9%):</span>
                <span>₹{(selectedOrder.cgstAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>SGST (9%):</span>
                <span>₹{(selectedOrder.sgstAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-indigo-700 pt-2 border-t">
                <span>Grand Total:</span>
                <span>₹{(selectedOrder.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              {selectedOrder.status === 'PENDING_APPROVAL' && (
                <button
                  onClick={() => handleApproveOrder(selectedOrder._id)}
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                >
                  {submitting ? 'Approving...' : 'Approve & Issue Tax Invoice'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-[#5428E8]" />
                <h3 className="text-xl font-extrabold text-[#11152F]">Book New Sales Order</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-5 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Dealer / Retailer *
                  </label>
                  {retailers.length === 0 ? (
                    <p className="text-xs text-rose-600 font-semibold">
                      No retailers registered. Please register a retailer or import from CSV first.
                    </p>
                  ) : (
                    <select
                      value={newOrder.retailerId}
                      onChange={(e) => setNewOrder({ ...newOrder, retailerId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                      required
                    >
                      {retailers.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.shopName} ({r.dealerCode}) - {r.ownerName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={newOrder.paymentTerms}
                    onChange={(e) => setNewOrder({ ...newOrder, paymentTerms: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  >
                    <option value="IMMEDIATE">Immediate / Cash On Delivery</option>
                    <option value="NET_7">Net 7 Days</option>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="CREDIT">Dealer Line of Credit</option>
                  </select>
                </div>
              </div>

              {/* Multi-item Line Picker */}
              <div className="border border-indigo-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Order Items ({newOrder.items.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#5428E8] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Product Item
                  </button>
                </div>

                {newOrder.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-slate-200">
                    <div className="col-span-5">
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:border-[#5428E8]"
                        required
                      >
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.brand})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 text-center"
                        required
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Unit Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800"
                        required
                      />
                    </div>

                    <div className="col-span-2 text-right pt-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={newOrder.items.length <= 1}
                        className="text-xs text-rose-500 font-bold hover:underline disabled:opacity-30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {/* Real-time Order Summary */}
                {(() => {
                  const totals = calculateFormTotal();
                  return (
                    <div className="pt-2 text-right text-xs space-y-1">
                      <p className="text-slate-500">
                        Subtotal: <span className="font-bold text-slate-700">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                      </p>
                      <p className="text-slate-500">
                        Estimated 18% GST (9% CGST + 9% SGST): <span className="font-bold text-slate-700">₹{totals.gst.toLocaleString('en-IN')}</span>
                      </p>
                      <p className="text-sm font-black text-indigo-700 pt-1">
                        Total Order Booking Value: ₹{totals.total.toLocaleString('en-IN')}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Order Notes / Delivery Instructions
                </label>
                <textarea
                  rows={2}
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  placeholder="e.g. Deliver before 4 PM, call owner upon dispatch..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || products.length === 0 || retailers.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-6 py-2.5 text-sm font-bold text-white shadow hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Booking Order...' : 'Confirm & Book Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
