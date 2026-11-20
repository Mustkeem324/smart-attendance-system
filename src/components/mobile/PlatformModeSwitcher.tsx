'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Smartphone, Monitor, Download, Check } from 'lucide-react';

export default function PlatformModeSwitcher() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const isMobileRoute = pathname?.startsWith('/field-sales/mobile');

  return (
    <div className="flex items-center gap-1.5" data-testid="platform-mode-switcher">
      {/* Platform Mode Quick-Switch Button */}
      {isMobileRoute ? (
        <Link
          href="/distribution"
          className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-[#161C3D]/80 hover:bg-[#1E2552] px-2.5 py-1 text-xs font-semibold text-purple-300 transition-all hover:text-white"
          title="Switch to Desktop Console"
        >
          <Monitor className="h-3.5 w-3.5 text-purple-400" />
          <span className="hidden xl:inline">Desktop Web</span>
        </Link>
      ) : (
        <Link
          href="/field-sales/mobile"
          className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-[#161C3D]/80 hover:bg-[#1E2552] px-2.5 py-1 text-xs font-semibold text-purple-300 transition-all hover:text-white"
          title="Switch to Mobile / Android View"
        >
          <Smartphone className="h-3.5 w-3.5 text-purple-400" />
          <span className="hidden xl:inline">Mobile App</span>
        </Link>
      )}

      {/* PWA Install Button when triggerable */}
      {isInstallable && !installed && (
        <button
          onClick={handleInstallPWA}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all animate-pulse"
          title="Install APEX Android / Desktop App"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Install</span>
        </button>
      )}

      {installed && (
        <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
          <Check className="h-3 w-3" />
          <span>Installed</span>
        </span>
      )}
    </div>
  );
}
