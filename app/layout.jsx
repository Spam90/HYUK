import { Inter } from 'next/font/google';
import './globals.css';
import PWAProvider from '@/components/PWAProvider';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import AppThemeProvider from '@/components/theme/AppThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SAS - Catálogo Digital',
  description: 'Catálogo y menú digital con pedidos a WhatsApp',
  manifest: '/manifest.json',
  applicationName: 'HYUK - Catálogo Digital',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HYUK',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.svg',
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#10B981',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#10B981" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
                <AppThemeProvider>
          {children}
          <PWAProvider />
          <PWAInstallBanner />
        </AppThemeProvider>
      </body>
    </html>
  );
}