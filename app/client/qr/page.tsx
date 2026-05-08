'use client'

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGame } from '../../game/gameProvider'; // Assuming this is where your logic lives

const QRScanner = dynamic(() => import('../../components/QRScanner'), { ssr: false });

export default function QRPage() {
    const router = useRouter();
    const { joinGame } = useGame();

    // 1. Define the handler for a successful scan
    const handleScan = async (result: string | null) => {
        if (result) {
            console.log("Scanned Code:", result);

            // If the QR code is a game code, you might want to join it
            // try {
            //   await joinGame(result, "Emily"); // Or however you handle name entry
            //   router.push('/client/tasks');
            // } catch (err) {
            //   console.error("Join failed", err);
            // }
        }
    };

    // 2. Define the handler for errors (camera blocked, etc.)
    const handleError = (error: any) => {
        console.error("QR Scanner Error:", error);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-slate-950 text-white font-orbitron">
            <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-2xl font-semibold">QR Scanner</p>
                <p className="max-w-md text-sm text-slate-300">
                    Use this dedicated page for scanning game codes.
                </p>
            </div>

            <div className="w-full max-w-xl aspect-square rounded-2xl border border-slate-700 bg-black p-2 overflow-hidden">
                {/* 3. Pass the required props here */}
                <QRScanner
                    onScan={handleScan}
                    onError={handleError}
                />
            </div>

            <Link
                href="/client/tasks"
                className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
                Back to Tasks
            </Link>
        </div>
    );
}
