'use client';

import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Player, Game, MapTask, PlayerTask, PlayerMapTask } from '../types/databaseTypes';
import SupabaseManager from './supabaseManager';
import { TASK_DEFINITIONS } from '../types/tasks';
import GameTaskManager from './gameTaskManager';

interface GameContextType {
  players: Record<string, Player> | null;
  currentTasks: PlayerMapTask[] | null;
  taskProgress: ReturnType<GameTaskManager['getProgress']>;
  mapTasks: Record<string, MapTask> | null;
  gameStatus: string;
  hostId: string | null;
  isHost: boolean;
  sessionReady: boolean;
  supabaseManager: SupabaseManager;
  completedTasksPercentage: number;
  createGame: (hostName: string) => Promise<{ gameId: string; gameCode: string; playerId: string }>;
  deleteGame: (gameId: string) => Promise<void>;
  joinGame: (gameId: string, playerName: string) => Promise<{ gameId: string; gameCode: string; playerId: string }>;
  leaveGame: () => Promise<void>;
  startGame: () => Promise<void>;
  updatePlayer: (updates: Partial<Player>) => Promise<void>;
  setPlayerAlive: (playerId: string, alive: boolean) => Promise<void>;
  refreshPlayers: () => Promise<void>;
  updateTaskStatus: (playerId: string, taskKey: string, status: 'not_started' | 'in_progress' | 'completed') => Promise<void>;
  getScanComponent: (taskKey: string) => Promise<TaskLaunch | null>;
  completeTask: (task: PlayerMapTask) => Promise<void>;
}

