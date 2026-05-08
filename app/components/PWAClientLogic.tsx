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

    return null; // This component doesn't render anything
}
