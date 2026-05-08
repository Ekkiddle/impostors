'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AsteroidData {
  id: string;
  svg: string;
  size: number;
  speed: number;
  rotationSpeed: number;
  top: string;
  delay: number;
  spawnOnScreen: boolean;
}

const asteroidSvgs = [
  '/asteroid1.svg',
  '/asteroid2.svg',
  '/asteroid3.svg',
  '/asteroid4.svg'
];

function getRandomAsteroid(spawnOnScreen = false): AsteroidData {
  const size = Math.random() * 20 + 30;
  const speed = Math.random() * 8 + 6;
  const rotationSpeed = (Math.random() - 0.5) * 100;
  const top = `${Math.random() * 85 + 5}%`;

  return {
    id: Math.random().toString(36).substring(2, 9),
    svg: asteroidSvgs[Math.floor(Math.random() * asteroidSvgs.length)]!,
    size,
    speed,
    rotationSpeed,
    top,
    delay: 0,
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
        x: data.spawnOnScreen ? `${Math.random() * 80 + 10}vw` : '-15vw',
        rotate: 0,
        opacity: 0,
      }}
      animate={{
        x: '115vw',
        rotate: 360,
        opacity: 1,
      }}
      exit={{
        scale: exploded ? 2.5 : 1,
        opacity: 0,
        filter: exploded ? "brightness(2) blur(4px)" : "none"
      }}
      transition={{
        x: { duration: data.speed, ease: 'linear' },
        rotate: { duration: data.speed * 2, ease: 'linear', repeat: Infinity },
        opacity: { duration: 0.3 }
      }}
      onAnimationComplete={(definition) => {
        // definition check for Framer Motion completion
        if (typeof definition === 'object' && 'x' in definition && definition.x === '115vw') {
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
  spawnRate = 800,
  maxActive = 20
}: AsteroidFieldProps) {
  const [asteroids, setAsteroids] = useState<AsteroidData[]>([]);

  // Initial populate & Interval Management
  useEffect(() => {
    // Initial burst on component mount
    const initial = Array.from({ length: 6 }, () => getRandomAsteroid(true));
    setAsteroids(initial);

    const spawnInterval = setInterval(() => {
      setAsteroids((prev) => {
        // Enforce the maxActive constraint
        if (prev.length >= maxActive) return prev;
        return [...prev, getRandomAsteroid(false)];
      });
    }, spawnRate);

    return () => clearInterval(spawnInterval);
  }, [spawnRate, maxActive]); // Dependency array ensures interval updates if props change

  const handleExplode = (id: string) => {
    if (onClick) onClick();
    // Filter out the specific asteroid immediately
    setAsteroids(prev => prev.filter(a => a.id !== id));
  };

  const handleMiss = (id: string) => {
    setAsteroids(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="relative w-full h-full overflow-hidden pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {asteroids.map((asteroid) => (
          <Asteroid
            key={asteroid.id}
            data={asteroid}
            onExplode={handleExplode}
            onMiss={handleMiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
