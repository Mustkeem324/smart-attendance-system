'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import SalmanLogo from '@/components/brand/SalmanLogo';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#15172B] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-[#252A54] bg-[#191D38] p-8 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <SalmanLogo href="/" size="md" />
        </div>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          An unexpected view interruption occurred. Please retry the operation or return to your dashboard.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2E5A] bg-[#111432] hover:bg-[#1E2248] px-5 py-2.5 text-xs font-semibold text-slate-200 transition"
          >
            <Home className="h-4 w-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
