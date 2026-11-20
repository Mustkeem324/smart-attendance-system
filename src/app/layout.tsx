import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import PWARegister from '@/components/mobile/PWARegister';

export const metadata: Metadata = {
  title: 'Apex Mobile & Electronics Distribution Ltd. | B2B Smartphone & Hardware Supply',
  description:
    'Premier B2B technology distributor connecting leading smartphone brands, wireless audio, GaN chargers, and mobile accessories with authorized retail dealer networks.',
  keywords: [
    'mobile distribution',
    'smartphone wholesale',
    'electronics distributor',
    'B2B mobile phones',
    'retailer dealer network',
    'genuine IMEI tracking',
    'GST tax invoices',
    'android enterprise',
    'field sales app',
  ],
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'APEX Electronics',
  },
  openGraph: {
    title: 'Apex Mobile & Electronics Distribution Ltd.',
    description:
      'Powering the Future of Mobile & Electronics Distribution. Connecting leading technology brands with retailers through reliable distribution and genuine products.',
    type: 'website',
    locale: 'en_IN',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0E122A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('theme');var dark=stored?stored==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-full bg-[var(--background)] font-sans text-[var(--foreground)] antialiased">
        <AuthProvider>
          <PWARegister />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
