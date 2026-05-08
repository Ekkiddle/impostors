'use client';

import React, { useEffect, useRef, useState } from "react";

interface SteeringTaskProps {
    onSuccess?: () => void;
}

export default function SteeringTask({ onSuccess }: SteeringTaskProps) {
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const parentContainer = useRef<HTMLDivElement>(null);
    const [success, setSuccess] = useState(false);
    const isMoving = useRef(false);

    // Initialize random position
    useEffect(() => {
        if (!parentContainer.current) return;

        const rect = parentContainer.current.getBoundingClientRect();
        const centerX = rect.width * 0.5;
        const centerY = rect.height * 0.5;

        // Start in a random spot around the middle
        const radius = rect.width / 3;
        const angle = Math.random() * 2 * Math.PI;

        setCoords({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }, []);

    // Handle touch scrolling prevention
    useEffect(() => {
        const el = parentContainer.current;
        if (!el) return;

        const preventScroll = (e: TouchEvent) => e.preventDefault();
        el.addEventListener("touchstart", preventScroll, { passive: false });
        el.addEventListener("touchmove", preventScroll, { passive: false });

        return () => {
            el.removeEventListener("touchstart", preventScroll);
            el.removeEventListener("touchmove", preventScroll);
        };
    }, []);

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isMoving.current || success || !parentContainer.current) return;

        const rect = parentContainer.current.getBoundingClientRect();
        let clientX: number;
        let clientY: number;

        if ('touches' in e) {
            clientX = e.touches[0]!.clientX;
            clientY = e.touches[0]!.clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        setCoords({
            x: clientX - rect.left,
            y: clientY - rect.top,
        });
    };

    const handleEnd = () => {
        isMoving.current = false;
        if (!parentContainer.current || success) return;

        const rect = parentContainer.current.getBoundingClientRect();
        const centerX = rect.width * 0.5;
        const centerY = rect.height * 0.5;

        // Calculate tolerance (2% of width)
        const tolerance = rect.width * 0.03;

        const inX = Math.abs(coords.x - centerX) < tolerance;
        const inY = Math.abs(coords.y - centerY) < tolerance;

        if (inX && inY) {
            setSuccess(true);
            setCoords({ x: centerX, y: centerY });
            if (onSuccess) {
                setTimeout(onSuccess, 800);
            }
        }
    };

    return (
        <div className="flex justify-center items-center h-full w-full bg-gray-300 font-orbitron">
            <div className="h-[96%] m-[2%] aspect-square bg-gray-500 rounded-full border-4 border-black shadow-inner">
                <div
                    className="relative overflow-hidden h-[98%] m-[1%] aspect-square rounded-full border-2 border-black bg-[radial-gradient(circle,_rgba(96,165,250,1)_0%,_black_150%)]"
                    ref={parentContainer}
                    onMouseDown={() => (isMoving.current = true)}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={() => (isMoving.current = true)}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                >
                    {/* Grid Overlay */}
                    {[...Array(10)].map((_, i) => (
                        <React.Fragment key={i}>
                            <div className="absolute top-0 bottom-0 w-[1px] bg-sky-900 opacity-40" style={{ left: `${(i + 1) * 10}%` }} />
                            <div className="absolute left-0 right-0 h-[1px] bg-sky-900 opacity-40" style={{ top: `${(i + 1) * 10}%` }} />
                        </React.Fragment>
                    ))}

                    {/* Central Target Crosshair */}
                    <div className="absolute left-[50%] top-[45%] h-[10%] w-[2px] bg-white"></div>
                    <div className="absolute left-[45%] top-[50%] w-[10%] h-[2px] bg-white"></div>
                    <div className={`absolute left-50 top-50 border-2 ${success ? 'border-green-400' : 'border-white'} w-[60px] aspect-square rounded-full`}
                        style={{ left: coords.x - 31, top: coords.y - 31 }}
                    >
                        <div className={`m-[35%] w-[30%] aspect-square border-2 ${success ? 'border-green-400' : 'border-white'} rounded-full`}></div>
                    </div>
                    <div className={`absolute w-[2px] h-full top-0 ${success ? 'bg-green-400' : 'bg-white'}`} style={{ left: coords.x - 2 }}></div>
                    <div className={`absolute h-[2px] w-full left-0 ${success ? 'bg-green-400' : 'bg-white'}`} style={{ top: coords.y - 2 }}></div>
                </div>
            </div>
        </div>
    );
}
