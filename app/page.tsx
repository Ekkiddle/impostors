'use client'

import React from 'react';
import { useRouter } from 'next/navigation';

import SpaceBackground from './components/SpaceBackground';

export default function Home() {
  const router = useRouter();

  return (
    <div className={`w-screen h-screen overflow-hidden font-orbitron`}>
      <SpaceBackground className='-z-10' />
      <div className="p-10 flex flex-col gap-4 w-full h-full justify-center items-center align-center">
        <h1 className="text-white text-5xl">Impostors</h1>

        <button
          aria-label="Host a new game"
          className="bg-black border-2 border-stone-400 text-white px-4 py-2 rounded-lg w-full max-w-64 hover:bg-stone-950 hover:border-white"
          onClick={() => {
            router.push('/host');
          }}
        >
          Host Game
        </button>

        <button
          aria-label="Join an existing game"
          className="bg-black border-2 border-stone-400 text-white px-4 py-2 rounded-lg w-full max-w-64 hover:bg-stone-950 hover:border-white"
          onClick={() => router.push('/client')}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}
