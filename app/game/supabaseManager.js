import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

class SupabaseManager {
  constructor() {
    this.gameId = null;
    this.gameCode = null;
    this.playerId = null;
    this.isHost = false;
    this.subscriptions = [];
  }

  // Generate an 8-character game code
  generateGameCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  // Initialize as host - create a new game
  async createGame(hostName) {
    const MAX_RETRIES = 5;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const gameCode = this.generateGameCode();

        // 1. Create the Game record first
        const { data: game, error: gameError } = await supabase
          .from('games')
          .insert([{
            code: gameCode,
            status: 'waiting'
            // host_id is null for now
          }])
          .select()
          .single();

        // Handle Unique Constraint Violation (Code already exists)
        if (gameError && gameError.code === '23505') {
          attempt++;
          continue; // Try again with a new code
        }
        if (gameError) throw gameError;

        this.gameId = game.id;
        this.gameCode = gameCode;
        this.isHost = true;

        // 2. Create the Host Player record
        const { data: player, error: playerError } = await supabase
          .from('players')
          .insert([{
            game_id: this.gameId,
            name: hostName,
            color: this.generateUniqueColor(),
            connected: true,
            alive: true,
            role: 'pending',
            tasks: []
          }])
          .select()
          .single();

        if (playerError) throw playerError;

        this.playerId = player.id;

        // 3. Link Player to Game as Host
        // We do this after so we have the playerId
        const { error: updateError } = await supabase
          .from('games')
          .update({ host_id: this.playerId })
          .eq('id', this.gameId);

        if (updateError) throw updateError;

        this.setupSubscriptions();

        return {
          gameId: this.gameId,
          gameCode: this.gameCode,
          playerId: this.playerId
        };

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt >= MAX_RETRIES - 1) throw new Error("Could not generate a unique game code.");
        attempt++;
      }
    }
  }


  // Join existing game by code
  async joinGame(gameCode, playerName) {
    try {
      // Check if game exists and is waiting
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('code', gameCode)
        .eq('status', 'waiting')
        .single();

      // Add this right after the supabase call
      alert("DEBUG DATA: " + JSON.stringify(game));
      alert("DEBUG ERROR: " + JSON.stringify(gameError));

      if (gameError || !game) {
        throw new Error('Game not found or not accepting players');
      }

      this.gameId = game.id;
      this.gameCode = gameCode;
      this.isHost = false;

      // Add player to game
      const playerData = {
        game_id: this.gameId,
        name: playerName,
        color: await this.generateUniqueColorForGame(),
        connected: true,
        alive: true,
        role: 'pending',
        tasks: []
      };

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert([playerData])
        .select()
        .single();

      if (playerError) throw playerError;

      this.playerId = player.id;
      this.setupSubscriptions();
      return { gameId: this.gameId, gameCode: this.gameCode, playerId: this.playerId };
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  }

  // Setup real-time subscriptions
  setupSubscriptions() {
    // Subscribe to players table changes for this game
    const playersSubscription = supabase
      .channel(`players_${this.gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${this.gameId}`
        },
        (payload) => {
          console.log('Players change:', payload);
          if (this.onPlayersUpdate) {
            this.onPlayersUpdate(payload);
          }
        }
      )
      .subscribe();

    // Subscribe to games table changes
    const gamesSubscription = supabase
      .channel(`game_${this.gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${this.gameId}`
        },
        (payload) => {
          console.log('Game change:', payload);
          if (this.onGameUpdate) {
            this.onGameUpdate(payload);
          }
        }
      )
      .subscribe();

    this.subscriptions.push(playersSubscription, gamesSubscription);
  }

  // Update player data
  async updatePlayer(updates) {
    try {
      const { error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', this.playerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  }

  // Update any player data (for host)
  async updatePlayerById(playerId, updates) {
    try {
      const { error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', playerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  }

  // Get all players for current game
  async getPlayers() {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', this.gameId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting players:', error);
      throw error;
    }
  }

  // Add player for host (when receiving join via peer)
  async addPlayerForHost(playerData) {
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([playerData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  }

  // Assign roles (host only)
  async assignRoles() {
    if (!this.isHost) return;

    try {
      const players = await this.getPlayers();
      const ids = players.map(p => p.id);
      const shuffled = this.shuffleArray(ids);
      const impostorCount = Math.max(1, Math.floor(shuffled.length / 5));

      const updates = shuffled.map((id, i) => ({
        id,
        role: i < impostorCount ? 'impostor' : 'crewmate',
        tasks: i >= impostorCount ? this.generateTasks() : []
      }));

      for (const update of updates) {
        await supabase
          .from('players')
          .update({ role: update.role, tasks: update.tasks })
          .eq('id', update.id);
      }

      // Start the game
      await supabase
        .from('games')
        .update({ status: 'started' })
        .eq('id', this.gameId);
    } catch (error) {
      console.error('Error assigning roles:', error);
      throw error;
    }
  }

  // Update player alive status
  async setPlayerAlive(playerId, alive) {
    try {
      await supabase
        .from('players')
        .update({ alive })
        .eq('id', playerId);
    } catch (error) {
      console.error('Error updating player alive status:', error);
      throw error;
    }
  }

  // Remove player (disconnect)
  async removePlayer(playerId) {
    try {
      await supabase
        .from('players')
        .delete()
        .eq('id', playerId);
    } catch (error) {
      console.error('Error removing player:', error);
      throw error;
    }
  }

  // Update player connection status
  async setPlayerConnected(playerId, connected) {
    try {
      await supabase
        .from('players')
        .update({ connected })
        .eq('id', playerId);
    } catch (error) {
      console.error('Error updating player connection:', error);
      throw error;
    }
  }

  // Utility functions
  generateUniqueColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  async generateUniqueColorForGame() {
    const players = await this.getPlayers();
    const usedColors = players.map(p => p.color);
    const availableColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
      .filter(color => !usedColors.includes(color));

    if (availableColors.length === 0) {
      return '#FFFFFF'; // fallback
    }
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  generateTasks() {
    const taskPool = ['wire', 'align-engine', 'asteroids', 'navigate', 'shields', 'steering', 'swipe-card'];
    return this.shuffleArray(taskPool).slice(0, 3);
  }

  // Set callback functions
  setOnPlayersUpdate(callback) {
    this.onPlayersUpdate = callback;
  }

  setOnGameUpdate(callback) {
    this.onGameUpdate = callback;
  }

  // Cleanup
  disconnect() {
    this.subscriptions.forEach(sub => supabase.removeChannel(sub));
    this.subscriptions = [];
  }
}

export default SupabaseManager;