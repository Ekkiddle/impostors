import SupabaseManager, { Player } from './supabaseManager';

// Define the Map with strict types
const players = new Map<string, Player>();

let inGame = false;

// -------------------------------------------------------------
// Link to playstate

// Define the type for the state setter function
type PlayerSetter = (players: Record<string, Player>) => void;
let updatePlayersState: PlayerSetter | null = null;

export const registerPlayerSetter = (setter: PlayerSetter) => {
  updatePlayersState = setter;
};

// -------------------------------------------------------------

let supabaseManager: SupabaseManager | null = null;

export const initSupabaseManager = (sm: SupabaseManager) => {
  supabaseManager = sm;
};

const splitData = (data: string) => {
  const delimiterIndex = data.indexOf("|");
  let command = data;
  let message = "";

  if (delimiterIndex !== -1) {
    command = data.substring(0, delimiterIndex);
    message = data.substring(delimiterIndex + 1);
  }
  return { command, message };
};

// --------------------------------------------------------------------------------------
// Interact with players
// --------------------------------------------------------------------------------------

const broadcastPlayers = () => {
  reloadPlayers();
  const playersObj = Object.fromEntries(players);
  if (updatePlayersState) updatePlayersState(playersObj);
};

const reloadPlayers = async () => {
  if (supabaseManager) {
    try {
      const playersData: Player[] = await supabaseManager.getPlayers();
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
      const stored = sessionStorage.getItem('players');
      if (stored) {
        const playersObj: Record<string, Player> = JSON.parse(stored);
        players.clear();
        Object.entries(playersObj).forEach(([id, playerData]) => {
          players.set(id, playerData);
        });
        const playersObj2 = Object.fromEntries(players);
        if (updatePlayersState) updatePlayersState(playersObj2);
      }
    }
  }
};

export const changeConnection = (id: string, status: boolean) => {
  const existingPlayer = players.get(id);
  if (existingPlayer) {
    if (!inGame && !status) {
      removePlayer(id);
      return;
    }
    existingPlayer.connected = status;
    players.set(id, existingPlayer);
    if (supabaseManager) {
      supabaseManager.updatePlayer(existingPlayer)
        .catch(error => console.error('Error updating connection:', error));
    }
    broadcastPlayers();
  }
};

export const removePlayer = (id: string) => {
  players.delete(id);
  if (supabaseManager) {
    supabaseManager.removePlayer(id)
      .catch(error => console.error('Error removing player:', error));
  }
  broadcastPlayers();
};

export const assignRoles = async () => {
  if (supabaseManager) {
    try {
      await supabaseManager.assignRoles();
      await reloadPlayers();
    } catch (error) {
      console.error('Error assigning roles via Supabase:', error);
    }
  } else {
    // Fallback local logic
    const ids = Array.from(players.keys());
    const shuffled = shuffleArray([...ids]);
    const impostorCount = Math.max(1, Math.floor(shuffled.length / 5));

    shuffled.forEach((id, i) => {
      const player = players.get(id);
      if (player) {
        player.role = i < impostorCount ? 'impostor' : 'crewmate';
        player.tasks = generateTasks();
        players.set(id, player);
      }
    });
    broadcastPlayers();
  }
};

// Utilities
export const shuffleArray = <T>(arr: T[]): T[] => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const generateTasks = (): string[] => {
  const taskPool = ['wire', 'align-engine', 'asteroids', 'navigate', 'shields', 'steering', 'swipe-card'];
  return shuffleArray(taskPool).slice(0, 3);
};
