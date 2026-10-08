'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SpaceBackground from '../components/SpaceBackground';
import PlayerList from '../components/PlayerList';
import LoadingDots from '../components/LoadingIcon';
import { useGame } from './gameProvider';

export default function GameLobbyPage() {
  const router = useRouter();
  const { players, gameStatus, isHost, sessionReady, supabaseManager, startGame, leaveGame } = useGame();
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const leaveStarted = useRef(false);

  const leaveToHome = useCallback(async () => {
    if (leaveStarted.current) return;
    leaveStarted.current = true;
    setLeaving(true);
    setErrorMessage('');

    try {
      await leaveGame();
      router.push('/');
    } catch (error) {
      leaveStarted.current = false;
      setLeaving(false);
      setErrorMessage(error instanceof Error ? error.message : 'Could not leave the game.');
    }
  }, [leaveGame, router]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!supabaseManager.playerId || !supabaseManager.gameCode) {
      router.replace('/');
    }
  }, [router, sessionReady, supabaseManager]);

  const handleStartGame = async () => {
    try {
      setStarting(true);
      setErrorMessage('');
      await startGame();
    } catch (error) {
      console.error('Error starting game:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Could not start the game.');
    } finally {
      setStarting(false);
    }
  };

  const playerCount = players ? Object.keys(players).length : 0;
  const gameCode = supabaseManager.gameCode;

  return (
    <div className="relative w-screen h-screen overflow-hidden font-orbitron">
      <SpaceBackground className="-z-10" />
      <main className="relative z-10 flex h-full w-full flex-col items-center p-6 pt-14 sm:p-10">
        <header className="flex w-full flex-col items-center">
          <p className="text-green-500 text-xl">Game Code</p>
          {sessionReady && gameCode
            ? <code className="text-white text-3xl font-bold tracking-widest">{gameCode}</code>
            : <LoadingDots />}
        </header>

        <section className="mt-6 flex w-full flex-1 flex-col items-center overflow-y-auto scrollbar-hide">
          <h1 className="text-white text-xl">Players ({playerCount})</h1>
          <div className="w-full">
            <PlayerList />
          </div>
        </section>

        <div className="flex w-full max-w-xl flex-col items-center gap-3 pt-4">
          {isHost && (
            <button
              className="w-full rounded-lg border-2 border-stone-400 bg-black px-4 py-3 font-semibold text-white hover:border-white hover:bg-stone-950 disabled:opacity-50"
              onClick={handleStartGame}
              disabled={starting || gameStatus !== 'waiting' || playerCount < 4}
            >
              {gameStatus === 'started'
                ? 'Game Started'
                : starting
                  ? 'Starting...'
                  : playerCount < 4
                    ? `Start Game (4 players required)`
                    : 'Start Game'}
            </button>
          )}
          {!isHost && gameStatus === 'waiting' && (
            <p className="text-white text-center">Waiting for the host to start the game</p>
          )}
          {gameStatus === 'started' && (
            <p className="text-white text-center">The game has started.</p>
          )}
          {errorMessage && <p className="text-center text-red-400">{errorMessage}</p>}
          <button
            className="w-full max-w-64 rounded-lg border-2 border-stone-400 bg-black px-4 py-2 text-white hover:border-white hover:bg-stone-950 disabled:opacity-50"
            onClick={leaveToHome}
            disabled={leaving}
          >
            {leaving ? 'Leaving...' : isHost ? 'Cancel Game' : 'Leave Game'}
          </button>
        </div>
      </main>
    </div>
  );
}
