'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import SalmanLogo from '@/components/brand/SalmanLogo';

function VerifyAccountContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(Boolean(token));
  const [result, setResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const verify = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/verify-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Verification failed.');
        } else {
          setResult({ verified: Boolean(data.verified), message: data.message });
        }
      } catch {
        setError('Unable to verify account right now.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  const handleRequestReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid account email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit verification request.');
      } else {
        setResult({ verified: Boolean(data.verified), message: data.message });
      }
    } catch {
      setError('Network error submitting verification request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#15172B] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full bg-[#6538ED]/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#252A54] bg-[#191D38] p-7 sm:p-9 shadow-2xl">
        <div className="mb-7 flex items-center justify-between">
          <SalmanLogo href="/" size="md" />
          <span className="inline-flex items-center gap-1 rounded-lg border border-[#2A2E5A] bg-[#111432] px-2.5 py-1 text-[10px] font-semibold text-[#12B886]">
            <ShieldCheck className="h-3.5 w-3.5" /> Verification
          </span>
        </div>

        {loading && token ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#6538ED] border-t-transparent" />
            <p className="text-sm text-slate-300">Verifying your workspace credentials...</p>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#12B886]/15 border border-[#12B886]/30 text-[#12B886]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-white">
              {result.verified ? 'Account Verified' : 'Verification Request Logged'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{result.message}</p>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] py-3 text-xs font-bold text-white transition"
            >
              Proceed to Sign In <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Verify Your Account</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Need your partner or employee workspace verified? Submit your registered email to notify workspace administrators.
            </p>

            {error && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#EF476F]/30 bg-[#EF476F]/10 p-3.5 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 text-[#EF476F] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRequestReview} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    disabled={loading}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@company.com"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#6538ED] focus:ring-2 focus:ring-[#6538ED]/25"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#6538ED] hover:bg-[#562BD4] py-3 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting...' : 'Request Verification Review'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#252A54] text-center text-xs text-slate-400">
              Already verified?{' '}
              <Link href="/login" className="font-semibold text-[#8255FF] hover:underline">
                Sign In to Workspace
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#15172B] flex items-center justify-center text-slate-300 text-sm">
          Loading account verification...
        </div>
      }
    >
      <VerifyAccountContent />
    </Suspense>
  );
}