export interface TaskLaunch {
  component: React.ComponentType<any>;
  task: PlayerMapTask | null;
  subTaskType: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [players, setPlayers] = useState<Record<string, Player> | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [mapTasks, setMapTasks] = useState<Record<string, MapTask> | null>(null);
  const [currentTasks, setCurrentTasks] = useState<PlayerMapTask[] | null>(null);
  const [completedTasksPercentage, setCompletedTasksPercentage] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [hostId, setHostId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const mapTasksRef = useRef<Record<string, MapTask> | null>(null);
  const [gameTaskManager] = useState(() => new GameTaskManager());

  const [supabaseManager] = useState<SupabaseManager>(() => {
    return new SupabaseManager();
  });

  useEffect(() => {
    supabaseManager.setOnPlayersUpdate(() => {
      void refreshPlayers().catch(error => {
        console.error('Error refreshing players from Supabase:', error);
      });
    });

    supabaseManager.setOnPlayersTasksUpdate(async () => {
      try {
        const playerId = supabaseManager.playerId;
        if (playerId && mapTasksRef.current) {
          await getPlayerTasks(playerId, mapTasksRef.current);
        }
        setCompletedTasksPercentage(await getCompletedTasksPercentage());
      } catch (error) {
        console.error('Error refreshing task progress from Supabase:', error);
      }
    });

    supabaseManager.setOnGameUpdate((game: Game) => {
      if (gameStatus == 'waiting' && game.status != gameStatus) {
        void (async () => {
          const loadedMapTasks = await loadMapTasks(game.map_id);
          if (supabaseManager.playerId && loadedMapTasks) {
            await getPlayerTasks(supabaseManager.playerId, loadedMapTasks);
          }
        })().catch(error => {
          console.error('Error loading tasks after game start:', error);
        });
      }
      setGameStatus(game.status);
      setHostId(game.host_id);
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
          const loadedMapTasks = await loadMapTasks(game.map_id);
          setCompletedTasksPercentage(await getCompletedTasksPercentage());
          if (loadedMapTasks) await getPlayerTasks(storedPlayerId, loadedMapTasks);
        }
        await refreshPlayers();
      })()
        .catch(error => {
          ;
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
      mapTasksRef.current = null;
      setCurrentTasks(null);
      return null;
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
    mapTasksRef.current = mapTasksObj;
    return mapTasksObj;
  };

  const getCompletedTasksPercentage = async () => {
    if (!supabaseManager.gameId) {
      console.warn('[Completed tasks] Cannot load completed tasks percentage', {
        hasActiveGame: Boolean(supabaseManager.gameId),
      });
      return 0;
    }

    const completedTasksCount = await supabaseManager.getCompletedTasksValue();
    const totalTasksCount = await supabaseManager.getTotalTasksValue();
    const percentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
    console.info('[Completed tasks] Calculated completed tasks percentage', {
      completedTasksCount,
      totalTasksCount,
      percentage,
    });
    return percentage;
  }

  const getPlayerTasks = async (
    playerId: string,
    mapTasksData: Record<string, MapTask> | null = mapTasksRef.current
  ) => {
    if (!supabaseManager.gameId) {
      console.warn('[Player tasks] Cannot load player tasks', {
        hasActiveGame: Boolean(supabaseManager.gameId),
        playerId,
      });
      return null;
    }
    if (!mapTasksData) {
      setCurrentTasks([]);
      return [];
    }

    const playerTasksData: PlayerTask[] = await supabaseManager.getPlayerTasks(playerId);
    const mappedTasks = gameTaskManager.buildPlayerMapTasks(playerTasksData, mapTasksData);
    const playerMapTasks = gameTaskManager.updateReadiness(mappedTasks);
    const readinessChanges = playerMapTasks.filter((task, index) =>
      task.ready !== mappedTasks[index]?.ready
    );
    setCurrentTasks(playerMapTasks);
    if (readinessChanges.length > 0) {
      await supabaseManager.updateTaskReadiness(
        playerId,
        readinessChanges.map(({ id, ready }) => ({ id, ready }))
      );
    }
    return playerMapTasks;
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
    setMapTasks(null);
    mapTasksRef.current = null;
    setCurrentTasks(null);
  };

  const startGame = async () => {
    await supabaseManager.assignRoles();
    const game = await supabaseManager.getGame();
    if (game) {
      setGameStatus(game.status);
      const loadedMapTasks = await loadMapTasks(game.map_id);
      if (supabaseManager.playerId && loadedMapTasks) {
        await getPlayerTasks(supabaseManager.playerId, loadedMapTasks);
      }
    }
    await refreshPlayers();
  };

  const updatePlayer = async (updates: Partial<Player>) => {
    await supabaseManager.updatePlayer(updates);
  };

  const setPlayerAlive = async (playerId: string, alive: boolean) => {
    await supabaseManager.setPlayerAlive(playerId, alive);
  };

  const updateTaskStatus = async (playerId: string, taskRowId: string, status: 'not_started' | 'in_progress' | 'completed') => {
    await supabaseManager.updateTaskStatus(playerId, taskRowId, status);
  }

  const completeTask = async (task: PlayerMapTask) => {
    const playerId = supabaseManager.playerId;
    if (!playerId) throw new Error('Cannot complete a task before joining a game.');

    await supabaseManager.updateTaskStatus(playerId, task.id, 'completed');
    const tasks = currentTasks ?? [];
    const completedTasks = tasks.map(item =>
      item.id === task.id ? { ...item, completed: true, ready: false } : item
    );
    const updatedTasks = gameTaskManager.updateReadiness(completedTasks);
    setCurrentTasks(updatedTasks);
    await supabaseManager.updateTaskReadiness(
      playerId,
      updatedTasks
        .filter((item, index) => item.ready !== completedTasks[index]?.ready)
        .map(({ id, ready }) => ({ id, ready }))
    );
    setCompletedTasksPercentage(await getCompletedTasksPercentage());
  };

  const getScanComponent = async (taskKey: string): Promise<TaskLaunch | null> => {
    const task = mapTasks?.[taskKey];
    const taskDefinition = TASK_DEFINITIONS[task?.task_type ?? ''];
    console.info('[QR task] Resolving scanned code', {
      taskId: taskKey,
      mapTaskFound: Boolean(task),
      taskType: task?.task_type ?? null,
      playerRole: currentPlayer?.role ?? null,
    });

    if (task && taskDefinition?.task_component) {
      const assignedTask = currentTasks
        ? gameTaskManager.getReadyTask(currentTasks, taskKey)
        : null;
      const isImpostor = currentPlayer?.role === 'impostor';
      const isAssigned = isImpostor || (
        assignedTask !== null && await supabaseManager.validatePlayerTask(taskKey)
      );
      console.info('[QR task] Assignment check', {
        taskId: taskKey,
        isAssigned,
        taskType: task.task_type,
      });
      if (isAssigned) {
        return {
          component: taskDefinition.task_component,
          task: assignedTask,
          subTaskType: assignedTask?.sub_task_type ?? task.sub_task_type ?? null,
        };
      }
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
      currentTasks,
      taskProgress: currentTasks ? gameTaskManager.getProgress(currentTasks) : [],
      mapTasks,
      gameStatus,
      hostId,
      isHost: Boolean(supabaseManager.playerId && hostId === supabaseManager.playerId),
      sessionReady,
      supabaseManager,
      completedTasksPercentage,
      createGame,
      deleteGame,
      joinGame,
      leaveGame,
      startGame,
      updatePlayer,
      setPlayerAlive,
      refreshPlayers,
      updateTaskStatus,
      getScanComponent,
      completeTask
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
