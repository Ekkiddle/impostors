'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string, decodedResult: Html5QrcodeResult) => void;
  onError: (errorMessage: string | Error) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [result, setResult] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameraId, setCameraId] = useState<string | null>(null);

  useEffect(() => {
    if (!cameraId) return;

    // Initialize the instance if it doesn't exist
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode("reader", false);
    }

    const scanner = html5QrCodeRef.current;

    scanner.start(
      cameraId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText, decodedResult) => {
        setResult(decodedText);
        if (onScan) onScan(decodedText, decodedResult);
      },
      (errorMessage) => {
        // html5-qrcode calls this on every frame it doesn't find a code
        // so we usually don't want to spam the onError prop here
      }
    ).catch(err => {
      console.error("Failed to start scanner", err);
      if (onError) onError(err);
    });

    return () => {
      // Hardware cleanup: ensure the camera is released
      if (scanner && scanner.isScanning) {
        scanner.stop()
          .then(() => scanner.clear())
          .catch((err) => console.warn("Cleanup error", err));
      }
    };
  }, [cameraId, onScan, onError]);

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        const preferredCamera = devices.find(device =>
          /back|rear|environment/i.test(device.label) &&
          !/0\.5|ultra|wide/i.test(device.label)
        );

        const backCamera = preferredCamera ||
          devices.find(device => /back|rear|environment/i.test(device.label)) ||
          devices[0];

        if (backCamera) setCameraId(backCamera.id);
      }
    }).catch(err => {
      console.error("Camera access error:", err);
      if (onError) onError(err);
    });
  }, [onError]);

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
