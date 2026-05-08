'use client';

import React, { useEffect, useState } from "react";
import { useGame } from "../game/gameProvider";

import SpaceBackground from "../components/SpaceBackground";
import PlayerList from "../components/PlayerList";
import LoadingDots from "../components/LoadingIcon";

export default function HostScreen() {
  const [loading, setLoading] = useState(true);
  const [gameId, setGameId] = useState('');
  const [hostName, setHostName] = useState('');
  const [gameCreated, setGameCreated] = useState(false);
  const { players, gameStatus, createGame, startGame } = useGame();

  useEffect(() => {
    // Check if we already have a game in progress
    const storedGameId = sessionStorage.getItem('gameId');
    const storedPlayerId = sessionStorage.getItem('playerId');

    if (storedGameId && storedPlayerId) {
      setGameId(storedGameId);
      setGameCreated(true);
    }
    setLoading(false);
  }, []);

  const handleCreateGame = async () => {
    if (!hostName.trim()) return;

    try {
      setLoading(true);
      const result = await createGame(hostName);
      setGameId(result.gameCode);
      setGameCreated(true);
      sessionStorage.setItem('gameId', result.gameCode);
      sessionStorage.setItem('playerId', result.playerId);
      sessionStorage.setItem('isHost', 'true');
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGameStart = async () => {
    try {
      await startGame();
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game. Please try again.');
    }
  };

  if (!gameCreated) {
    return (
      <div className="w-screen h-screen overflow-hidden font-orbitron">
        <SpaceBackground />
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
            />
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
              onClick={handleCreateGame}
              disabled={loading || !hostName.trim()}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden font-orbitron">
      <SpaceBackground />
      <div className="w-full h-full flex flex-col items-center justify-between p-10">
        <div className="w-full flex flex-col items-center flex-grow">
          <div className="w-full mt-4 items-center flex flex-col">
            <p className="text-green-600 text-xl">Game Code:</p>
            {loading ? <LoadingDots /> : <code className="text-white text-2xl">{gameId}</code>}
          </div>

          <div className="w-full h-[60vh] overflow-y-scroll mt-4 flex flex-col items-start scrollbar-hide">
            <PlayerList isHost={true} />
          </div>
        </div>

        <button
          className="bg-black border-2 border-stone-400 text-white px-4 py-2 rounded-lg w-full max-w-64 hover:bg-stone-950 hover:border-white disabled:opacity-50"
          onClick={handleGameStart}
          disabled={gameStatus === 'started' || !players || Object.keys(players).length < 2}
        >
          {gameStatus === 'started' ? 'Game Started' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
