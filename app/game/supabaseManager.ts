import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseGlobal = typeof globalThis & {
  __impostorsSupabaseClient?: SupabaseClient;
};

function getSupabaseClient(url: string, publishableKey: string): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(url, publishableKey);
  }

  const browserGlobal = globalThis as SupabaseGlobal;
  browserGlobal.__impostorsSupabaseClient ??= createClient(url, publishableKey);
  return browserGlobal.__impostorsSupabaseClient;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  color: string;
  connected: boolean;
  alive: boolean;
  role: 'pending' | 'impostor' | 'crewmate';
  player_vote: string | null;
  tasks: string[];
  created_at: string;
}

export interface Game {
  id: string;
  code: string;
  host_id: string | null;
  status: 'waiting' | 'started' | 'ended';
  map_id: string | null;
  num_impostors: number | null;
  created_at: string;
}

export interface MapTask {
  task_id: string;
  map_location: string;
  task_type: string;
  sub_task_type: string;
}

interface GameResult {
  gameId: string;
  gameCode: string;
  playerId: string;
}

type DatabasePlayer = Omit<Player, 'tasks'>;
type TaskAssignment = { game_id: string; player_id: string; task_id: string };
type PlayerTaskRow = Pick<TaskAssignment, 'player_id' | 'task_id'>;
type MapTaskRow = { task_id: string };

function formatSupabaseError(error: { message: string; code?: string; details?: string; hint?: string }): string {
  return [
    error.message,
    error.code && `Code: ${error.code}`,
    error.details,
    error.hint && `Hint: ${error.hint}`,
  ]
    .filter(Boolean)
    .join(' ');
}

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

class SupabaseManager {
  public gameId: string | null = null;
  public gameCode: string | null = null;
  public playerId: string | null = null;
  public hostId: string | null = null;
  public isHost = false;

