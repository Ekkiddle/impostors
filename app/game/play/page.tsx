'use client';

import QRScanner from '@/app/components/QRScanner';
import React, { useCallback, useRef, useState } from 'react';
import { useGame } from '../gameProvider';

export default function PlayPage() {
  const [currentComponent, setCurrentComponent] = useState<React.ComponentType | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const isResolvingScan = useRef(false);
  const { getScanComponent } = useGame();

  const handleScan = useCallback(async (result: string) => {
    if (isResolvingScan.current) return;
    isResolvingScan.current = true;
    setScanError(null);

    try {
      const component = await getScanComponent(result);
      if (component) {
        setCurrentComponent(() => component);
      } else {
        setScanError('No available task found for this QR code.');
      }
    } catch (error) {
      console.error('Error getting scan component:', error);
      setScanError('Could not open this task. Please try scanning again.');
    } finally {
      isResolvingScan.current = false;
    }
  }, [getScanComponent]);

  const handleError = useCallback((error: string | Error) => {
    console.error('QR scanner error:', error);
  }, []);

  const closeTask = () => {
    setCurrentComponent(null);
    setScanError(null);
  };

  return (
    <main
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden p-2 sm:p-4"
      style={{
        backgroundColor: '#71838e',
        backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.08), transparent 45%, rgba(24,42,52,0.12))',
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-[28%] h-[3px] bg-[#344b58]/70 shadow-[0_1px_0_rgba(205,217,220,0.45)]" />
        <div className="absolute inset-x-0 top-[69%] h-[3px] bg-[#344b58]/70 shadow-[0_1px_0_rgba(205,217,220,0.45)]" />
        <div className="absolute left-[30%] top-0 h-[28%] w-[3px] bg-[#344b58]/70 shadow-[1px_0_0_rgba(205,217,220,0.45)]" />
        <div className="absolute left-[70%] top-[28%] h-[41%] w-[3px] bg-[#344b58]/70 shadow-[1px_0_0_rgba(205,217,220,0.45)]" />
        <div className="absolute left-[43%] top-[69%] h-[31%] w-[3px] bg-[#344b58]/70 shadow-[1px_0_0_rgba(205,217,220,0.45)]" />

        {[
          ['3%', '24%'], ['27%', '24%'], ['34%', '24%'], ['65%', '24%'], ['97%', '24%'],
          ['3%', '74%'], ['39%', '74%'], ['48%', '74%'], ['97%', '74%'],
        ].map(([left, top]) => (
          <span
            key={`${left}-${top}`}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#34444d] bg-[#344b58]/50"
            style={{
              left,
              top
            }}
          />
        ))}
      </div>

      <section
        aria-label={currentComponent ? 'Selected game task' : 'QR code scanner'}
        className="relative z-10 aspect-square overflow-hidden rounded-[1.6rem] border-[5px] border-[#42494e] p-2 shadow-[0_24px_55px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)]"
        style={{
          width: 'min(92vw, 88dvh)',
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'calc(100dvh - 16px)',
          background: 'linear-gradient(145deg, #d2d5d5 0%, #777f84 18%, #3e464b 48%, #9ba0a1 100%)',
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[1.1rem] border border-black/50 bg-[#171d21] shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)]">
          {currentComponent ? (
            <>
              <button
                type="button"
                onClick={closeTask}
                aria-label="Close task and return to QR scanner"
                className="absolute left-2 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-[#343c42]/95 text-3xl leading-none text-white shadow-lg transition hover:bg-[#505a62] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                ×
              </button>
              <div className="absolute inset-0 overflow-hidden">
                {React.createElement(currentComponent)}
              </div>
            </>
          ) : (
            <div className="absolute inset-3 overflow-hidden rounded-lg border border-[#879197] bg-black">
              <QRScanner onScan={handleScan} onError={handleError} />
              {scanError && (
                <p
                  role="status"
                  className="absolute bottom-3 left-3 right-3 rounded-md border border-red-300/50 bg-red-950/90 px-3 py-2 text-center text-sm text-white shadow-lg"
                >
                  {scanError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
