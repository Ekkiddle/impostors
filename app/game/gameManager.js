
const players = new Map(); // key: playerId, value: { id, name, role, alive, tasks }
let inGame = false; // variable to set if we are in a game or not (if player leaves while not inGame, remove the player)

// -------------------------------------------------------------
// Link to playstate

let updatePlayersState = null;

export const registerPlayerSetter = (setter) => {
  updatePlayersState = setter;
};

// -------------------------------------------------------------

import SupabaseManager from './supabaseManager';

let supabaseManager = null;

export const initSupabaseManager = (sm) => {
  supabaseManager = sm;
};

const splitData = (data) => {
  const delimiterIndex = data.indexOf("|");

  let command = data;
  let message = "";

  if (delimiterIndex !== -1) {
    command = data.substring(0, delimiterIndex);
    message = data.substring(delimiterIndex + 1);
  }
  return { command, message };
}

// --------------------------------------------------------------------------------------
// Interact with players
// --------------------------------------------------------------------------------------

const broadcastPlayers = () => {
  reloadPlayers();
  const playersObj = Object.fromEntries(players);
  // Removed sendToAll since using Supabase real-time
  if (updatePlayersState) updatePlayersState(playersObj);
};

// Reload players if lost
const reloadPlayers = async () => {
  if (supabaseManager) {
    try {
      const playersData = await supabaseManager.getPlayers();
      players.clear();
      playersData.forEach(player => {
        players.set(player.id, player);
      });
      const playersObj = Object.fromEntries(players);
      if (updatePlayersState) updatePlayersState(playersObj);
    } catch (error) {
      console.error('Error loading players from Supabase:', error);
    }
  } else {
    // Fallback to sessionStorage
    if (players.size === 0) {
      const playersObj = JSON.parse(sessionStorage.getItem('players'));

      if (playersObj) {
        console.log("Players Object: ", playersObj)
        players.clear();

        // Populate the map with the stored players
        Object.entries(playersObj).forEach(([id, playerData]) => {
          players.set(id, playerData);
        });



        const playersObj2 = Object.fromEntries(players);
        if (updatePlayersState) updatePlayersState(playersObj2);
      }
    }
  }
};

const addPlayer = (id, name) => {
  const color = generateUniqueColor();
  const playerData = {
    id,
    name,
    color,
    connected: true,
    alive: true,
    role: 'pending',
    tasks: []
  };
  players.set(id, playerData);
  if (supabaseManager) {
    supabaseManager.addPlayerForHost({
      game_id: supabaseManager.gameId,
      ...playerData
    }).catch(error => console.error('Error adding player to Supabase:', error));
  }
  broadcastPlayers();
};

const changeName = (id, name) => {
  if (players.has(id)) {
    const existingPlayer = players.get(id);
    existingPlayer.name = name; // update the name
    players.set(id, existingPlayer);
    if (supabaseManager) {
      supabaseManager.updatePlayerById(id, { name }).catch(error => console.error('Error updating name in Supabase:', error));
    }
    broadcastPlayers();
  }
}

const changeColor = (id, color) => {
  if (!isColorTaken(color) && (players.has(id))) {
    const existingPlayer = players.get(id);
    existingPlayer.color = color; // update the name
    players.set(id, existingPlayer);
    if (supabaseManager) {
      supabaseManager.updatePlayerById(id, { color }).catch(error => console.error('Error updating color in Supabase:', error));
    }
    broadcastPlayers();
  }
}

const changeAlive = (id, alive) => {
  if (players.has(id)) {
    const existingPlayer = players.get(id);
    existingPlayer.alive = alive; // update the name
    players.set(id, existingPlayer);
    if (supabaseManager) {
      supabaseManager.updatePlayerById(id, { alive }).catch(error => console.error('Error updating alive in Supabase:', error));
    }
    broadcastPlayers();
  }
}

export const changeConnection = (id, status) => {
  if (players.has(id)) {
    // If status is false, and we are not inGame yet, remove the player.
    if (!inGame && !status) {
      removePlayer(id)
    }
    const existingPlayer = players.get(id);
    existingPlayer.connected = status; // update the name
    players.set(id, existingPlayer);
    if (supabaseManager) {
      supabaseManager.updatePlayerById(id, { connected: status }).catch(error => console.error('Error updating connection in Supabase:', error));
    }
    broadcastPlayers();
  }
}

export const removePlayer = (id) => {
  console.log("Removing Player ", id)
  players.delete(id);
  if (supabaseManager) {
    supabaseManager.removePlayer(id).catch(error => console.error('Error removing player from Supabase:', error));
  }
  broadcastPlayers();
};

export const clearPlayers = () => {
  console.log("Clearing players")
  players.clear();
  // Removed sessionStorage
  if (updatePlayersState) {
    console.log("Updating state")
    updatePlayersState({});
  }
}

export const assignRoles = async () => {
  if (supabaseManager) {
    try {
      await supabaseManager.assignRoles();
      await reloadPlayers(); // Reload to get updated roles and tasks
    } catch (error) {
      console.error('Error assigning roles via Supabase:', error);
    }
  } else {
    // Fallback to local logic
    reloadPlayers();
    const ids = Array.from(players.keys());
    const shuffled = shuffleArray(ids);
    const impostorCount = Math.max(1, Math.floor(shuffled.length / 5));

    shuffled.forEach((id, i) => {
      const player = players.get(id);
      player.role = i < impostorCount ? 'impostor' : 'crewmate';
      player.tasks = generateTasks();
      players.set(id, player);
    });
    broadcastPlayers();
  }
};

export const getGameState = () => {
  return Array.from(players.values());
};

const generateTasks = () => {
  const taskPool = ['task1', 'task2', 'task3', 'task4'];
  return shuffleArray(taskPool).slice(0, 3);
};

const checkWinConditions = () => {
  // if there are more (or equal) number of impostors to players, impostors win.
  // if all of the tasks are done, or there are no more impostors, crewmates win.
};


// ------------------------------------------------------------------------------------
// Miscelanious

const getRandomBrightColor = () => {
  // Keep brightness above 0x17 for each channel (to avoid dark colors)
  const min = 0x17;
  const max = 0xFF;

  const r = Math.floor(Math.random() * (max - min) + min);
  const g = Math.floor(Math.random() * (max - min) + min);
  const b = Math.floor(Math.random() * (max - min) + min);

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};

const isColorTaken = (color) => {
  for (const player of players.values()) {
    if (player.color === color) {
      return true;
    }
  }
  return false;
};

const generateUniqueColor = () => {
  let color;
  let attempts = 0;
  do {
    color = getRandomBrightColor();
    attempts++;
    if (attempts > 100) throw new Error("Unable to generate unique color");
  } while (isColorTaken(color));
  return color;
};

export const shuffleArray = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Random index between 0 and i
    [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap elements
  }
  return arr;
};
