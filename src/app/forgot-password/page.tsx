'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';
import SalmanLogo from '@/components/brand/SalmanLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to process recovery request.');
      } else {
        setMessage(
          data.message ||
            'If an active workspace account matches that email, recovery instructions have been dispatched and administrators notified.'
        );
        setSubmitted(true);
      }
    } catch {
      setError('Network error while submitting recovery request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#15172B] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full bg-[#6538ED]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-[#8255FF]/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#252A54] bg-[#191D38] p-7 sm:p-9 shadow-2xl">
        <div className="mb-7 flex items-center justify-between">
          <SalmanLogo href="/" size="md" />
          <span className="inline-flex items-center gap-1 rounded-lg border border-[#2A2E5A] bg-[#111432] px-2.5 py-1 text-[10px] font-semibold text-[#8255FF]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Account Recovery
          </span>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#12B886]/15 border border-[#12B886]/30 text-[#12B886]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Recovery Request Submitted</h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">{message}</p>
            </div>
            <div className="rounded-xl border border-[#252A54] bg-[#111432] p-3.5 text-xs text-slate-400">
              Already received a recovery link from your workspace administrator?{' '}
              <Link href="/reset-password" className="font-semibold text-[#8255FF] hover:underline">
                Enter reset token
              </Link>
              .
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                href="/login"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] py-3 text-xs font-bold text-white transition"
              >
                <ArrowLeft className="h-4 w-4" /> Return to Sign In
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-[#2A2E5A] bg-[#111432] hover:bg-[#1E2248] px-4 py-3 text-xs font-semibold text-slate-200 transition"
              >
                Contact Support
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#111432] border border-[#252A54] text-[#8255FF] text-xs font-semibold mb-3">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Reset Workspace Password</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Forgot Password?</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Enter the email address associated with your workspace account and we will prepare a secure password reset request.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#EF476F]/30 bg-[#EF476F]/10 p-3.5 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 text-[#EF476F] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Corporate or Partner Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    disabled={loading}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#6538ED] focus:ring-2 focus:ring-[#6538ED]/25 transition disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#6538ED] hover:bg-[#562BD4] py-3 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting Request...' : 'Send Recovery Request'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#252A54] flex items-center justify-between text-xs">
              <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white transition">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
              <Link href="/reset-password" className="font-semibold text-[#8255FF] hover:underline">
                Have a reset link?
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
