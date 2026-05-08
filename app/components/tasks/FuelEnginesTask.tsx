import React, { useState, useRef, useEffect } from 'react';
import { EmbossedDiv } from '../CustomDivs';

interface FuelEnginesTaskProps {
    onSuccess: () => void; // Call this when fuel is full
    stage?: string;
}

const FuelEnginesTask: React.FC<FuelEnginesTaskProps> = ({ onSuccess, stage = "COLLECT" }) => {
    const [fuelLevel, setFuelLevel] = useState(0); // 0 to 100
    const [isFilling, setIsFilling] = useState(false);
    const [success, setSuccess] = useState(false);
    const requestRef = useRef<number | null>(null);
    const fillRate = 0.5; // Adjust this to make it faster or slower

    const updateFuel = () => {
        setFuelLevel((prev) => {
            if (prev >= 100) {
                cancelAnimationFrame(requestRef.current!);
                onSuccess();
                setSuccess(true);
                return 100;
            }
            return prev + fillRate;
        });

        if (isFilling) {
            requestRef.current = requestAnimationFrame(updateFuel);
        }
    };

    useEffect(() => {
        if (isFilling && fuelLevel < 100) {
            requestRef.current = requestAnimationFrame(updateFuel);
        } else {
            cancelAnimationFrame(requestRef.current!);
        }
        return () => cancelAnimationFrame(requestRef.current!);
    }, [isFilling]);

    return (
        <div className="relative grid grid-cols-[60%_10%_30%] bg-gray-800 shadow-2xl w-full h-full">

            <EmbossedDiv
                innerDimensions={{ left: 5, right: 95, top: 5, bottom: 95 }}
                className='w-full h-full p-[10%] bg-gray-600 relative'
            >
                {/* Fuel Canister Container */}
                <div className="w-full h-[80%] mt-5 relative">

                    {/* 1. DEFINE PATH ONCE (Invisible) */}
                    <svg width="0" height="0" style={{ position: 'absolute' }}>
                        <defs>
                            {/* Added a slight adjustment to the handle 'M' section for better geometry */}
                            <path id="fuelPath" d="M 0 0 V 0.05 L 0.06 0.1 L 0.12 0.2 L 0.07 0.25 V 0.9 L 0.15 0.95 H 0.85 L 0.92 0.9 V 0.25 L 0.85 0.2 L 0.7 0.05 H 0.3 L 0.18 0.15 L 0.1 0.05 Z M 0.28 0.18 L 0.35 0.1 H 0.65 L 0.73 0.18 Z" />

                            <clipPath id="canisterShape" clipPathUnits="objectBoundingBox">
                                <use href="#fuelPath" />
                            </clipPath>
                        </defs>
                    </svg>

                    {/* 2. THE VISUAL BODY (Background and Liquid) */}
                    <div className={`w-full h-full
                        ${stage === "DEPOSIT" ? '-rotate-45 scale-[0.25] origin-top-right -translate-x-[25%]' : 'rotate-0'}`}>
                        <div
                            className={`w-full h-full bg-gray-900 relative`}
                            style={{ clipPath: "url(#canisterShape)" }}
                        >
                            {/* Liquid Fill */}
                            <div
                                className="absolute bottom-0 w-full bg-yellow-500"
                                style={{ height: `${stage === "DEPOSIT" ? 100 - fuelLevel : fuelLevel}%` }}
                            />

                            {/* Internal Gauge Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between py-8 px-4 opacity-60 pointer-events-none">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="w-1/4 h-[2px] bg-white/50" />
                                ))}
                            </div>
                        </div>

                        {/* 3. THE BORDER (Moved OUTSIDE the clipped div) */}
                        <svg
                            viewBox='0 0 1 1'
                            preserveAspectRatio='none'
                            className={`absolute inset-0 w-full h-full pointer-events-none`}
                            style={{ overflow: 'visible' }}
                        >
                            <use
                                href="#fuelPath"
                                fill="none"
                                stroke="#374151" // gray-700
                                strokeWidth="0.02"
                                strokeLinejoin="round"
                            />
                        </svg>

                    </div>
                    {stage === "DEPOSIT" && (
                        <div className="absolute inset-0 w-[30%] h-[70%] translate-y-[30%] translate-x-[100%] bg-gray-900 border-2 border-gray-700 rounded-sm overflow-hidden">
                            {/* Liquid Fill for Rectangle */}
                            <div
                                className="absolute bottom-0 w-full bg-yellow-500"
                                style={{ height: `${fuelLevel}%` }}
                            />

                            {/* Fill Lines (Rectangle Version) */}
                            <div className="absolute inset-0 flex flex-col justify-between py-2 px-2 opacity-60 pointer-events-none">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="w-full h-[1px] bg-white/40" />
                                ))}
                            </div>
                        </div>
                    )}
                    REFILL FUEL
                </div>
            </EmbossedDiv>

            <div className='relative w-full h-full flex flex-col'>
                <div className='absolute bottom-[5%] w-full h-2 bg-gray-600' />
                <div className='absolute bottom-[10%] w-full h-2 bg-gray-600' />
            </div>
            <div className="relative w-full h-full flex flex-col">
                <div className="absolute bottom-[32%] left-1/2 -translate-x-1/2 flex gap-3 z-20">
                    <div className={`w-3 h-3 rounded-full border border-red-950 shadow-[0_0_12px_#ef4444] ${!success ? 'bg-red-500' : 'bg-red-900/30'}`} />
                    <div className={`w-3 h-3 rounded-full border border-green-950 shadow-[0_0_12px_#22c55e] ${success ? 'bg-green-500' : 'bg-green-900/30'}`} />
                </div>
                <EmbossedDiv
                    innerDimensions={{ left: 5, right: 95, top: 5, bottom: 95 }}
                    className='absolute top-full -translate-y-[100%] w-full aspect-square p-[15%] bg-gray-500'>
                    {/* Fill Button */}
                    <EmbossedDiv
                        onMouseDown={() => setIsFilling(true)}
                        onMouseUp={() => setIsFilling(false)}
                        onMouseLeave={() => setIsFilling(false)}
                        onTouchStart={() => setIsFilling(true)}
                        onTouchEnd={() => setIsFilling(false)}
                        innerDimensions={{ left: 5, right: 95, top: 5, bottom: 95 }}
                        className={`w-full aspect-square py-4 bg-gray-300 font-bold text-xl transition-all active:scale-95 select-none`}
                    >
                    </EmbossedDiv>
                </EmbossedDiv>
            </div>
        </div>
    );
};

export default FuelEnginesTask;
