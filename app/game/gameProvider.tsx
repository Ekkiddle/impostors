'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SupabaseManager, { Player } from './supabaseManager';
import { initSupabaseManager } from './gameManager';

interface GameContextType {
  players: Record<string, Player> | null;
  gameStatus: string;
  supabaseManager: SupabaseManager;
  createGame: (hostName: string) => Promise<{ gameId: string; gameCode: string; playerId: string }>;
  joinGame: (gameId: string, playerName: string) => Promise<{ gameId: string; playerId: string }>;
  startGame: () => Promise<void>;
  updatePlayer: (updates: Partial<Player>) => Promise<void>;
  setPlayerAlive: (playerId: string, alive: boolean) => Promise<void>;
  refreshPlayers: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [players, setPlayers] = useState<Record<string, Player> | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('waiting');

  const [supabaseManager] = useState<SupabaseManager>(() => {
    const sm = new SupabaseManager();
    initSupabaseManager(sm);
    return sm;
  });

  useEffect(() => {
    // This is the "Bridge" we discussed.
    // When Supabase signals a change, React re-fetches data.
    supabaseManager.setOnPlayersUpdate(() => {
      refreshPlayers();
    });

    supabaseManager.setOnGameUpdate((payload: { new?: { status: string } }) => {
      if (payload.new) {
        setGameStatus(payload.new.status);
      }
    });

    return () => {
      supabaseManager.disconnect();
    };
  }, [supabaseManager]);

  const refreshPlayers = async () => {
    if (supabaseManager.gameId) {
      try {
        const playersData: Player[] = await supabaseManager.getPlayers();
        const playersObj: Record<string, Player> = {};
        playersData.forEach(player => {
          playersObj[player.id] = player;
        });
        setPlayers(playersObj);
      } catch (error) {
        console.error('Error refreshing players:', error);
      }
    }
  };

  const createGame = async (hostName: string) => {
    const result = await supabaseManager.createGame(hostName);
    await refreshPlayers();
    return result;
  };

  const joinGame = async (gameId: string, playerName: string) => {
    const result = await supabaseManager.joinGame(gameId, playerName);
    await refreshPlayers();
    return result;
  };

  const startGame = async () => {
    await supabaseManager.assignRoles();
  };

  const updatePlayer = async (updates: Partial<Player>) => {
    await supabaseManager.updatePlayer(updates);
  };

  const setPlayerAlive = async (playerId: string, alive: boolean) => {
    await supabaseManager.setPlayerAlive(playerId, alive);
  };

  return (
    <GameContext.Provider value={{
      players,
      gameStatus,
      supabaseManager,
      createGame,
      joinGame,
      startGame,
      updatePlayer,
      setPlayerAlive,
      refreshPlayers
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
