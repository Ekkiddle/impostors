import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

export interface Player {
  id: string;
  game_id: string;
  name: string;
  color: string;
  connected: boolean;
  alive: boolean;
  role: 'pending' | 'impostor' | 'crewmate';
  tasks: string[];
}

export interface Game {
  id: string;
  code: string;
  status: 'waiting' | 'started' | 'ended';
  host_id: string | null;
}

interface GameResult {
  gameId: string;
  gameCode: string;
  playerId: string;
}

type DatabasePlayer = Omit<Player, 'tasks'>;
type TaskAssignment = { game_id: string; player_id: string; task_id: string };
type PlayerTaskRow = Pick<TaskAssignment, 'player_id' | 'task_id'>;

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
const taskPool = ['wire', 'align-engine', 'asteroids', 'navigate', 'shields', 'steering', 'swipe-card'];

class SupabaseManager {
  public gameId: string | null = null;
  public gameCode: string | null = null;
  public playerId: string | null = null;
  public isHost = false;

  private readonly client: SupabaseClient;
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

    this.client = createClient(url, publishableKey);
  }

  private generateGameCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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
        .select('id, code, status, host_id')
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
    this.isHost = true;

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
    this.setupSubscriptions();

    return { gameId: game.id, gameCode: game.code, playerId: player.id };
  }

  async joinGame(gameCode: string, playerName: string): Promise<GameResult> {
    const normalizedCode = gameCode.trim().toUpperCase();
    const { data: game, error: gameError } = await this.client
      .from('games')
      .select('id, code, status, host_id')
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
    this.isHost = false;
    this.setupSubscriptions();

    return { gameId: game.id, gameCode: game.code, playerId: player.id };
  }

  async restoreSession(gameCode: string, playerId: string): Promise<void> {
    const normalizedCode = gameCode.trim().toUpperCase();
    const { data: game, error: gameError } = await this.client
      .from('games')
      .select('id, code, status, host_id')
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
    this.isHost = game.host_id === player.id;
    this.setupSubscriptions();
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
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => this.onPlayersUpdate?.()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players_tasks', filter: `game_id=eq.${gameId}` },
        () => this.onPlayersUpdate?.()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => this.onGameUpdate?.(payload.new as Game)
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
    const { error } = await this.client.from('players').delete().eq('id', playerId);
    if (error) {
      throw new Error(`Could not remove player: ${error.message}`);
    }
  }

  async getPlayers(): Promise<Player[]> {
    if (!this.gameId) return [];

    const { data: playerRows, error: playersError } = await this.client
      .from('players')
      .select('id, game_id, name, color, connected, alive, role')
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

  async getGame(): Promise<Game | null> {
    if (!this.gameId) return null;
    const { data, error } = await this.client
      .from('games')
      .select('id, code, status, host_id')
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
    const players = await this.getPlayers();
    if (players.length < 2) {
      throw new Error('At least two players are required to start the game.');
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
        this.shuffleArray(taskPool).slice(0, 3).forEach((taskId) => {
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
