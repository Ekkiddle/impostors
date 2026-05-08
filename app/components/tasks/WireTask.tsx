'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { shuffleArray } from '../../game/gameManager';
import DraggableWire from '../DraggableWire';
import WireTarget from '../WireTarget';
import { darkenColor } from '../SpaceManIcon';

const WIRE_COLORS = ['#0000ff', '#ff0000', '#ffeb04', '#ff00ff'];

export default function WireTask({ onSuccess }: { onSuccess?: () => void }) {
    const [connections, setConnections] = useState<string[]>([]);
    const [hoverStates, setHoverStates] = useState<Record<string, boolean>>({
        '#0000ff': false,
        '#ff0000': false,
        '#ffeb04': false,
        '#ff00ff': false,
    });

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
            if (onSuccess) onSuccess();
        }
    }, [connections, onSuccess]);

    useEffect(() => {
        checkSuccess();
    }, [connections, checkSuccess]);

    useEffect(() => {
        setShuffledSources(shuffleArray([...WIRE_COLORS]));
        setShuffledEnds(shuffleArray([...WIRE_COLORS]));
    }, []);

    const setHover = (color: string, state: boolean) => {
        setHoverStates(prev => ({ ...prev, [color]: state }));
    };

    if (shuffledSources.length === 0 || shuffledEnds.length === 0) return null;

    return (
        <div className="flex flex-col relative w-full h-full bg-black select-none">
            {/* Background Image Layer */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'url("/wiringbg.jpg")',
                    backgroundSize: 'auto 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />

            {shuffledSources.map((sourceColor, index) => {
                const endColor = shuffledEnds[index]!;

                return (
                    <div className="flex flex-row justify-between w-full h-[105%]" key={sourceColor}>
                        {/* Start (Left) Side */}
                        <div className="flex flex-col h-full">
                            <div className="bg-gray-600 h-full w-16 max-w-[15vw] border-2 border-black z-5"></div>
                            <div className="bg-yellow-300 h-5 w-14 max-w-[13vw] border-2 border-black z-5"></div>
                            <div className="flex flex-row w-full" style={{ height: size }}>
                                <div
                                    className="relative w-full max-w-[11vw] border-2 border-black z-5"
                                    style={{ backgroundColor: sourceColor, height: size }}
                                >
                                    <div
                                        className="absolute w-full z-7"
                                        style={{
                                            top: '-4%',
                                            left: 0,
                                            height: '110%',
                                            backgroundColor: darkenColor(sourceColor),
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <div
                                        className="absolute w-full z-7"
                                        style={{
                                            top: '24%',
                                            left: 0,
                                            height: '50%',
                                            backgroundColor: sourceColor,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                </div>
                                <DraggableWire
                                    size={size}
                                    color={sourceColor}
                                    targetRef={targetRefs[sourceColor as keyof typeof targetRefs]}
                                    onConnection={() => {
                                        setConnections(prev => [...prev, sourceColor]);
                                        setHover(sourceColor, false);
                                    }}
                                    onHover={() => setHover(sourceColor, true)}
                                />
                            </div>
                        </div>

                        {/* End (Right) Side */}
                        <div className="flex flex-col items-end h-full">
                            <div className="bg-gray-600 h-full w-16 max-w-[15vw] border-2 border-black z-5"></div>
                            <div
                                className={`h-5 w-14 max-w-[13vw] border-2 border-black z-5 ${isConnected(endColor) ? 'bg-yellow-300' : 'bg-gray-800'
                                    }`}
                            ></div>
                            <div className="flex flex-row w-full" style={{ height: size }}>
                                <WireTarget
                                    size={size}
                                    color={endColor}
                                    ref={targetRefs[endColor as keyof typeof targetRefs]}
                                    isHovering={hoverStates[endColor] ?? false}
                                />
                                <div
                                    className="relative w-12 max-w-[11vw] border-2 border-black z-5"
                                    style={{ backgroundColor: endColor, height: size }}
                                >
                                    <div
                                        className="absolute w-full z-7"
                                        style={{
                                            top: '-4%',
                                            left: 1,
                                            height: '110%',
                                            backgroundColor: darkenColor(endColor),
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <div
                                        className="absolute w-full z-7"
                                        style={{
                                            top: '23%',
                                            left: 1,
                                            height: '55%',
                                            backgroundColor: endColor,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Bottom Footer Panels */}
            <div className="flex flex-row h-full justify-between w-full z-5 text-white">
                <div className="bg-gray-600 w-16 max-w-[15vw] border-2 border-black"></div>
                <div className="bg-gray-600 w-16 max-w-[15vw] border-2 border-black"></div>
            </div>
        </div>
    );
}
