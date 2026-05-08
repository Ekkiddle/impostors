'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { shuffleArray } from '../../game/gameManager';
import DraggableWire from '../DraggableWire';
import WireTarget from '../WireTarget';
import { darkenColor } from '../SpaceManIcon';

// Define our wire colors as a constant
const WIRE_COLORS = ['#0000ff', '#ff0000', '#ffeb04', '#ff00ff'];

export default function WireTask({ onSuccess }: { onSuccess?: () => void }) {
    const [connections, setConnections] = useState<string[]>([]);

    // Track hover states in an object to keep code clean
    const [hoverStates, setHoverStates] = useState<Record<string, boolean>>({
        '#0000ff': false,
        '#ff0000': false,
        '#ffeb04': false,
        '#ff00ff': false,
    });

    // Store only the color strings in state, shuffled
    const [shuffledSources, setShuffledSources] = useState<string[]>([]);
    const [shuffledEnds, setShuffledEnds] = useState<string[]>([]);

    // Refs for the targets
    const targetRefs = {
        '#0000ff': useRef<HTMLDivElement>(null),
        '#ff0000': useRef<HTMLDivElement>(null),
        '#ffeb04': useRef<HTMLDivElement>(null),
        '#ff00ff': useRef<HTMLDivElement>(null),
    };

    const size = 20;

    const isConnected = (color: string) => connections.includes(color);

    const checkSuccess = useCallback(() => {
        if (connections.length === WIRE_COLORS.length) {
            console.log("Task Complete");
            if (onSuccess) onSuccess();
        }
    }, [connections, onSuccess]);

    useEffect(() => {
        checkSuccess();
    }, [connections, checkSuccess]);

    // Shuffle colors on mount
    useEffect(() => {
        setShuffledSources(shuffleArray([...WIRE_COLORS]));
        setShuffledEnds(shuffleArray([...WIRE_COLORS]));
    }, []);

    const setHover = (color: string, state: boolean) => {
        setHoverStates(prev => ({ ...prev, [color]: state }));
    };

    if (shuffledSources.length === 0 || shuffledEnds.length === 0) return null;

    return (
        <div className="flex flex-col relative w-full h-full bg-black font-orbitron">
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'url("/wiringbg.jpg")',
                    backgroundSize: 'auto 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />

            {shuffledSources.map((color, index) => {
                const endColor = shuffledEnds[index]!; // Use ! because we know the length matches

                return (
                    <div className='flex flex-row justify-between w-full h-[105%]' key={color}>
                        {/* Start (Left) Side */}
                        <div className="flex flex-col h-full">
                            <div className='bg-gray-600 h-full w-16 max-w-[15vw] border-2 border-black z-10'></div>
                            <div className='bg-yellow-300 h-5 w-14 max-w-[13vw] border-2 border-black z-10'></div>
                            <div className='flex flex-row w-full' style={{ height: size }}>
                                <div className='relative w-12 max-w-[11vw] border-2 border-black z-10' style={{ backgroundColor: color, height: size }}>
                                    <div className="absolute w-full z-20" style={{ top: '-4%', left: 1, height: '110%', backgroundColor: darkenColor(color), pointerEvents: 'none' }} />
                                </div>
                                <DraggableWire
                                    size={size}
                                    color={color}
                                    targetRef={targetRefs[color as keyof typeof targetRefs]}
                                    onConnection={() => {
                                        setConnections(prev => [...prev, color]);
                                        setHover(color, false);
                                    }}
                                    onHover={() => setHover(color, true)}
                                />
                            </div>
                        </div>

                        {/* End (Right) Side */}
                        <div className='flex flex-col items-end h-full'>
                            <div className='bg-gray-600 h-full w-16 max-w-[15vw] border-2 border-black z-10'></div>
                            <div className={`h-5 w-14 max-w-[13vw] border-2 border-black z-10 ${isConnected(endColor) ? 'bg-yellow-300' : 'bg-gray-800'}`}></div>
                            <div className='flex flex-row w-full bg-black' style={{ height: size }}>
                                <WireTarget
                                    size={size}
                                    color={endColor}
                                    ref={targetRefs[endColor as keyof typeof targetRefs]}
                                    isHovering={hoverStates[endColor]}
                                />
                                <div className='relative w-12 max-w-[11vw] border-2 border-black z-10' style={{ backgroundColor: endColor, height: size }}>
                                    <div className="absolute w-full z-20" style={{ top: '-4%', left: 1, height: '110%', backgroundColor: darkenColor(endColor), pointerEvents: 'none' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
