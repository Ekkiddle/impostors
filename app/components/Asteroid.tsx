'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AsteroidData {
  id: string;
  svg: string;
  size: number;
  speed: number;
  top: string;
  spawnOnScreen: boolean;
}

const asteroidSvgs = [
  '/asteroid1.svg',
  '/asteroid2.svg',
  '/asteroid3.svg',
  '/asteroid4.svg'
];

function getRandomAsteroid(spawnOnScreen = false): AsteroidData {
  const size = Math.random() * 20 + 25;
  const speed = Math.random() * 5 + 5; // Balanced for standard visibility
  const top = `${Math.random() * 80 + 10}%`;

  return {
    id: Math.random().toString(36).substring(2, 9),
    svg: asteroidSvgs[Math.floor(Math.random() * asteroidSvgs.length)]!,
    size,
    speed,
    top,
    spawnOnScreen,
  };
}

interface AsteroidProps {
  data: AsteroidData;
  onExplode: (id: string) => void;
  onMiss: (id: string) => void;
}

function Asteroid({ data, onExplode, onMiss }: AsteroidProps) {
  const [exploded, setExploded] = useState(false);

  return (
    <motion.img
      src={data.svg}
      alt="asteroid"
      onPointerDown={(e) => {
        e.stopPropagation();
        setExploded(true);
        onExplode(data.id);
      }}
      initial={{
        x: data.spawnOnScreen ? `${Math.random() * 70 + 10}vw` : '-20vw',
        rotate: 0,
        opacity: 1,
        scale: 1
      }}
      animate={{
        x: '115vw',
        rotate: 360,
      }}
      exit={{
        scale: exploded ? 2.5 : 1,
        opacity: 0,
        filter: exploded ? "brightness(2) blur(8px)" : "none",
        transition: { duration: 0.3 }
      }}
      transition={{
        x: { duration: data.speed, ease: 'linear' },
        rotate: { duration: data.speed * 1.5, ease: 'linear', repeat: Infinity },
      }}
      onUpdate={(latest) => {
        // Fallback cleanup if it goes off screen without triggering completion
        if (typeof latest.x === 'string' && parseFloat(latest.x) >= 110) {
          onMiss(data.id);
        }
      }}
      className="absolute select-none"
      style={{
        top: data.top,
        width: `${data.size}px`,
        height: `${data.size}px`,
        cursor: 'crosshair',
        pointerEvents: exploded ? 'none' : 'auto',
        zIndex: exploded ? 50 : 10,
      }}
    />
  );
}

interface AsteroidFieldProps {
  onClick?: () => void;
  spawnRate?: number;
  maxActive?: number;
}

export default function AsteroidField({
  onClick,
  spawnRate = 1200,
  maxActive = 15
}: AsteroidFieldProps) {
  const [asteroids, setAsteroids] = useState<AsteroidData[]>([]);

  // Memoized handlers to prevent unnecessary re-renders of the Asteroid children
  const removeAsteroid = useCallback((id: string) => {
    setAsteroids(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleExplode = useCallback((id: string) => {
    if (onClick) onClick();
    // Delay removal slightly to allow exit animation to begin
    setTimeout(() => removeAsteroid(id), 50);
  }, [onClick, removeAsteroid]);

  useEffect(() => {
    // 1. Initial population (instant)
    setAsteroids(Array.from({ length: 5 }, () => getRandomAsteroid(true)));

    // 2. Fixed interval spawning
    const spawnInterval = setInterval(() => {
      setAsteroids((prev) => {
        if (prev.length >= maxActive) return prev;
        return [...prev, getRandomAsteroid(false)];
      });
    }, spawnRate);

    return () => clearInterval(spawnInterval);
  }, [spawnRate, maxActive]);

  return (
    <div className="relative w-full h-full overflow-hidden pointer-events-auto bg-transparent">
      <AnimatePresence mode="popLayout">
        {asteroids.map((asteroid) => (
          <Asteroid
            key={asteroid.id}
            data={asteroid}
            onExplode={handleExplode}
            onMiss={removeAsteroid}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
