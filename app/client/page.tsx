'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from '../game/gameProvider';

import SpaceBackground from '../components/SpaceBackground';
import PlayerList from '../components/PlayerList';

export default function Lobby() {
  const [joined, setJoined] = useState(false);
  const [gameId, setGameId] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { joinGame } = useGame();

  useEffect(() => {
    // Check if we already joined a game
    const storedGameId = sessionStorage.getItem('gameId');
    const storedPlayerId = sessionStorage.getItem('playerId');

    if (storedGameId && storedPlayerId) {
      setGameId(storedGameId);
      setJoined(true);
    }
  }, []);

  const handleJoinClick = async () => {
    if (!gameId.trim() || !name.trim()) return;

    try {
      setLoading(true);
      setErrorMsg('');
      const result = await joinGame(gameId.trim().toUpperCase(), name.trim());
      setJoined(true);
      sessionStorage.setItem('gameId', result.gameId);
      sessionStorage.setItem('playerId', result.playerId);
      sessionStorage.setItem('isHost', 'false');
    } catch (error) {
      console.error('Error joining game:', error);
      setErrorMsg('Failed to join game. Please check the game code and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!joined) {
    return (
      <div className="w-screen h-screen overflow-hidden font-orbitron">
        <SpaceBackground className='-z-10' />
        <div className='w-full h-full flex flex-col justify-center items-center gap-y-4 p-10'>
          <div className="flex flex-col items-end gap-y-2">
            <div className="flex flex-row items-center gap-x-2">
              <label className="text-white" htmlFor="gameId">Game Code:</label>
              <input
                type="text"
                id="gameId"
                name="gameId"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
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
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={15}
                size={10}
                className="border-2 rounded-md text-white bg-black px-2"
              />
            </div>
          </div>
          <button
            className="bg-black border-2 border-stone-400 text-white px-4 py-2 rounded-lg w-full max-w-64 hover:bg-stone-950 hover:border-white"
            onClick={handleJoinClick}
          >
            Join Game
          </button>
          {errorMsg && (
            <p className="text-red-500 mt-2 font-semibold">{errorMsg}</p>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div className="w-screen h-screen overflow-hidden font-orbitron">
        <SpaceBackground className='-z-10' />
        <div className='w-full h-full flex flex-col items-center justify-between p-10'>
          <div className='w-full flex flex-col items-center'>
            <div className="w-full mt-4 items-center flex flex-col">
              <p className="text-green-600 text-xl">Players:</p>
            </div>
            <div className="w-full max-h-[60vh] overflow-y-scroll mt-4 scrollbar-hide">
              <PlayerList isHost={false} />
            </div>
          </div>
          <p className='text-white text-lg mb-10'>Waiting for host to start the game</p>
        </div>
      </div>
    );
  }
}
