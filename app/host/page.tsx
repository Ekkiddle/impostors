'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "../game/gameProvider";

import SpaceBackground from "../components/SpaceBackground";

export default function HostScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hostName, setHostName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { createGame, sessionReady, supabaseManager } = useGame();

  useEffect(() => {
    if (!sessionReady) return;

    if (supabaseManager.gameCode && supabaseManager.playerId) {
      router.replace('/game');
      return;
    }
    setLoading(false);
  }, [router, sessionReady, supabaseManager]);

  const handleCreateGame = async () => {
    if (!hostName.trim()) return;

    try {
      setLoading(true);
      setErrorMessage('');
      const result = await createGame(hostName);
      sessionStorage.setItem('gameId', result.gameCode);
      sessionStorage.setItem('playerId', result.playerId);
      sessionStorage.setItem('isHost', 'true');
      router.push('/game');
    } catch (error) {
      console.error('Error creating game:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred while creating the game.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden font-orbitron">
      <SpaceBackground className="-z-10" />
      <div className="w-full h-full flex flex-col items-center justify-center p-10">
        <div className="bg-black/80 border border-stone-400 rounded-lg p-8 max-w-md w-full">
          <h1 className="text-white text-2xl mb-6 text-center">Create Game</h1>
          <input
            type="text"
            placeholder="Enter your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="w-full p-3 mb-4 bg-stone-800 border border-stone-600 rounded text-white placeholder-stone-400"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
            maxLength={15}
          />
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
            onClick={handleCreateGame}
            disabled={loading || !hostName.trim()}
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
          <button
            className="w-full mt-3 bg-black border-2 border-stone-400 text-white px-4 py-2 rounded-lg hover:bg-stone-950 hover:border-white"
            onClick={() => router.push('/')}
          >
            Cancel
          </button>
          {errorMessage && <p className="mt-4 text-center text-red-400">{errorMessage}</p>}
        </div>
      </div>
    </div>
  );
}
