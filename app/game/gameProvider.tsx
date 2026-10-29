'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import SupabaseManager, { type Game, type Player, type MapTask } from './supabaseManager';
import { TASK_DEFINITIONS } from '../types/tasks';

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
  getScanComponent: (taskKey: string) => Promise<React.ComponentType<any> | null>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [players, setPlayers] = useState<Record<string, Player> | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
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
      void loadMapTasks(game.map_id).catch(error => {
        console.error('Error loading map tasks after game update:', error);
      });
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
          await loadMapTasks(game.map_id).catch(error => {
            console.error('Error loading map tasks while restoring game:', error);
          });
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
      setCurrentPlayer(
        supabaseManager.playerId ? playersObj[supabaseManager.playerId] ?? null : null
      );
    }
  };

  const loadMapTasks = async (map_id: string | null) => {
    if (!supabaseManager.gameId || !map_id) {
      console.warn('[Map tasks] Cannot load map tasks', {
        hasActiveGame: Boolean(supabaseManager.gameId),
        mapId: map_id,
      });
      setMapTasks(null);
      return;
    }

    console.info('[Map tasks] Loading tasks for map', map_id);
    const mapTasksData: MapTask[] = await supabaseManager.getMapTasks(map_id);
    const mapTasksObj: Record<string, MapTask> = {};
    mapTasksData.forEach(task => {
      mapTasksObj[task.task_id] = task;
    });
    const tasksWithoutDefinitions = mapTasksData.filter(
      task => !TASK_DEFINITIONS[task.task_type]
    );
    console.info('[Map tasks] Loaded map tasks', {
      mapId: map_id,
      count: mapTasksData.length,
      tasks: mapTasksData,
      tasksWithoutDefinitions: tasksWithoutDefinitions.map(task => ({
        taskId: task.task_id,
        taskType: task.task_type,
      })),
    });
    setMapTasks(mapTasksObj);
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
    setCurrentPlayer(null);
    setHostId(null);
    setGameStatus('waiting');
  };

  const startGame = async () => {
    await supabaseManager.assignRoles();
    const game = await supabaseManager.getGame();
    if (game) {
      setGameStatus(game.status);
      await loadMapTasks(game.map_id);
    }
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

  const getScanComponent = async (taskKey: string): Promise<React.ComponentType<any> | null> => {
    const task = mapTasks?.[taskKey];
    const taskDefinition = TASK_DEFINITIONS[task?.task_type ?? ''];
    console.info('[QR task] Resolving scanned code', {
      taskId: taskKey,
      mapTaskFound: Boolean(task),
      taskType: task?.task_type ?? null,
      playerRole: currentPlayer?.role ?? null,
    });

    if (task && taskDefinition?.task_component) {
      const isAssigned = currentPlayer?.role == 'impostor' || await supabaseManager.validatePlayerTask(taskKey);
      console.info('[QR task] Assignment check', {
        taskId: taskKey,
        isAssigned,
        taskType: task.task_type,
      });
      if (isAssigned) return taskDefinition.task_component;
    }

    if (currentPlayer?.role === 'impostor') {
      const playerToKill = players ? Object.values(players).find(p => p.id === taskKey) : null;
      if (playerToKill && playerToKill.alive) {
        console.info('[QR task] Scanned code matches a living player', {
          playerId: playerToKill.id,
        });
      }
    }

    console.warn('[QR task] No playable task found for scanned code', {
      taskId: taskKey,
      mapTaskFound: Boolean(task),
      hasTaskComponent: Boolean(taskDefinition?.task_component),
      playerRole: currentPlayer?.role ?? null,
    });
    return null;
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
      getScanComponent
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
