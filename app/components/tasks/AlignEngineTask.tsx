'use client';

import { useState, useRef, useEffect } from "react";
import { EmbossedDiv } from "../CustomDivs";

export default function AlignEngineTask() {
    const [angle, setAngle] = useState(45);
    const angleRef = useRef(angle);
    const [success, setSuccess] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Constants for the quadratic bezier curve
    const angleToT = (a: number) => (a + 45) / 90;
    const tToAngle = (t: number) => t * 90 - 45;

    // Helper to get a point and its tangent angle at distance 't' (0 to 1)
    const getPointAndTangent = (t: number) => {
        const path = pathRef.current;
        if (!path) return { x: 0, y: 0, tangentAngle: 0 };

        const length = path.getTotalLength();
        const point = path.getPointAtLength(t * length);

        // To find the tangent, we look at a tiny step forward on the curve
        const delta = 0.01;
        const nextPoint = path.getPointAtLength(Math.min(t + delta, 1) * length);
        const prevPoint = path.getPointAtLength(Math.max(t - delta, 0) * length);

        // Calculate angle in degrees
        const angleRad = Math.atan2(nextPoint.y - prevPoint.y, nextPoint.x - prevPoint.x);
        const tangentAngle = (angleRad * 180) / Math.PI;

        return { x: point.x, y: point.y, tangentAngle };
    };

    const getSVGCoords = (event: any) => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const pt = svg.createSVGPoint();

        // Handle both touch and mouse
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        pt.x = clientX;
        pt.y = clientY;

        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const transformed = pt.matrixTransform(ctm.inverse());
        return { x: transformed.x, y: transformed.y };
    };

    // Improved Y-to-T mapping using binary search
    const getTFromY = (targetY: number) => {
        const path = pathRef.current;
        if (!path) return 0;
        const length = path.getTotalLength();
        let low = 0, high = length, bestT = 0;

        for (let i = 0; i < 24; i++) {
            const mid = (low + high) / 2;
            const pt = path.getPointAtLength(mid);
            if (Math.abs(pt.y - targetY) < Math.abs(path.getPointAtLength(bestT * length).y - targetY)) {
                bestT = mid / length;
            }
            if (pt.y < targetY) low = mid;
            else high = mid;
        }
        return Math.max(0, Math.min(1, bestT));
    };

    const handleStart = (e: any) => {
        if (success) return;
        const { x, y } = getSVGCoords(e);
        const currentPos = getPointAndTangent(angleToT(angle));

        // Increased hit-box for easier grabbing on mobile
        const dist = Math.hypot(currentPos.x - x, currentPos.y - y);
        if (dist < 15) {
            setIsDragging(true);
        }
    };

    const handleMove = (e: any) => {
        if (!isDragging || success) return;
        const { y } = getSVGCoords(e);
        const t = getTFromY(y);
        setAngle(tToAngle(t));
    };

    const handleEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        // Snap logic: if close to 0, succeed
        if (Math.abs(angleRef.current) < 4) {
            setAngle(0);
            setSuccess(true);
        }
    };

    useEffect(() => {
        const magnitude = 15 + Math.random() * 25;
        const sign = Math.random() < 0.5 ? -1 : 1;
        setAngle(magnitude * sign);

        window.addEventListener("mouseup", handleEnd);
        window.addEventListener("touchend", handleEnd);
        return () => {
            window.removeEventListener("mouseup", handleEnd);
            window.removeEventListener("touchend", handleEnd);
        };
    }, []);

    useEffect(() => { angleRef.current = angle; }, [angle]);

    const { x: arrowX, y: arrowY, tangentAngle } = getPointAndTangent(angleToT(angle));

    return (
        <div className="h-full w-full select-none touch-none">
            <EmbossedDiv className="flex h-full w-full bg-gray-300 p-[6%]">
                {/* LEFT PANEL: Alignment Visualizer */}
                <div className="relative w-[60%] h-full bg-black overflow-hidden border-2 border-gray-400">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 border-t border-dotted border-red-900 opacity-50" />

                    <div
                        className="absolute h-[1px] border-red-500 origin-right border-dashed border-t transition-colors duration-500"
                        style={{
                            width: "200%",
                            top: "50%",
                            right: 0,
                            transform: `translateY(-50%) rotate(${-angle}deg)`,
                            borderColor: success ? '#4ade80' : '#ef4444'
                        }}
                    />

                    <div
                        className="absolute h-[60px] border-2 origin-right transition-colors duration-500"
                        style={{
                            width: "45%",
                            top: "50%",
                            right: 0,
                            transform: `translateY(-50%) rotate(${-angle}deg)`,
                            borderColor: success ? '#4ade80' : '#ef4444',
                            borderStyle: 'dashed'
                        }}
                    >
                        <div className="mx-[10%] w-[80%] h-full border-x border-dashed border-inherit" />
                    </div>

                    {success && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 pointer-events-none">
                            <span className="text-green-500 font-bold tracking-tighter opacity-50">LOCKED</span>
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL: The Slider */}
                <div className="relative w-[40%] h-full bg-gray-200 flex items-center justify-center shadow-inner">
                    <svg
                        ref={svgRef}
                        className="w-full h-full cursor-pointer"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        onMouseDown={handleStart}
                        onTouchStart={handleStart}
                        onMouseMove={handleMove}
                        onTouchMove={handleMove}
                    >
                        <path
                            ref={pathRef}
                            d="M 65 15 Q 15 50 65 85"
                            fill="none"
                            stroke="#999"
                            strokeWidth="6"
                            strokeLinecap="round"
                        />

                        {/* The Arrow (Marker) */}
                        <g
                            transform={`translate(${arrowX}, ${arrowY}) rotate(${tangentAngle})`}
                            className="transition-transform duration-75"
                        >
                            {/* Collision hitbox circle (invisible) */}
                            <circle r="12" fill="transparent" />
                            {/* Triangle pointing tangent */}
                            <path
                                d="M -12,0 L 2,-6 L 2,6 Z"
                                fill={success ? "#4ade80" : (isDragging ? "#333" : "#666")}
                            />
                        </g>
                    </svg>
                </div>
            </EmbossedDiv>
        </div>
    );
}
