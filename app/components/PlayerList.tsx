import React from 'react';
import { useGame } from '../game/gameProvider';
import SpaceManIcon from './SpaceManIcon';
import LoadingDots from './LoadingIcon';

export default function PlayerList() {
  const { players, hostId } = useGame();

  if (!players || Object.keys(players).length === 0) {
    return (
      <div className="flex flex-col h-full w-full items-center">
        <p className="text-gray-500 italic">No players connected yet.</p>
        <LoadingDots />
      </div>
    );
  }

  const myId = sessionStorage.getItem('playerId');
  const sortedPlayers = Object.values(players).sort((first, second) => {
    if (first.id === hostId) return -1;
    if (second.id === hostId) return 1;
    return first.created_at.localeCompare(second.created_at) || first.id.localeCompare(second.id);
  });

  return (
    <div className="flex flex-col h-full w-full gap-4 mt-8 text-white w-full items-center">
      {sortedPlayers.map((player) => (
        <div
          key={player.id}
          className={`flex flex-row border gap-4 p-2 rounded shadow w-full max-w-xl items-center ${player.id === myId ? 'bg-stone-900' : ''}`}
        >
          <SpaceManIcon fill={player.color} size={40} />
          <h3 className="text-lg font-bold">{player.name}</h3>
          <p>Status: {player.alive ? 'Alive' : 'Dead'}</p>
          <p>Role: {player.role}</p>
          <div
            className={`w-4 h-4 rounded-full ml-auto ${player.connected ? 'bg-green-500' : 'bg-red-500'}`}
          ></div>
        </div>
      ))}
    </div>
  );
}
