'use client';

import { useEffect, type ReactNode } from 'react'; // Added React and ReactNode
import './globals.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GameProvider } from './game/gameProvider';
import FullscreenButton from './components/FullScreenButton';

import { Orbitron } from 'next/font/google';
import localFont from 'next/font/local';

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

// Function to lock the screen orientation
const lockOrientation = () => {
  // Use 'as any' for screen.orientation if types are missing, 
  // or use standard ScreenOrientation types if available.
  const screenAny = screen as any;
  if (screenAny.orientation && screenAny.orientation.lock) {
    screenAny.orientation.lock('portrait').catch((error: Error) => {
      console.log('Error locking orientation: ', error);
    });
  }
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  useEffect(() => {
    lockOrientation();
  }, []);

  return (
    <html lang="en" className={`${orbitron.variable} ${digi.variable}`}>
      <body className="w-screen h-screen overflow-hidden relative">
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
        <DndProvider backend={HTML5Backend}>
          <GameProvider>
            {children}
          </GameProvider>
        </DndProvider>
      </body>
    </html>
  );
}
