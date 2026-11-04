'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SpaceManIcon from '@/app/components/SpaceManIcon';
import { useGame } from '../gameProvider';

export default function RolePage() {
  const router = useRouter();
  const { players, sessionReady, supabaseManager, leaveGame } = useGame();
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const leaveErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPlayer = supabaseManager.playerId ? players?.[supabaseManager.playerId] : null;
  const role = currentPlayer?.role;

  useEffect(() => {
    if (sessionReady && (!supabaseManager.playerId || !supabaseManager.gameId)) {
      router.replace('/');
    }
  }, [router, sessionReady, supabaseManager]);

  useEffect(() => () => {
    if (leaveErrorTimeout.current) clearTimeout(leaveErrorTimeout.current);
  }, []);

  const huddleRows = useMemo(() => {
    if (!players || !currentPlayer) return [];

    const huddlePlayers = Object.values(players)
      .filter(player => role === 'impostor' ? player.role === 'impostor' : true)
      .filter(player => player.id !== currentPlayer.id)
      .sort((first, second) => first.created_at.localeCompare(second.created_at));

    const rows = [];
    let offset = 0;
    let rowSize = 2;
    let maxRowSize = 5;
    while (offset < huddlePlayers.length) {
      rows.push(huddlePlayers.slice(offset, offset + rowSize));
      offset += rowSize;
      rowSize = Math.min(rowSize + 1, maxRowSize);
    }
    return rows.reverse();
  }, [currentPlayer, players, role]);

  const handleQuit = async () => {
    if (leaving) return;
    setLeaving(true);
    setLeaveError('');
    try {
      await leaveGame();
      router.replace('/');
    } catch (error) {
      console.error('Could not quit game from role reveal:', error);
      setLeaveError(error instanceof Error ? error.message : 'Could not quit the game.');
      if (leaveErrorTimeout.current) clearTimeout(leaveErrorTimeout.current);
      leaveErrorTimeout.current = setTimeout(() => setLeaveError(''), 2000);
      setLeaving(false);
    }
  };

  const hasRole = role === 'crewmate' || role === 'impostor';
  const characters = role === 'impostor'
    ? Object.values(players ?? {}).filter(player => player.role === 'impostor')
    : Object.values(players ?? {});
  const otherImpostors = role === 'impostor'
    ? characters.filter(player => player.id !== currentPlayer?.id)
    : [];

  return (
    <main className={`relative flex min-h-[100dvh] w-full flex-col items-center overflow-hidden ${role === 'impostor' ? 'bg-red-950' : 'bg-black'} px-4 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))] font-orbitron text-white`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-[5%] h-[85%] 
          ${role === 'impostor' ? 'bg-[radial-gradient(ellipse_at_50%_45%,rgba(127,29,29,0.35)_0%,rgba(69,10,10,0.2)_34%,transparent_72%)]'
            : 'bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,246,205,0.25)_0%,rgba(255,236,170,0.12)_34%,transparent_72%)]'}`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_24%,rgba(0,0,0,0.8)_100%)]"
      />

      <button
        type="button"
        aria-label={leaving ? 'Quitting game' : 'Quit game'}
        onClick={handleQuit}
        disabled={leaving}
        className="absolute left-0 top-0 z-20 m-2 rounded-lg border-2 border-stone-400 bg-black px-4 py-2 text-xs text-white transition hover:border-white hover:bg-stone-950 disabled:opacity-50"
      >
        {leaving ? 'Quitting...' : 'Quit Game'}
      </button>

      <h1 className="relative z-10 mt-8 text-center text-2xl font-bold tracking-wide sm:text-4xl">
        {hasRole
          ? `You are a ${role === 'impostor' ? 'Impostor' : 'Crewmate'}`
          : 'Discovering your role...'}
      </h1>

      <section
        aria-label={role === 'impostor' ? 'Impostor huddle' : 'Crew huddle'}
        className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden py-3"
      >
        {currentPlayer && hasRole ? (
          <div className="flex max-h-full flex-col items-center justify-end">
            {huddleRows.map((row, rowIndex) => (
              <div
                key={`huddle-row-${rowIndex}`}
                className="flex items-end justify-center"
                style={{
                  zIndex: rowIndex + 1,
                  marginBottom: `${-50 + rowIndex * 15}px`,
                }}
              >
                {row.map(player => (
                  <div
                    key={player.id}
                    className="-mx-0.5 flex h-[4.5rem] w-[4.25rem] items-end justify-center sm:h-24 sm:w-20"
                    title={player.name}
                  >
                    <SpaceManIcon size={76} fill={player.color} darken={0.6 - rowIndex * 0.1} />
                  </div>
                ))}
              </div>
            ))}
            <div className="relative z-50 -mt-7 flex h-28 w-24 items-end justify-center sm:h-36 sm:w-32">
              <SpaceManIcon size={112} fill={currentPlayer.color} />
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-stone-300">
            {sessionReady ? 'Waiting for your player role to load...' : 'Loading game...'}
          </p>
        )}
      </section>

      {role === 'impostor' && hasRole && (
        <section className="relative z-10 mb-3 w-full max-w-md rounded-xl border border-red-900/70 bg-black/70 p-3">
          <h2 className="mb-2 text-center text-sm font-bold uppercase tracking-widest text-red-300">
            Your fellow impostors
          </h2>
          <ul
            aria-label="Other impostors"
            className="max-h-24 space-y-1 overflow-y-auto text-center text-sm text-white"
          >
            {otherImpostors.length > 0
              ? otherImpostors.map(player => <li key={player.id}>{player.name}</li>)
              : <li>You are the only impostor.</li>}
          </ul>
        </section>
      )}

      <div className="relative z-10 flex w-full max-w-md flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => router.push('/game/play')}
          disabled={!hasRole || leaving}
          className="w-full rounded-lg border-2 border-white bg-white px-4 py-3 font-bold text-black transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
      {leaveError && (
        <p
          role="alert"
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border border-red-800 bg-black/95 px-4 py-2 text-center text-sm text-red-300 shadow-lg"
        >
          {leaveError}
        </p>
      )}
    </main>
  );
}