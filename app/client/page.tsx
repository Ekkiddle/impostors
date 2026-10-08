'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '../game/gameProvider';

import SpaceBackground from '../components/SpaceBackground';

export default function JoinGamePage() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { joinGame, sessionReady, supabaseManager } = useGame();

  useEffect(() => {
    if (sessionReady && supabaseManager.gameId && supabaseManager.playerId) {
      router.replace('/game');
    }
  }, [router, sessionReady, supabaseManager]);

  const handleJoinClick = async () => {
    if (!gameCode.trim() || !name.trim()) return;

    try {
      setLoading(true);
      setErrorMsg('');
      const result = await joinGame(gameCode.trim().toUpperCase(), name.trim());
      sessionStorage.setItem('gameId', result.gameCode);
      sessionStorage.setItem('playerId', result.playerId);
      sessionStorage.setItem('isHost', 'false');
      router.push('/game');
    } catch (error) {
      console.error('Error joining game:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Could not join the game.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden font-orbitron">
      <SpaceBackground className="-z-10" />
      <div className="w-full h-full flex flex-col justify-center items-center gap-y-4 p-10">
        <div className="flex flex-col items-end gap-y-2">
          <div className="flex flex-row items-center gap-x-2">
            <label className="text-white" htmlFor="gameCode">Game Code:</label>
            <input
              type="text"
              id="gameCode"
              name="gameCode"
              value={gameCode}
              onChange={(event) => setGameCode(event.target.value.toUpperCase())}
              required
              minLength={6}
              maxLength={6}
              size={10}
              className="border-2 rounded-md text-white bg-black px-2"
            />
          </div>
          <div className="flex flex-row items-center gap-x-2">
            <label className="text-white" htmlFor="name">Username:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={15}
              size={10}
              className="border-2 rounded-md text-white bg-black px-2"
              onKeyDown={(event) => event.key === 'Enter' && handleJoinClick()}
            />
          </div>
        </div>
        <button
          className="bg-black border-2 border-stone-400 text-white px-4 py-2 rounded-lg w-full max-w-64 hover:bg-stone-950 hover:border-white disabled:opacity-50"
          onClick={handleJoinClick}
          disabled={loading || !sessionReady || gameCode.trim().length !== 6 || !name.trim()}
        >
          {loading ? 'Joining...' : 'Join Game'}
        </button>
        <button
          className="bg-black border-2 border-stone-400 text-white px-4 py-2 rounded-lg w-full max-w-64 hover:bg-stone-950 hover:border-white"
          onClick={() => router.push('/')}
        >
          Cancel
        </button>
        {errorMsg && <p className="text-red-500 mt-2 font-semibold">{errorMsg}</p>}
      </div>
    </div>
  );
}
