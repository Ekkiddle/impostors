'use client';

import { useRef, useState, useEffect, useCallback } from "react";
import localFont from 'next/font/local';
import { DraggableDiv } from "../CustomDivs";

const digi = localFont({ src: '../../fonts/time.ttf' });

interface CardTaskProps {
    onSuccess?: () => void;
}

export default function CardTask({ onSuccess }: CardTaskProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const swipeAreaRef = useRef<HTMLDivElement>(null);

    const [message, setMessage] = useState('Please Insert Card');
    const [swiping, setSwiping] = useState(false);
    const [swiped, setSwiped] = useState(false);

    const [startPos, setStartPos] = useState<number | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Helper to show a message then reset
    const showTemporaryMessage = useCallback((newMessage: string, delay = 1500) => {
        setMessage(newMessage);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            // Check if we haven't successfully finished before resetting
            setMessage((current) => (current === "Success!" ? "Success!" : "Please Insert Card"));
        }, delay);
    }, []);

    const isOverlapping = (obj1: React.RefObject<HTMLElement | null>, obj2: React.RefObject<HTMLElement | null>) => {
        if (!obj1.current || !obj2.current) return false;
        const rect1 = obj1.current.getBoundingClientRect();
        const rect2 = obj2.current.getBoundingClientRect();

        return (
            rect1.right > rect2.left &&
            rect1.left < rect2.right &&
            rect1.bottom > rect2.top &&
            rect1.top < rect2.bottom
        );
    };

    const evaluateSwipe = (swipeRight: boolean) => {
        if (!swipeAreaRef.current || !cardRef.current || !startTime || startPos === null) return;

        const swipeArea = swipeAreaRef.current.getBoundingClientRect();
        const card = cardRef.current.getBoundingClientRect();
        const swipeDuration = (Date.now() - startTime) / 1000;
        const swipeDistance = Math.abs(card.left - startPos);
        const swipeThreshold = swipeArea.width * 0.6; // 60% of track length

        if (!swipeRight) {
            showTemporaryMessage("Bad Read. Try Again.");
            return;
        }

        if (swipeDistance < swipeThreshold) {
            showTemporaryMessage("Bad Read.");
            return;
        }

        if (swipeDuration < 0.7) {
            showTemporaryMessage("Too Fast.");
            return;
        }

        if (swipeDuration > 0.9) {
            showTemporaryMessage("Too Slow.");
            return;
        }

        setMessage("Success!");
        if (onSuccess) {
            setTimeout(onSuccess, 1000); // Small delay to let them see the success
        }
    };

    const dragFunction = () => {
        if (!cardRef.current || !swipeAreaRef.current) return;

        const currentlyOverlapping = isOverlapping(cardRef, swipeAreaRef);

        if (currentlyOverlapping) {
            const card = cardRef.current.getBoundingClientRect();
            const swipeArea = swipeAreaRef.current.getBoundingClientRect();

            if (!startPos) {
                setStartPos(card.left);
                setStartTime(Date.now());
                setMessage('Ready...');
                return;
            }

            const margin = swipeArea.width * 0.05;

            if (!swiping && Math.abs(card.left - startPos) > margin) {
                setSwiping(true);
                setMessage('Swiping...');
            }

            // Logic for hitting the edges while still overlapping
            if (swiping && !swiped) {
                if (card.right > (swipeArea.right - margin) && card.left > startPos) {
                    setSwiped(true);
                    evaluateSwipe(true);
                } else if (card.left < (swipeArea.left + margin) && card.left < startPos) {
                    setSwiped(true);
                    evaluateSwipe(false);
                }
            }
        } else {
            // TRIGGER EVALUATION ON REMOVAL
            // If we were swiping but haven't "swiped" (hit the edge) yet, 
            // and we just stopped overlapping:
            if (swiping && !swiped) {
                setSwiped(true); // Prevent double firing
                evaluateSwipe(true); // Run the distance/time checks
            }

            // Reset tracking after evaluation
            if (startPos !== null) {
                setStartPos(null);
                setSwiping(false);
                setSwiped(false);
                setStartTime(null);
            }
        }
    };


    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className={`w-full h-full relative bg-gray-600`}>
            <DraggableDiv
                id="demo"
                ref={cardRef}
                defaultPosition={{ x: '20%', y: '75%' }}
                width={'30%'}
                height={'20%'}
                forbiddenZones={[containerRef]}
                onDrag={dragFunction}
                style={{ zIndex: 10 }}
            >
                <div className="w-full h-full rounded-md bg-gray-200 overflow-hidden z-10">
                    <img src="/card.png" alt="example" className="w-full h-full object-cover" />
                </div>
            </DraggableDiv>
            <div
                className="absolute w-full h-[20%] top-0 left-0 bg-gray-400 z-2"
                ref={containerRef}
            ></div>
            <div className="absolute w-full h-[30%] top-0 left-0 bg-gray-400 rounded-bl-4xl border-4 border-black z-20"
                ref={swipeAreaRef}
            >
                <div className={`w-[90%] mx-[5%] mt-2 bg-green-900 h-[29%] p-1 text-white ${digi.className}`}>
                    {message}
                </div>
                <img src="/swipe.svg" className="mx-1 h-[64%]" />
            </div>
            <div className="absolute w-full h-[30%] top-[2%] left-0 bg-gray-800 rounded-bl-4xl z-5" />
            <div className="absolute w-full h-[20%] top-[25%] left-0 bg-gray-700 z-3" />
            <div className="absolute w-full h-[15%] top-[35%] left-0 bg-gray-400 rounded-tl-4xl border-4 border-black z-5" />
            <div className="absolute w-full h-[15%] top-[40%] left-0 bg-gray-700 rounded-tl-4xl z-4" />
        </div>
    );
}
