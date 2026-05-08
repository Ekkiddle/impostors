'use client';

import React, { forwardRef } from 'react';
import { darkenColor } from './SpaceManIcon';

interface WireTargetProps {
    size?: number;
    isHovering: boolean;
    color?: string;
    hoverColor?: string;
}

const WireTarget = forwardRef<HTMLDivElement, WireTargetProps>(
    ({ size = 25, isHovering, color = 'blue', hoverColor = 'gray' }, ref) => {
        const darkerColor = darkenColor(color);

        return (
            <div className="relative" style={{ width: size, height: size }}>
                {/* Draggable origin block */}
                <div
                    ref={ref}
                    className="absolute z-5 border-2 border-black"
                    style={{
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '97%',
                        backgroundColor: isHovering ? hoverColor : darkerColor,
                    }}
                />

                {/* Structural Detail Layer */}
                <div
                    className="absolute z-7"
                    style={{
                        top: 1,
                        left: 0,
                        width: '120%',
                        height: '90%',
                        backgroundColor: darkerColor,
                    }}
                />

                {/* Inner Wire Core Layer */}
                <div
                    className="absolute z-7"
                    style={{
                        top: size / 4,
                        left: 0,
                        width: '120%',
                        height: '50%',
                        backgroundColor: color,
                        pointerEvents: 'none',
                    }}
                />

                {/* Wire end SVG facing left */}
                <svg
                    className="absolute z-8 pointer-events-none"
                    style={{
                        top: '-5%',
                        left: '-50%',
                        width: '130%',
                        height: '130%',
                    }}
                >
                    <image
                        href="/wireend.svg"
                        width="100%"
                        height="100%"
                        /* Calculating center for rotation to prevent offset drift */
                        transform={`rotate(180, ${(size * 1.3) / 2}, ${(size * 1.3) / 2})`}
                    />
                </svg>
            </div>
        );
    }
);

// Helpful for debugging in React DevTools
WireTarget.displayName = 'WireTarget';

export default WireTarget;
