'use client'

import dynamic from 'next/dynamic';
import Link from 'next/link';

const QRScanner = dynamic(() => import('../../components/QRScanner'), { ssr: false });

export default function QRPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-slate-950 text-white">
            <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-2xl font-semibold">QR Scanner</p>
                <p className="max-w-md text-sm text-slate-300">Use this dedicated page for scanning game codes. The tasks page now only hosts task navigation.</p>
            </div>

            <div className="w-full max-w-xl aspect-square rounded-2xl border border-slate-700 bg-black p-2">
                <QRScanner />
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
