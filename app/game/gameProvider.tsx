'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import SupabaseManager, { type Game, type Player } from './supabaseManager';
import { initSupabaseManager } from './gameManager';

interface GameContextType {
  players: Record<string, Player> | null;
  gameStatus: string;
  sessionReady: boolean;
  supabaseManager: SupabaseManager;
  createGame: (hostName: string) => Promise<{ gameId: string; gameCode: string; playerId: string }>;
  joinGame: (gameId: string, playerName: string) => Promise<{ gameId: string; gameCode: string; playerId: string }>;
  startGame: () => Promise<void>;
  updatePlayer: (updates: Partial<Player>) => Promise<void>;
  setPlayerAlive: (playerId: string, alive: boolean) => Promise<void>;
  refreshPlayers: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [players, setPlayers] = useState<Record<string, Player> | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [sessionReady, setSessionReady] = useState(false);

  const [supabaseManager] = useState<SupabaseManager>(() => {
    const sm = new SupabaseManager();
    initSupabaseManager(sm);
    return sm;
  });

  useEffect(() => {
    supabaseManager.setOnPlayersUpdate(() => {
      void refreshPlayers().catch(error => {
        console.error('Error refreshing players from Supabase:', error);
      });
    });

    supabaseManager.setOnGameUpdate((game: Game) => {
      setGameStatus(game.status);
    });

    const storedGameCode = sessionStorage.getItem('gameId');
    const storedPlayerId = sessionStorage.getItem('playerId');
    if (storedGameCode && storedPlayerId) {
      void (async () => {
        await supabaseManager.restoreSession(storedGameCode, storedPlayerId);
        const game = await supabaseManager.getGame();
        if (game) setGameStatus(game.status);
        await refreshPlayers();
      })()
        .catch(error => {
          console.error('Error restoring game session:', error);
          sessionStorage.removeItem('gameId');
          sessionStorage.removeItem('playerId');
          sessionStorage.removeItem('isHost');
        })
        .finally(() => setSessionReady(true));
    } else {
      setSessionReady(true);
    }

    return () => {
      supabaseManager.disconnect();
    };
  }, [supabaseManager]);

  const refreshPlayers = async () => {
    if (supabaseManager.gameId) {
      const playersData: Player[] = await supabaseManager.getPlayers();
      const playersObj: Record<string, Player> = {};
      playersData.forEach(player => {
        playersObj[player.id] = player;
      });
      setPlayers(playersObj);
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
    const game = await supabaseManager.getGame();
    if (game) setGameStatus(game.status);
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
      sessionReady,
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
