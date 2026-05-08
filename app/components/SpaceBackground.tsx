'use client';

import React, { useEffect, useState } from "react";

interface Star {
  id: string;
  size: number;
  top: number;
  left: number;
  speed: number;
  delay: number;
}

export default function SpaceBackground({ className }: { className?: string }) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // We use a constant density so it looks the same on mobile and desktop
    const width = window.innerWidth;
    const height = window.innerHeight;
    const numStars = Math.floor((width * height) / 6000);

    const generatedStars: Star[] = Array.from({ length: numStars }, () => {
      const speed = Math.random() * 30 + 20; // 20-50s for a slow drift
      return {
        id: Math.random().toString(36).substring(2, 9),
        size: Math.random() * 3 + 1, // 1-3px looks more like stars
        top: Math.random() * 100,
        left: Math.random() * 100,
        speed,
        delay: -Math.random() * speed, // Start mid-way through
      };
    });

    setStars(generatedStars);
  }, []);

  return (
    <div className={`absolute top-0 left-0 w-full h-full overflow-hidden bg-black ${className}`}>
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white opacity-70"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `driftRight ${star.speed}s linear infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* Use standard React pattern instead of <style jsx> */}
      <style dangerouslySetInnerHTML={{
        __html: `
      @keyframes driftRight {
        from { transform: translateX(-110vw); }
        to { transform: translateX(110vw); }
      }
    `}} />
    </div>
  );

}
