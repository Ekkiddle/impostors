'use client';

import React, { useRef, useState, useEffect, useCallback } from "react";

interface Point {
  x: number;
  y: number;
}

interface CheckpointConfig {
  x: string | number;
  y: string | number;
  hit: boolean;
}

interface Dot {
  x: number;
  y: number;
  id: string;
}

export default function NavigateTask() {
  const [points, setPoints] = useState<Point[]>([]);
  const [finishedLines, setFinishedLines] = useState<Point[][]>([]);
  const [circlePos, setCirclePos] = useState<Point>({ x: 0, y: 0 });
  const [success, setSuccess] = useState(false);
  const [checkpoints, setCheckpoints] = useState<CheckpointConfig[]>([]);
  const [dots, setDots] = useState<Dot[]>([]);

  const isDrawing = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const radius = 20;
  const startCircle = { x: "10%", y: "10%" };

  const percentToPx = useCallback((pos: { x: string | number; y: string | number }, width: number, height: number): Point => {
    return {
      x: typeof pos.x === "string" && pos.x.includes("%")
        ? (parseFloat(pos.x) / 100) * width
        : Number(pos.x),
      y: typeof pos.y === "string" && pos.y.includes("%")
        ? (parseFloat(pos.y) / 100) * height
        : Number(pos.y),
    };
  }, []);

  const getPositions = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      start: percentToPx(startCircle, rect.width, rect.height),
      checkpointsPx: checkpoints.map((cp) => percentToPx(cp, rect.width, rect.height)),
      width: rect.width,
      height: rect.height,
    };
  }, [checkpoints, percentToPx]);

  const getAngle = (from: Point, to: Point): number => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    setCirclePos(percentToPx(startCircle, width, height));

    const numDots = Math.floor(width * height * 0.001);
    setDots(Array.from({ length: numDots }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      id: Math.random().toString(36).substring(2, 9),
    })));

    const generated: CheckpointConfig[] = [];
    while (generated.length < 3) {
      generated.push({
        x: `${Math.round(15 + Math.random() * 60)}%`,
        y: `${Math.round(15 + Math.random() * 60)}%`,
        hit: false,
      });
    }
    generated.push({ x: "90%", y: "90%", hit: false });
    setCheckpoints(generated);
  }, [percentToPx]);

  const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ('touches' in e.nativeEvent) {
      const touchEvent = e as React.TouchEvent;
      clientX = touchEvent.touches[0]?.clientX || touchEvent.changedTouches[0]?.clientX || 0;
      clientY = touchEvent.touches[0]?.clientY || touchEvent.changedTouches[0]?.clientY || 0;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const isInCircle = (point: Point, center: Point): boolean => {
    return Math.hypot(point.x - center.x, point.y - center.y) <= radius;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (success) return;
    const point = getRelativeCoords(e);
    if (!isInCircle(point, circlePos)) return;

    isDrawing.current = true;
    setPoints([point]);
    setCirclePos(point);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || success) return;
    const pos = getPositions();
    if (!pos) return;
    const point = getRelativeCoords(e);

    const nextIdx = checkpoints.findIndex((cp) => !cp.hit);
    if (nextIdx !== -1 && pos.checkpointsPx[nextIdx] && isInCircle(point, pos.checkpointsPx[nextIdx]!)) {
      setCheckpoints(prev => {
        const next = [...prev];
        next[nextIdx]!.hit = true;
        return next;
      });
    }

    setPoints((prev) => [...prev, point]);
    setCirclePos(point);
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || success) return;
    isDrawing.current = false;
    const pos = getPositions();
    if (!pos) return;

    const point = getRelativeCoords(e);
    const allHit = checkpoints.every((cp) => cp.hit);
    const lastCP = pos.checkpointsPx[checkpoints.length - 1];

    if (allHit && lastCP && isInCircle(point, lastCP)) {
      setFinishedLines((prev) => [...prev, [...points, point]]);
      setSuccess(true);
    } else {
      setPoints([]);
      setCirclePos(pos.start);
      setCheckpoints((prev) => prev.map((cp) => ({ ...cp, hit: false })));
    }
  };

  const shipAngle = (() => {
    if (points.length > 1) {
      return getAngle(points[Math.max(0, points.length - 5)]!, points[points.length - 1]!);
    }
    const pos = getPositions();
    if (pos?.checkpointsPx[0]) return getAngle(circlePos, pos.checkpointsPx[0]);
    return 0;
  })();

  const checkPointSVG = (pos: Point, i: number) => {
    const numLines = 8;
    const lineLength = 6;
    const lines = [];
    for (let j = 0; j < numLines; j++) {
      const angleRad = (j * 2 * Math.PI) / numLines;
      const x1 = pos.x + Math.cos(angleRad) * radius * 0.6;
      const y1 = pos.y + Math.sin(angleRad) * radius * 0.6;
      const x2 = pos.x + Math.cos(angleRad) * (radius * 0.6 + lineLength);
      const y2 = pos.y + Math.sin(angleRad) * (radius * 0.6 + lineLength);
      lines.push(<line key={`bg-${i}-${j}`} x1={x1 + 2} y1={y1 + 2} x2={x2 + 2} y2={y2 + 2} stroke="rgba(0,0,0,0.5)" strokeWidth="4" />);
      lines.push(<line key={`ln-${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="4" />);
    }
    return (
      <g key={i}>
        <circle cx={pos.x} cy={pos.y} r={radius * 0.3} fill="transparent" stroke={checkpoints[i]?.hit ? "white" : "#001f4d"} strokeWidth="3" />
        {lines}
        {i === checkpoints.length - 1 && (
          <circle cx={pos.x} cy={pos.y} r={radius * 1.2} fill="none" stroke="yellow" strokeWidth="3" strokeDasharray="8 6" />
        )}
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      className="w-full h-full relative bg-blue-500 overflow-hidden touch-none select-none"
    >
      {dots.map((dot) => (
        <div key={dot.id} className="absolute w-[3px] h-[3px] rounded-full bg-white opacity-60" style={{ left: dot.x, top: dot.y }} />
      ))}

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {containerRef.current && checkpoints.map((cp, i) => {
          const cw = containerRef.current!.clientWidth;
          const ch = containerRef.current!.clientHeight;
          const start = i === 0 ? percentToPx(startCircle, cw, ch) : percentToPx(checkpoints[i - 1]!, cw, ch);
          const end = percentToPx(cp, cw, ch);
          return <line key={i} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#0f4391" strokeWidth="3" strokeDasharray="8 6" />;
        })}

        {finishedLines.map((line, i) => (
          <polyline key={i} points={line.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#d4e5ff" strokeWidth="2" />
        ))}

        {points.length > 1 && (
          <polyline points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#d4e5ff" strokeWidth="2" />
        )}

        {containerRef.current && checkpoints.map((cp, i) =>
          checkPointSVG(percentToPx(cp, containerRef.current!.clientWidth, containerRef.current!.clientHeight), i)
        )}

        <image
          href="/ship.svg"
          x={circlePos.x - 20}
          y={circlePos.y - 20}
          width={40}
          height={40}
          transform={`rotate(${shipAngle}, ${circlePos.x}, ${circlePos.y})`}
        />
      </svg>
    </div>
  );
}
