'use client';

import React, { useEffect, useRef, useState } from "react";

interface Hexagon {
    id: string;
    x: number;
    y: number;
    clicked: boolean;
}

interface ShieldsTaskProps {
    onSuccess?: () => void;
}

export default function ShieldsTask({ onSuccess }: ShieldsTaskProps) {
    const [dots, setDots] = useState<{ x: number; y: number; id: string }[]>([]);
    const [hexagons, setHexagons] = useState<Hexagon[]>([]);
    const [completed, setCompleted] = useState(false);

    // Use a ref to track completion for the timeout logic (prevents stale checks)
    const isFinishedRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const numDots = Math.floor(width * height * 0.0005); // Balanced density

        const newDots = Array.from({ length: numDots }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            id: Math.random().toString(36).substring(2, 9),
        }));
        setDots(newDots);

        const centerX = width / 2;
        const centerY = height / 2;
        const hexDistance = width * 0.28;
        const newHexagons: Hexagon[] = [];

        // Center hexagon
        newHexagons.push({ id: "center", x: centerX, y: centerY, clicked: false });

        // Outer ring
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + Math.PI / 6;
            const x = centerX + hexDistance * Math.cos(angle);
            const y = centerY + hexDistance * Math.sin(angle);
            newHexagons.push({ id: `outer-${i + 1}`, x, y, clicked: false });
        }

        setHexagons(newHexagons);
    }, []);

    const handleHexClick = (id: string) => {
        if (isFinishedRef.current) return;

        setHexagons((prev) => {
            const updated = prev.map((hex) =>
                hex.id === id ? { ...hex, clicked: true } : hex
            );

            const allClicked = updated.every((hex) => hex.clicked);

            if (allClicked) {
                isFinishedRef.current = true;
                setCompleted(true);
                if (onSuccess) {
                    setTimeout(onSuccess, 1000);
                }
                return updated;
            }

            // Revert this specific hex after 2 seconds if not completed
            setTimeout(() => {
                if (isFinishedRef.current) return;
                setHexagons((curr) =>
                    curr.map((h) => (h.id === id ? { ...h, clicked: false } : h))
                );
            }, 2000);

            return updated;
        });
    };

    return (
        <div className="relative flex justify-center items-center h-full w-full bg-gray-400 font-orbitron overflow-hidden">
            {/* Decorative Shadow Ring */}
            <div className="absolute z-0 left-[6%] top-[9%] h-[90%] bg-gray-600/30 aspect-square rounded-full" />

            <div
                className="relative z-10 overflow-hidden h-[90%] aspect-square rounded-full border-2 border-black bg-[radial-gradient(circle,_#1e3a8a_0%,_#000_150%)] shadow-2xl"
                ref={containerRef}
            >
                {/* Grid lines - rendered as one loop for efficiency */}
                {[...Array(10)].map((_, i) => (
                    <React.Fragment key={i}>
                        <div className="absolute top-0 bottom-0 w-[1px] bg-sky-900/40" style={{ left: `${(i + 1) * 10}%` }} />
                        <div className="absolute left-0 right-0 h-[1px] bg-sky-900/40" style={{ top: `${(i + 1) * 10}%` }} />
                    </React.Fragment>
                ))}

                {/* Ambient background dots */}
                {dots.map((dot) => (
                    <div
                        key={dot.id}
                        className="absolute w-[2px] h-[2px] rounded-full bg-white opacity-40 pointer-events-none"
                        style={{ left: dot.x, top: dot.y }}
                    />
                ))}

                {/* The Interactive Hexagons */}
                {hexagons.map((hex) => (
                    <div
                        key={hex.id}
                        onClick={() => handleHexClick(hex.id)}
                        className={`absolute w-[26%] aspect-square cursor-pointer transition-all duration-300 border-[4px] ${hex.clicked
                            ? "bg-white/40 border-white shadow-[0_0_20px_white]"
                            : "bg-red-500/30 border-red-500 hover:bg-red-500/50"
                            }`}
                        style={{
                            left: hex.x,
                            top: hex.y,
                            transform: "translate(-50%, -50%)",
                            clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
