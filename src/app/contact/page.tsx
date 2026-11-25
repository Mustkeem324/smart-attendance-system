'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/public/PublicNavbar';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowRight,
} from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'B2B Partnership & Wholesale Inquiry',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email address, and message.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/public/contact-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit inquiry.');
      } else {
        setSubmittedId(data.inquiry?.inquiryNumber || data.inquiryNumber || 'CONFIRMED');
      }
    } catch {
      setError('Network error submitting inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#15172B] text-white">
      <PublicNavbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-2xl mb-10">
          <span className="inline-flex items-center gap-2 rounded-lg border border-[#252A54] bg-[#191D38] px-3 py-1 text-xs font-semibold text-[#8255FF] mb-3">
            <Building2 className="h-3.5 w-3.5" /> Enterprise Desk &amp; Partner Support
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Contact Salman Enterprises
          </h1>
          <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
            Connect with our regional distribution managers for wholesale trade accounts, enterprise workspace onboarding, or logistics support.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-[#252A54] bg-[#191D38] p-6 space-y-5">
              <h2 className="text-base font-bold text-white">Corporate Headquarters</h2>

              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                <MapPin className="h-4 w-4 text-[#8255FF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Distribution &amp; Operations Hub</p>
                  <p className="text-slate-400 mt-0.5">
                    Nexus Technology Park, 4th Floor, Electronic City Phase 1, Bangalore 560100
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                <Mail className="h-4 w-4 text-[#8255FF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Trade &amp; Operations Email</p>
                  <p className="text-slate-400 mt-0.5">contact@salmanenterprises.in</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                <Phone className="h-4 w-4 text-[#8255FF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Partner Desk Phone</p>
                  <p className="text-slate-400 mt-0.5">+91 (080) 4129-8800</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                <Clock className="h-4 w-4 text-[#8255FF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Operating Hours</p>
                  <p className="text-slate-400 mt-0.5">Mon – Sat: 09:00 AM – 07:00 PM IST</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#252A54] bg-[#191D38] p-6">
              <h3 className="text-sm font-bold text-white mb-2">Already an Authorized Partner?</h3>
              <p className="text-xs text-slate-400 mb-4">
                Sign in directly to inspect wholesale pricing, GST invoices, and dispatch tracking.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] px-4 py-2.5 text-xs font-bold text-white transition"
              >
                Access Partner Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-[#252A54] bg-[#191D38] p-6 sm:p-8">
            {submittedId ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#12B886]/15 border border-[#12B886]/30 text-[#12B886]">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-white">Inquiry Received</h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  Reference ID <span className="font-mono font-bold text-[#8255FF]">{submittedId}</span> has been logged with our operations team. A representative will respond within 1 business day.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedId(null);
                      setForm({
                        name: '',
                        email: '',
                        phone: '',
                        subject: 'B2B Partnership & Wholesale Inquiry',
                        message: '',
                      });
                    }}
                    className="rounded-xl border border-[#2A2E5A] bg-[#111432] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E2248]"
                  >
                    Send Another Inquiry
                  </button>
                  <Link
                    href="/catalog"
                    className="rounded-xl bg-[#6538ED] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#562BD4]"
                  >
                    Browse Catalog
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-1">Send Us a Message</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Every inquiry is routed directly to our enterprise distribution coordinator.
                </p>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#EF476F]/30 bg-[#EF476F]/10 p-3.5 text-xs text-rose-200">
                    <AlertCircle className="h-4 w-4 text-[#EF476F] shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#6538ED]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Business Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#6538ED]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone / Mobile</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#6538ED]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject *</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-[#6538ED]"
                    >
                      <option value="B2B Partnership & Wholesale Inquiry">B2B Partnership &amp; Wholesale Inquiry</option>
                      <option value="Enterprise Account & Workforce Setup">Enterprise Account &amp; Workforce Setup</option>
                      <option value="Logistics & Delivery Support">Logistics &amp; Delivery Support</option>
                      <option value="Account Access & Password Support">Account Access &amp; Password Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Share your business requirements, GST location, or support details..."
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#6538ED]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] py-3 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>{loading ? 'Submitting Inquiry...' : 'Submit Inquiry'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
