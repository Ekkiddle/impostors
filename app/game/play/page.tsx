'use client'
import QRScanner from '@/app/components/QRScanner';
import { useState } from 'react'

export default function PlayPage() {
    const [currentComponent, setCurrentComponent] = useState(null)

    // game logic for scanning => getting the next component to display
    const handleScan = async (result: string | null) => {
        if (result) {
            console.log("Scanned Code:", result);
            // Now, I don't know if the map should be here or somewhere
            // else. We also need a verification step to ensure that you are
            // even allowed to complete this task, if you already completed it,
            // or the state that you are in for this task.

            // Insert logic here for setting the next component to be displayed
        }
    };

    const handleError = (error: any) => {
        // do nothing? Give an error message to the user?
        console.error("QR Scanner Error:", error);
    };


    return (
        <div>
            <h1>Play Page</h1>
            {currentComponent}
        </div>
    )
}