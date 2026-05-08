'use client';

import React, { useState, useRef, useEffect, type RefObject } from 'react';
import { darkenColor } from './SpaceManIcon';

interface Point {
  x: number;
  y: number;
}

interface DraggableWireProps {
  color?: string;
  onConnection?: (point: Point) => void;
  onHover?: () => void;
  targetRef?: RefObject<HTMLElement | null>;
  size?: number;
}

export default function DraggableWire({
  color = 'blue',
  onConnection,
  onHover,
  targetRef,
  size = 25,
}: DraggableWireProps) {
  const darkerColor = darkenColor(color);
  const originRef = useRef<HTMLDivElement>(null);

  const [hover, setHovering] = useState(false);
  const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
  const [current, setCurrent] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [connected, setConnected] = useState(false);

  const updateOrigin = () => {
    if (originRef.current) {
      const rect = originRef.current.getBoundingClientRect();
      setOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  };

  // Sync with target position if connected (for window resizing/animations)
  useEffect(() => {
    let animationFrameId: number;
    const updateLoop = () => {
      if (connected && targetRef?.current) {
        updateOrigin();
        const targetRect = targetRef.current.getBoundingClientRect();
        setCurrent({
          x: targetRect.left + 5, // Slight offset so the wire "enters" the socket
          y: targetRect.top + targetRect.height / 2,
        });
      }
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [connected, targetRef]);

  useEffect(() => {
    const handleResize = () => updateOrigin();
    window.addEventListener('resize', handleResize);
    updateOrigin();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      // Safe coordinate extraction
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;

      setCurrent({ x: clientX, y: clientY });
      setHovering(false);

      if (targetRef?.current) {
        const targetRect = targetRef.current.getBoundingClientRect();
        // Buffer zone for snapping
        const inside =
          clientX >= targetRect.left - size &&
          clientX <= targetRect.right + 10 &&
          clientY >= targetRect.top - 10 &&
          clientY <= targetRect.bottom + 10;

        if (inside) {
          if (onHover) onHover();
          setHovering(true);
        }
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      if (hover && current) {
        setConnected(true);
        if (onConnection) onConnection(current);
      } else {
        setCurrent(null); // Snap back to origin if released without connection
      }
      setHovering(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, current, hover, onConnection, targetRef, onHover, size]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (connected) return;
    updateOrigin();

    const clientX = 'touches' in e ? e.touches[0]!.clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : (e as React.MouseEvent).clientY;

    setCurrent({ x: clientX, y: clientY });
    setIsDragging(true);
  };

  const renderWire = () => {
    const svgSize = size * 1.5;
    const offset = 10;

    // Show nothing if not dragging or connected
    if (!(isDragging || connected) || !current) {
      return (
        <image
          href="/wireend.svg"
          width={svgSize}
          height={svgSize}
          x={origin.x - offset / 2}
          y={origin.y - svgSize / 2}
        />
      );
    }

    const end = current;
    const dx = end.x - origin.x;
    const dy = end.y - origin.y;
    const angle = Math.atan2(dy, dx);
    const degrees = (angle * 180) / Math.PI;

    const calculatePoints = (w: number, off: number) => {
      const halfThick = w / 2;
      const p1 = { x: origin.x + off, y: origin.y + halfThick };
      const p2 = { x: origin.x + off, y: origin.y - halfThick };
      const p3 = {
        x: end.x + halfThick * Math.sin(angle),
        y: end.y - halfThick * Math.cos(angle),
      };
      const p4 = {
        x: end.x - halfThick * Math.sin(angle),
        y: end.y + halfThick * Math.cos(angle),
      };
      return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
    };

    return (
      <>
        <polygon points={calculatePoints(size, 0)} fill={darkerColor} stroke="black" strokeWidth="2" />
        <polygon points={calculatePoints(size - 2, -1)} fill={darkerColor} />
        <polygon points={calculatePoints(size * 0.5, -1)} fill={color} />
        <image
          href="/wireend.svg"
          width={svgSize}
          height={svgSize}
          x={end.x - offset}
          y={end.y - svgSize / 2}
          transform={`rotate(${degrees}, ${end.x}, ${end.y})`}
        />
      </>
    );
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="fixed inset-0 pointer-events-none overflow-visible z-20">
        {renderWire()}
      </svg>

      <div
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className="absolute cursor-pointer z-30"
        style={{ top: -5, left: -5, width: size + 10, height: size + 10 }}
      />

      <div
        ref={originRef}
        className="absolute z-10 border-2 border-black"
        style={{ top: 0, left: 0, width: size, height: size, backgroundColor: darkerColor }}
      />
    </div>
  );
}
