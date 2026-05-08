'use client';

import AsteroidField from "../Asteroid";
import SpaceBackground from "../SpaceBackground";
import React, { useRef, useState, useEffect } from "react";

interface Line {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

export default function AsteroidsTask() {
    const [lines, setLines] = useState<Line[]>([
        { startX: 0, startY: 0, endX: 0, endY: 0 },
        { startX: 0, startY: 0, endX: 0, endY: 0 },
    ]);

    const [count, setCount] = useState(20);
    const containerRef = useRef<HTMLDivElement>(null);

    const updateLines = (x: number, y: number) => {
        if (!containerRef.current) return;
        const parentRect = containerRef.current.getBoundingClientRect();

        setLines([
            { startX: 0, startY: parentRect.height, endX: x, endY: y },
            { startX: parentRect.width, startY: parentRect.height, endX: x, endY: y },
        ]);
    };

    useEffect(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        updateLines(rect.width / 2, rect.height / 2);

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!containerRef.current) return;
            const parentRect = containerRef.current.getBoundingClientRect();

            const clientX = 'touches' in e ? e.touches[0]!.clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0]!.clientY : (e as MouseEvent).clientY;

            const x = clientX - parentRect.left;
            const y = clientY - parentRect.top;

            // Clamp values so crosshair stays in bounds
            if (x >= 0 && x <= parentRect.width && y >= 0 && y <= parentRect.height) {
                updateLines(x, y);
            }
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("touchmove", handleMove, { passive: false });

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("touchmove", handleMove);
        };
    }, []);

    const handleAsteroid = () => {
        setCount((prev) => {
            const next = prev - 1;
            if (next <= 0) {
                console.log("Mission Accomplished");
                // Trigger success logic here
                return 0;
            }
            return next;
        });
    };

    return (
        <div className="relative w-full h-full cursor-none overflow-hidden" ref={containerRef}>
            <SpaceBackground />

            <AsteroidField
                onClick={handleAsteroid}
                spawnRate={500} // Example prop: lower = more frequent spawns
                maxActive={15}   // Keep at least 15 on screen at once
            />

            <div className="absolute top-5 left-0 w-full flex flex-col items-center text-white font-orbitron z-40"
                style={{ pointerEvents: 'none' }}
            >
                <p>Asteroids left: {count}</p>
            </div>

            {/* Targeting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                {lines.map((line, index) => (
                    <line
                        key={index}
                        x1={line.startX}
                        y1={line.startY}
                        x2={line.endX}
                        y2={line.endY}
                        stroke="#2c304b"
                        strokeWidth={3}
                        opacity="0.8"
                    />
                ))}
            </svg>

            {/* Crosshair UI */}
            <div
                className="absolute pointer-events-none z-30 transition-transform duration-75 ease-out"
                style={{
                    left: `${lines[0]?.endX ?? 10}px`,
                    top: `${lines[0]?.endY ?? 10}px`,
                    transform: 'translate(-50%, -50%)',
                }}
            >
                <svg width={40} height={40}>
                    <rect x="5" y="5" width="30" height="30" stroke="#9da5d2" strokeWidth="2" fill="none" />
                    <line x1="0" y1="20" x2="10" y2="20" stroke="#9da5d2" strokeWidth="2" />
                    <line x1="30" y1="20" x2="40" y2="20" stroke="#9da5d2" strokeWidth="2" />
                    <line x1="20" y1="0" x2="20" y2="10" stroke="#9da5d2" strokeWidth="2" />
                    <line x1="20" y1="30" x2="20" y2="40" stroke="#9da5d2" strokeWidth="2" />
                    {/* Center Dot */}
                    <circle cx="20" cy="20" r="1.5" fill="#9da5d2" />
                </svg>
            </div>
        </div>
    );
}
