'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string, decodedResult: Html5QrcodeResult) => void;
  onError: (errorMessage: string | Error) => void;
}

let scannerLifecycle: Promise<void> = Promise.resolve();

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [result, setResult] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const callbacksRef = useRef({ onScan, onError });

  useEffect(() => {
    callbacksRef.current = { onScan, onError };
  }, [onScan, onError]);

  useEffect(() => {
    let disposed = false;
    let targetCameraId: string = "";
    let scanner: Html5Qrcode | null = null;

    const startPromise = scannerLifecycle.then(async () => {
      if (disposed) return;

      scanner = new Html5Qrcode("reader", false);
      html5QrCodeRef.current = scanner;
      try {
        const devices = await Html5Qrcode.getCameras();
        console.log(devices);
        console.log("I am here");
        if (devices && devices.length > 0) {
          const backCameras = devices.filter((d) =>
          (d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')));

          const mainCamera = backCameras.find((d) =>
            d.label.toLowerCase().includes('camera 0')
          );

          if (mainCamera) {
            targetCameraId = mainCamera.id;
          } else {
            const backupCamera = backCameras.find((d) =>
              !d.label.toLowerCase().includes('0.5') &&
              !d.label.toLowerCase().includes('ultra') &&
              !d.label.toLowerCase().includes('wide') &&
              !d.label.toLowerCase().includes('macro')
            );
            targetCameraId = backupCamera?.id || devices[0]?.id || "";
          }
        }
        await scanner.start(
          targetCameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText, decodedResult) => {
            if (disposed) return;
            setResult(decodedText);
            callbacksRef.current.onScan(decodedText, decodedResult);
          },
          () => {
            // html5-qrcode calls this on every frame without a detected code.
          }
        );
      } catch (error) {
        if (!disposed) {
          console.error('Failed to start scanner', error);
          callbacksRef.current.onError(error instanceof Error ? error : String(error));
        }
      }
    });
    scannerLifecycle = startPromise;

    return () => {
      disposed = true;
      scannerLifecycle = startPromise.then(async () => {
        console.log("Stopping scanner");
        if (!scanner) return;
        try {
          if (scanner.isScanning) await scanner.stop();
        } catch (error) {
          console.warn('Scanner stop error', error);
        }
        try {
          scanner.clear();
        } catch (error) {
          console.warn('Scanner cleanup error', error);
        }
        if (html5QrCodeRef.current === scanner) html5QrCodeRef.current = null;
      });
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div id="reader" className="overflow-hidden rounded-xl border-none"></div>
      {/* Hidden debug text if needed, or remove for production */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-[10px] p-1 rounded">
        Last Scanned: {result || 'None'}
      </div>
    </div>
  );
}
