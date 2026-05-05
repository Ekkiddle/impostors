// Storage for host and client game architecture

import { createContext, useContext, useState, useEffect } from 'react';
import SupabaseManager from './supabaseManager';
import { initSupabaseManager } from './gameManager';

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [players, setPlayers] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [supabaseManager] = useState(() => {
    const sm = new SupabaseManager();
    initSupabaseManager(sm);
    return sm;
  });

  useEffect(() => {
    // Setup callbacks for real-time updates
    supabaseManager.setOnPlayersUpdate((payload) => {
      console.log('Players update:', payload);
      // Refresh players list
      refreshPlayers();
    });

    supabaseManager.setOnGameUpdate((payload) => {
      console.log('Game update:', payload);
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
        const playersData = await supabaseManager.getPlayers();
        const playersObj = {};
        playersData.forEach(player => {
          playersObj[player.id] = player;
        });
        setPlayers(playersObj);
      } catch (error) {
        console.error('Error refreshing players:', error);
      }
    }
  };

  const createGame = async (hostName) => {
    try {
      const result = await supabaseManager.createGame(hostName);
      await refreshPlayers();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const joinGame = async (gameId, playerName) => {
    try {
      const result = await supabaseManager.joinGame(gameId, playerName);
      await refreshPlayers();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const startGame = async () => {
    await supabaseManager.assignRoles();
  };

  const updatePlayer = async (updates) => {
    await supabaseManager.updatePlayer(updates);
  };

  const setPlayerAlive = async (playerId, alive) => {
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

export const useGame = () => useContext(GameContext);
