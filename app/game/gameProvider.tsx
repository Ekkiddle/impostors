'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import SupabaseManager, { type Game, type Player, type MapTask } from './supabaseManager';

interface GameContextType {
  players: Record<string, Player> | null;
  mapTasks: Record<string, MapTask> | null;
  gameStatus: string;
  hostId: string | null;
  isHost: boolean;
  sessionReady: boolean;
  supabaseManager: SupabaseManager;
  createGame: (hostName: string) => Promise<{ gameId: string; gameCode: string; playerId: string }>;
  deleteGame: (gameId: string) => Promise<void>;
  joinGame: (gameId: string, playerName: string) => Promise<{ gameId: string; gameCode: string; playerId: string }>;
  leaveGame: () => Promise<void>;
  startGame: () => Promise<void>;
  updatePlayer: (updates: Partial<Player>) => Promise<void>;
  setPlayerAlive: (playerId: string, alive: boolean) => Promise<void>;
  refreshPlayers: () => Promise<void>;
  loadMapTasks: (map_id: string | null) => Promise<void>;
  updateTaskStatus: (playerId: string, taskKey: string, status: 'not_started' | 'in_progress' | 'completed') => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [players, setPlayers] = useState<Record<string, Player> | null>(null);
  const [mapTasks, setMapTasks] = useState<Record<string, MapTask> | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [hostId, setHostId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [supabaseManager] = useState<SupabaseManager>(() => {
    return new SupabaseManager();
  });

  useEffect(() => {
    supabaseManager.setOnPlayersUpdate(() => {
      void refreshPlayers().catch(error => {
        console.error('Error refreshing players from Supabase:', error);
      });
    });

    supabaseManager.setOnGameUpdate((game: Game) => {
      setGameStatus(game.status);
      setHostId(game.host_id);
      loadMapTasks(game.map_id);
    });

    const storedGameCode = sessionStorage.getItem('gameId');
    const storedPlayerId = sessionStorage.getItem('playerId');
    if (storedGameCode && storedPlayerId) {
      void (async () => {
        await supabaseManager.restoreSession(storedGameCode, storedPlayerId);
        const game = await supabaseManager.getGame();
        if (game) {
          setGameStatus(game.status);
          setHostId(game.host_id);
          loadMapTasks(game.map_id);
        }
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

  const loadMapTasks = async (map_id: string | null) => {
    if (supabaseManager.gameId && map_id) {
      const mapTasksData: MapTask[] = await supabaseManager.getMapTasks(map_id);
      const mapTasksObj: Record<string, MapTask> = {};
      mapTasksData.forEach(task => {
        mapTasksObj[task.task_id] = task;
      });
      setMapTasks(mapTasksObj);
    }
  };

  const createGame = async (hostName: string) => {
    const result = await supabaseManager.createGame(hostName);
    setHostId(supabaseManager.hostId);
    await refreshPlayers();
    return result;
  };

  const deleteGame = async (gameId: string) => {
    const result = await supabaseManager.deleteGame(gameId);
    await refreshPlayers();
    return result;
  };

  const joinGame = async (gameId: string, playerName: string) => {
    const result = await supabaseManager.joinGame(gameId, playerName);
    setHostId(supabaseManager.hostId);
    await refreshPlayers();
    return result;
  };

  const leaveGame = async () => {
    await supabaseManager.leaveGame();
    sessionStorage.removeItem('gameId');
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('isHost');
    setPlayers(null);
    setHostId(null);
    setGameStatus('waiting');
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

  const updateTaskStatus = async (playerId: string, taskKey: string, status: 'not_started' | 'in_progress' | 'completed') => {
    await supabaseManager.updateTaskStatus(playerId, taskKey, status);
  }

  return (
    <GameContext.Provider value={{
      players,
      mapTasks,
      gameStatus,
      hostId,
      isHost: Boolean(supabaseManager.playerId && hostId === supabaseManager.playerId),
      sessionReady,
      supabaseManager,
      createGame,
      deleteGame,
      joinGame,
      leaveGame,
      startGame,
      updatePlayer,
      setPlayerAlive,
      refreshPlayers,
      updateTaskStatus,
      loadMapTasks,
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