  private currentGameStatus: Game['status'] | null = null;
  private readonly client: SupabaseClient;
  private readonly supabaseUrl: string;
  private readonly publishableKey: string;
  private channel: RealtimeChannel | null = null;
  private onPlayersUpdate?: () => void;
  private onGameUpdate?: (game: Game) => void;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey) {
      throw new Error(
        'Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );
    }

    this.supabaseUrl = url;
    this.publishableKey = publishableKey;
    this.client = getSupabaseClient(url, publishableKey);
  }

  private generateGameCode(): string {
    const characters = 'ABCEFGHJKMNPQRSTUVWXYZ23456789';
    return Array.from(
      { length: 6 },
      () => characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
  }

  async createGame(hostName: string): Promise<GameResult> {
    let game: Game | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await this.client
        .from('games')
        .insert({ code: this.generateGameCode(), status: 'waiting' })
        .select('id, code, host_id, status, map_id, num_impostors, created_at')
        .single();

      if (!error) {
        game = data;
        break;
      }
      if (error.code !== '23505') {
        throw new Error(`Could not create game: ${formatSupabaseError(error)}`);
      }
    }

    if (!game) {
      throw new Error('Could not create a unique game code. Please try again.');
    }

    this.gameId = game.id;
    this.gameCode = game.code;
    this.hostId = null;
    this.isHost = false;

    const { data: player, error: playerError } = await this.client
      .from('players')
      .insert({
        game_id: game.id,
        name: hostName,
        color: this.pickAvailableColor([]),
        connected: true,
        alive: true,
        role: 'pending',
      })
      .select('id')
      .single();

    if (playerError) {
      const { error: cleanupError } = await this.client.from('games').delete().eq('id', game.id);
      if (cleanupError) {
        console.error('Could not clean up game after host creation failed:', cleanupError);
      }
      throw new Error(`Could not create host player: ${formatSupabaseError(playerError)}`);
    }

    const { error: hostError } = await this.client
      .from('games')
      .update({ host_id: player.id })
      .eq('id', game.id);

    if (hostError) {
      throw new Error(`Could not assign game host: ${formatSupabaseError(hostError)}`);
    }

    this.playerId = player.id;
    this.hostId = player.id;
    this.isHost = true;
    this.currentGameStatus = game.status;
    this.setupSubscriptions();

    return { gameId: game.id, gameCode: game.code, playerId: player.id };
  }

  async deleteGame(gameId: string): Promise<void> {
    const { error } = await this.client
      .from('games')
      .delete()
      .eq('id', gameId);
    if (error) {
      throw new Error(`Could not delete game: ${formatSupabaseError(error)}`);
    }
  }

  async joinGame(gameCode: string, playerName: string): Promise<GameResult> {
    const normalizedCode = gameCode.trim().toUpperCase();
    const { data: game, error: gameError } = await this.client
      .from('games')
      .select('id, code, host_id, status, map_id, num_impostors, created_at')
      .eq('code', normalizedCode)
      .eq('status', 'waiting')
      .maybeSingle();

    if (gameError) {
      throw new Error(`Could not find game: ${gameError.message}`);
    }
    if (!game) {
      throw new Error('Game not found or not accepting players.');
    }

    const { data: currentPlayers, error: playersError } = await this.client
      .from('players')
      .select('color')
      .eq('game_id', game.id);

    if (playersError) {
      throw new Error(`Could not load players: ${playersError.message}`);
    }

    const { data: player, error: playerError } = await this.client
      .from('players')
      .insert({
        game_id: game.id,
        name: playerName,
        color: this.pickAvailableColor(currentPlayers.map(({ color }) => color)),
        connected: true,
        alive: true,
        role: 'pending',
      })
      .select('id')
      .single();

    if (playerError) {
      throw new Error(`Could not join game: ${playerError.message}`);
    }

    this.gameId = game.id;
    this.gameCode = game.code;
    this.playerId = player.id;
    this.hostId = game.host_id;
    this.isHost = game.host_id === player.id;
    this.currentGameStatus = game.status;
    this.setupSubscriptions();

    return { gameId: game.id, gameCode: game.code, playerId: player.id };
  }

  async restoreSession(gameCode: string, playerId: string): Promise<void> {
    const normalizedCode = gameCode.trim().toUpperCase();
    const { data: game, error: gameError } = await this.client
      .from('games')
      .select('id, code, status, host_id, map_id, num_impostors, created_at')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (gameError) {
      throw new Error(`Could not restore game: ${gameError.message}`);
    }
    if (!game) {
      throw new Error('The saved game no longer exists.');
    }

    const { data: player, error: playerError } = await this.client
      .from('players')
      .select('id')
      .eq('id', playerId)
      .eq('game_id', game.id)
      .maybeSingle();

    if (playerError) {
      throw new Error(`Could not restore player: ${playerError.message}`);
    }
    if (!player) {
      throw new Error('The saved player is no longer in this game.');
    }

    this.gameId = game.id;
    this.gameCode = game.code;
    this.playerId = player.id;
    this.updateCurrentGame(game);
    this.setupSubscriptions();
  }

  private updateCurrentGame(game: Game): void {
    this.currentGameStatus = game.status;
    this.hostId = game.host_id;
    this.isHost = game.host_id === this.playerId;
    this.onGameUpdate?.(game);
  }

  private setupSubscriptions(): void {
    if (!this.gameId) return;

    if (this.channel) {
      void this.client.removeChannel(this.channel).then((status) => {
        if (status !== 'ok') console.error(`Supabase channel cleanup failed: ${status}`);
      });
    }

    const gameId = this.gameId;
    this.channel = this.client
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => this.onPlayersUpdate?.()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => this.onPlayersUpdate?.()
      )
      // Realtime does not support filters on DELETE events; refreshPlayers queries only this game.
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'players' },
        () => this.onPlayersUpdate?.()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'players_tasks', filter: `game_id=eq.${gameId}` },
        () => this.onPlayersUpdate?.()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players_tasks', filter: `game_id=eq.${gameId}` },
        () => this.onPlayersUpdate?.()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'players_tasks' },
        () => this.onPlayersUpdate?.()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const game = payload.new as Game;
          if (game.status !== this.currentGameStatus) {
            this.updateCurrentGame(game);
          }
        }
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Supabase realtime subscription failed:', error ?? status);
        }
      });
  }

  async updatePlayer(updates: Partial<Player>): Promise<void> {
    if (!this.playerId) throw new Error('Cannot update player before joining a game.');

    const { tasks, ...playerUpdates } = updates;
    if (Object.keys(playerUpdates).length > 0) {
      const { error } = await this.client
        .from('players')
        .update(playerUpdates)
        .eq('id', this.playerId);

      if (error) {
        throw new Error(`Could not update player: ${error.message}`);
      }
    }

    if (tasks) {
      await this.setPlayerTasks(this.playerId, tasks);
    }
  }

  async removePlayer(playerId: string): Promise<void> {
    await this.removePlayerAndPromote(playerId);
  }

  async leaveGame(): Promise<void> {
    if (!this.playerId) return;

    const playerId = this.playerId;
    await this.removePlayerAndPromote(playerId);
    this.clearCurrentSession(playerId);
  }

  private async removePlayerAndPromote(playerId: string): Promise<void> {
    const { error } = await this.client.rpc('leave_game_and_promote', {
      p_player_id: playerId,
    });
    if (error) {
      throw new Error(`Could not remove player: ${formatSupabaseError(error)}`);
    }
  }

  private clearCurrentSession(playerId: string): void {
    if (this.playerId !== playerId) return;
    this.disconnect();
    this.gameId = null;
    this.gameCode = null;
    this.playerId = null;
    this.hostId = null;
    this.isHost = false;
  }

  async getPlayers(): Promise<Player[]> {
    if (!this.gameId) return [];

    const { data: playerRows, error: playersError } = await this.client
      .from('players')
      .select('id, game_id, name, color, connected, alive, role, player_vote, created_at')
      .eq('game_id', this.gameId);

    if (playersError) {
      throw new Error(`Could not load players: ${playersError.message}`);
    }

    const { data: taskRows, error: tasksError } = await this.client
      .from('players_tasks')
      .select('player_id, task_id')
      .eq('game_id', this.gameId);

    if (tasksError) {
      throw new Error(`Could not load player tasks: ${tasksError.message}`);
    }

    const tasksByPlayer = new Map<string, string[]>();
    taskRows.forEach(({ player_id, task_id }: PlayerTaskRow) => {
      const tasks = tasksByPlayer.get(player_id) ?? [];
      tasks.push(task_id);
      tasksByPlayer.set(player_id, tasks);
    });

    return (playerRows as DatabasePlayer[]).map((player) => ({
      ...player,
      tasks: tasksByPlayer.get(player.id) ?? [],
    }));
  }

  async getMapTasks(mapId: string): Promise<MapTask[]> {
    const { data, error } = await this.client
      .from('maps_tasks')
      .select('task_id, map_location, task_type, sub_task_type')
      .eq('map_id', mapId);

    if (error) {
      throw new Error(`Could not load tasks for map ${mapId}: ${formatSupabaseError(error)}`);
    }
    return data as MapTask[];
  }

  async getGame(): Promise<Game | null> {
    if (!this.gameId) return null;
    const { data, error } = await this.client
      .from('games')
      .select('id, code, status, host_id, map_id, num_impostors, created_at')
      .eq('id', this.gameId)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load game: ${error.message}`);
    }
    return data;
  }

  async assignRoles(): Promise<void> {
    if (!this.isHost || !this.gameId) {
      throw new Error('Only the host can start the game.');
    }

    const gameId = this.gameId;
    const game = await this.getGame();
    if (!game || game.host_id !== this.playerId) {
      this.isHost = false;
      throw new Error('Only the current host can start the game.');
    }
    if (game.status !== 'waiting') {
      throw new Error('This game has already started.');
    }

    const players = await this.getPlayers();
    if (players.length < 4) {
      throw new Error('At least four players are required to start the game.');
    }
    if (!game.map_id) {
      throw new Error('Cannot assign tasks because this game has no map.');
    }

    const { data: mapTasks, error: mapTasksError } = await this.client
      .from('maps_tasks')
      .select('task_id')
      .eq('map_id', game.map_id);
    if (mapTasksError) {
      throw new Error(`Could not load tasks for map ${game.map_id}: ${formatSupabaseError(mapTasksError)}`);
    }
    const taskIds = (mapTasks as MapTaskRow[]).map(({ task_id }) => task_id);
    if (taskIds.length < 3) {
      throw new Error(`Map ${game.map_id} does not have enough tasks to start the game.`);
    }

    const shuffledPlayers = this.shuffleArray(players);
    const impostorCount = Math.max(1, Math.floor(shuffledPlayers.length / 5));

    const { error: deleteError } = await this.client
      .from('players_tasks')
      .delete()
      .eq('game_id', gameId);
    if (deleteError) {
      throw new Error(`Could not reset player tasks: ${deleteError.message}`);
    }

    const taskAssignments: TaskAssignment[] = [];
    for (let index = 0; index < shuffledPlayers.length; index++) {
      const player = shuffledPlayers[index]!;
      const isImpostor = index < impostorCount;
      const { error } = await this.client
        .from('players')
        .update({ role: isImpostor ? 'impostor' : 'crewmate' })
        .eq('id', player.id);
      if (error) {
        throw new Error(`Could not assign player role: ${error.message}`);
      }

      if (!isImpostor) {
        this.shuffleArray(taskIds).slice(0, 3).forEach((taskId) => {
          taskAssignments.push({ game_id: gameId, player_id: player.id, task_id: taskId });
        });
      }
    }

    if (taskAssignments.length > 0) {
      const { error } = await this.client.from('players_tasks').insert(taskAssignments);
      if (error) {
        throw new Error(`Could not assign player tasks: ${error.message}`);
      }
    }

    const { error } = await this.client
      .from('games')
      .update({ status: 'started' })
      .eq('id', gameId);
    if (error) {
      throw new Error(`Could not start game: ${error.message}`);
    }
  }

  async setPlayerAlive(playerId: string, alive: boolean): Promise<void> {
    const { error } = await this.client
      .from('players')
      .update({ alive })
      .eq('id', playerId);
    if (error) {
      throw new Error(`Could not update player status: ${error.message}`);
    }
  }

  async updateTaskStatus(
    playerId: string,
    taskId: string,
    status: 'not_started' | 'in_progress' | 'completed'
  ): Promise<void> {
    if (!this.gameId) throw new Error('Cannot update tasks before joining a game.');

    const updates = status === 'completed'
      ? { completed: true }
      : status === 'in_progress'
        ? { completed: false, time_started: new Date().toISOString() }
        : { completed: false, time_started: null };
    const { data, error } = await this.client
      .from('players_tasks')
      .update(updates)
      .eq('game_id', this.gameId)
      .eq('player_id', playerId)
      .eq('task_id', taskId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(`Could not update task status: ${formatSupabaseError(error)}`);
    }
    if (!data) {
      throw new Error('Could not update task status: task assignment was not found for this player.');
    }
  }

  async validatePlayerTask(taskId: string): Promise<boolean> {
    if (!this.gameId) throw new Error('Cannot validate tasks before joining a game.');
    if (!this.playerId) throw new Error('Cannot validate tasks without a player.');

    // checks to see if I can even play this task
    const { data, error } = await this.client
      .from('players_tasks')
      .select('id')
      .eq('game_id', this.gameId)
      .eq('player_id', this.playerId)
      .eq('task_id', taskId)
      .eq('ready', true)
      .eq('completed', false)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not validate task assignment: ${formatSupabaseError(error)}`);
    }
    return data !== null;
  }

  private async setPlayerTasks(playerId: string, tasks: string[]): Promise<void> {
    if (!this.gameId) throw new Error('Cannot assign tasks before joining a game.');

    const gameId = this.gameId;
    const { error: deleteError } = await this.client
      .from('players_tasks')
      .delete()
      .eq('player_id', playerId);
    if (deleteError) {
      throw new Error(`Could not reset player tasks: ${deleteError.message}`);
    }

    if (tasks.length === 0) return;
    const { error } = await this.client.from('players_tasks').insert(
      tasks.map((task_id) => ({ game_id: gameId, player_id: playerId, task_id }))
    );
    if (error) {
      throw new Error(`Could not update player tasks: ${error.message}`);
    }
  }

  private pickAvailableColor(usedColors: string[]): string {
    const availableColors = colors.filter((color) => !usedColors.includes(color));
    return availableColors.length > 0
      ? availableColors[Math.floor(Math.random() * availableColors.length)]!
      : '#FFFFFF';
  }

  private shuffleArray<T>(values: T[]): T[] {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
    }
    return shuffled;
  }

  setOnPlayersUpdate(callback: () => void): void {
    this.onPlayersUpdate = callback;
  }

  setOnGameUpdate(callback: (game: Game) => void): void {
    this.onGameUpdate = callback;
  }

  disconnect(): void {
    if (!this.channel) return;

    void this.client.removeChannel(this.channel).then((status) => {
      if (status !== 'ok') console.error(`Supabase channel cleanup failed: ${status}`);
    });
    this.channel = null;
  }
}

export default SupabaseManager;
