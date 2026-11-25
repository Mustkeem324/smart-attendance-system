import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import SalmanLogo from '@/components/brand/SalmanLogo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#15172B] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-[#252A54] bg-[#191D38] p-8 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <SalmanLogo href="/" size="md" />
        </div>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6538ED]/15 border border-[#6538ED]/30 text-[#8255FF]">
          <FileQuestion className="h-7 w-7" />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-[#8255FF]">404 — Page Not Found</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          The page you requested may have moved or is no longer available in this workspace.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] px-5 py-2.5 text-xs font-bold text-white transition"
          >
            <Home className="h-4 w-4" /> Return Home
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2E5A] bg-[#111432] hover:bg-[#1E2248] px-5 py-2.5 text-xs font-semibold text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Portal Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
