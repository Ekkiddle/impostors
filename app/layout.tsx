import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './components/Providers';
import FullscreenButton from './components/FullScreenButton';
import PWAClientLogic from './components/PWAClientLogic';
import type { Metadata, Viewport } from 'next';
import { Orbitron } from 'next/font/google';
import localFont from 'next/font/local';

export const metadata: Metadata = {
  title: 'Impostors',
  description: 'A multiplayer game of deception and teamwork in space.',
  manifest: '/manifest.json', // Crucial for PWA "Add to home screen"
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Impostors',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

const digi = localFont({
  src: './fonts/time.ttf',
  variable: '--font-digi',
  display: 'swap',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-orbitron',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${digi.variable}`}>
      <body className="w-screen h-screen overflow-hidden relative">
        <PWAClientLogic /> {/* Add the client logic here */}
        <FullscreenButton
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 50,
            opacity: 0.8,
            fontSize: '2rem',
            padding: '5px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'opacity 0.3s ease',
          }}
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
