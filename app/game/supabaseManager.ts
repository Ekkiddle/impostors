import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Interfaces ---

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

// --- Class Implementation ---

class SupabaseManager {
  public gameId: string | null = null;
  public gameCode: string | null = null;
  public playerId: string | null = null;
  public isHost: boolean = false;
  private subscriptions: RealtimeChannel[] = [];

  private onPlayersUpdate?: (payload: any) => void;
  private onGameUpdate?: (payload: any) => void;

  constructor() {
    this.gameId = null;
    this.gameCode = null;
    this.playerId = null;
    this.isHost = false;
    this.subscriptions = [];
  }

  generateGameCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  async createGame(hostName: string): Promise<GameResult> {
    const MAX_RETRIES = 5;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const gameCode = this.generateGameCode();

        const { data: game, error: gameError } = await supabase
          .from('games')
          .insert([{ code: gameCode, status: 'waiting' }])
          .select()
          .single();

        if (gameError && gameError.code === '23505') {
          attempt++;
          continue;
        }
        if (gameError) throw gameError;

        this.gameId = game.id;
        this.gameCode = gameCode;
        this.isHost = true;

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

        const { error: updateError } = await supabase
          .from('games')
          .update({ host_id: this.playerId })
          .eq('id', this.gameId);

        if (updateError) throw updateError;

        this.setupSubscriptions();

        return {
          gameId: this.gameId!,
          gameCode: this.gameCode!,
          playerId: this.playerId!
        };

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt >= MAX_RETRIES - 1) throw new Error("Could not generate a unique game code.");
        attempt++;
      }
    }
    throw new Error("Game creation failed after retries.");
  }

  async joinGame(gameCode: string, playerName: string): Promise<GameResult> {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', gameCode)
      .eq('status', 'waiting')
      .single();

    if (gameError || !game) throw new Error('Game not found or not accepting players');

    this.gameId = game.id;
    this.gameCode = gameCode;
    this.isHost = false;

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert([{
        game_id: this.gameId,
        name: playerName,
        color: await this.generateUniqueColorForGame(),
        connected: true,
        alive: true,
        role: 'pending',
        tasks: []
      }])
      .select()
      .single();

    if (playerError) throw playerError;

    this.playerId = player.id;
    this.setupSubscriptions();

    return { gameId: this.gameId!, gameCode: this.gameCode!, playerId: this.playerId! };
  }

  setupSubscriptions(): void {
    if (!this.gameId) return;

    const playersSub = supabase
      .channel(`players_${this.gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${this.gameId}` },
        (payload) => this.onPlayersUpdate?.(payload)
      )
      .subscribe();

    const gamesSub = supabase
      .channel(`game_${this.gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${this.gameId}` },
        (payload) => this.onGameUpdate?.(payload)
      )
      .subscribe();

    this.subscriptions.push(playersSub, gamesSub);
  }

  async updatePlayer(updates: Partial<Player>): Promise<void> {
    if (!this.playerId) return;
    const { error } = await supabase.from('players').update(updates).eq('id', this.playerId);
    if (error) throw error;
  }

  async removePlayer(playerId: string): Promise<void> {
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    if (error) throw error;
  }

  async getPlayers(): Promise<Player[]> {
    const { data, error } = await supabase.from('players').select('*').eq('game_id', this.gameId);
    if (error) throw error;
    return data || [];
  }

  async assignRoles(): Promise<void> {
    if (!this.isHost || !this.gameId) return;

    const players = await this.getPlayers();
    const ids = players.map(p => p.id);
    const shuffled = this.shuffleArray([...ids]);
    const impostorCount = Math.max(1, Math.floor(shuffled.length / 5));

    for (let i = 0; i < shuffled.length; i++) {
      const role = i < impostorCount ? 'impostor' : 'crewmate';
      const tasks = i >= impostorCount ? this.generateTasks() : [];
      await supabase.from('players').update({ role, tasks }).eq('id', shuffled[i]);
    }

    await supabase.from('games').update({ status: 'started' }).eq('id', this.gameId);
  }

  async setPlayerAlive(playerId: string, alive: boolean): Promise<void> {
    await supabase.from('players').update({ alive }).eq('id', playerId);
  }

  // --- Utilities ---

  private generateUniqueColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private async generateUniqueColorForGame(): Promise<string> {
    const players = await this.getPlayers();
    const usedColors = players.map(p => p.color);
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const available = colors.filter(c => !usedColors.includes(c));
    return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : '#FFFFFF';
  }

  private shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private generateTasks(): string[] {
    const pool = ['wire', 'align-engine', 'asteroids', 'navigate', 'shields', 'steering', 'swipe-card'];
    return this.shuffleArray([...pool]).slice(0, 3);
  }

  setOnPlayersUpdate(callback: (payload: any) => void): void { this.onPlayersUpdate = callback; }
  setOnGameUpdate(callback: (payload: any) => void): void { this.onGameUpdate = callback; }

  disconnect(): void {
    this.subscriptions.forEach(sub => supabase.removeChannel(sub));
    this.subscriptions = [];
  }
}

export default SupabaseManager;
