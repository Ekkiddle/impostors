'use client';

import { useEffect } from 'react';

export default function PWAClientLogic() {
    useEffect(() => {
        const lockOrientation = () => {
            const screenAny = screen as any;
            if (screenAny.orientation && screenAny.orientation.lock) {
                screenAny.orientation.lock('portrait').catch((error: Error) => {
                    console.log('Error locking orientation: ', error);
                });
            }
        };
        lockOrientation();
    }, []);

    useEffect(() => {
        let consoleInstance: { destroy: () => void } | undefined;
        let cancelled = false;

        void import('vconsole').then(({ default: VConsole }) => {
            if (cancelled) return;
            consoleInstance = new VConsole();
            console.info('[Mobile console] VConsole initialized');
        }).catch(error => {
            console.error('[Mobile console] Could not initialize VConsole:', error);
        });

        return () => {
            cancelled = true;
            consoleInstance?.destroy();
        };
    }, []);

    return null; // This component doesn't render anything
}
