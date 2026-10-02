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

// --- In-Memory State & Event Bus ---

const gamesStore = new Map<string, Game>();
const playersStore = new Map<string, Player>();
const eventBus = new EventTarget();

// --- Class Implementation ---

class SupabaseManager {
  public gameId: string | null = null;
  public gameCode: string | null = null;
  public playerId: string | null = null;
  public isHost: boolean = false;

  private onPlayersUpdate?: (payload: any) => void;
  private onGameUpdate?: (payload: any) => void;

  private handlePlayersEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.gameId === this.gameId && this.onPlayersUpdate) {
      this.onPlayersUpdate(customEvent.detail);
    }
  };

  private handleGameEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.gameId === this.gameId && this.onGameUpdate) {
      this.onGameUpdate(customEvent.detail);
    }
  };

  constructor() {
    this.gameId = null;
    this.gameCode = null;
    this.playerId = null;
    this.isHost = false;
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
    const gameId = 'game_' + Math.random().toString(36).substring(2, 9);
    const gameCode = this.generateGameCode();

    const game: Game = {
      id: gameId,
      code: gameCode,
      status: 'waiting',
      host_id: null,
    };
    gamesStore.set(gameId, game);

    this.gameId = gameId;
    this.gameCode = gameCode;
    this.isHost = true;

    const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    const player: Player = {
      id: playerId,
      game_id: this.gameId,
      name: hostName,
      color: this.generateUniqueColor(),
      connected: true,
      alive: true,
      role: 'pending',
      tasks: [],
    };

    playersStore.set(playerId, player);
    this.playerId = playerId;

    // Set host on the game
    game.host_id = this.playerId;
    gamesStore.set(gameId, game);

    this.setupSubscriptions();

    return {
      gameId: this.gameId,
      gameCode: this.gameCode,
      playerId: this.playerId,
    };
  }

  async joinGame(gameCode: string, playerName: string): Promise<GameResult> {
    const game = Array.from(gamesStore.values()).find(
      (g) => g.code === gameCode && g.status === 'waiting'
    );

    if (!game) throw new Error('Game not found or not accepting players');

    this.gameId = game.id;
    this.gameCode = gameCode;
    this.isHost = false;

    const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    const player: Player = {
      id: this.gameId,
      game_id: this.gameId,
      name: playerName,
      color: await this.generateUniqueColorForGame(),
      connected: true,
      alive: true,
      role: 'pending',
      tasks: [],
    };

    playersStore.set(playerId, player);
    this.playerId = playerId;

    this.setupSubscriptions();
    this.notifyPlayersUpdate('INSERT', player);

    return {
      gameId: this.gameId,
      gameCode: this.gameCode,
      playerId: this.playerId,
    };
  }

  setupSubscriptions(): void {
    if (!this.gameId) return;

    eventBus.addEventListener('players_update', this.handlePlayersEvent);
    eventBus.addEventListener('game_update', this.handleGameEvent);
  }

  async updatePlayer(updates: Partial<Player>): Promise<void> {
    if (!this.playerId) return;
    const player = playersStore.get(this.playerId);
    if (!player) return;

    const updatedPlayer = { ...player, ...updates };
    playersStore.set(this.playerId, updatedPlayer);

    this.notifyPlayersUpdate('UPDATE', updatedPlayer);
  }

  async removePlayer(playerId: string): Promise<void> {
    const player = playersStore.get(playerId);
    if (player) {
      playersStore.delete(playerId);
      this.notifyPlayersUpdate('DELETE', player);
    }
  }

  async getPlayers(): Promise<Player[]> {
    if (!this.gameId) return [];
    return Array.from(playersStore.values()).filter(
      (p) => p.game_id === this.gameId
    );
  }

  async assignRoles(): Promise<void> {
    if (!this.isHost || !this.gameId) return;

    const players = await this.getPlayers();
    const ids = players.map((p) => p.id);
    const shuffled = this.shuffleArray([...ids]);
    const impostorCount = Math.max(1, Math.floor(shuffled.length / 5));

    for (let i = 0; i < shuffled.length; i++) {
      const role = i < impostorCount ? 'impostor' : 'crewmate';
      const tasks = i >= impostorCount ? this.generateTasks() : [];
      const p = playersStore.get(shuffled[i]??"");
      if (p) {
        const updated = { ...p, role, tasks };
        playersStore.set(shuffled[i]??"", updated as Player);
        this.notifyPlayersUpdate('UPDATE', updated);
      }
    }

    const game = gamesStore.get(this.gameId);
    if (game) {
      game.status = 'started';
      gamesStore.set(this.gameId, game);
      this.notifyGameUpdate('UPDATE', game);
    }
  }

  async setPlayerAlive(playerId: string, alive: boolean): Promise<void> {
    const player = playersStore.get(playerId);
    if (player) {
      const updated = { ...player, alive };
      playersStore.set(playerId, updated);
      this.notifyPlayersUpdate('UPDATE', updated);
    }
  }

  // --- Utilities ---

  private generateUniqueColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)]!;
  }

  private async generateUniqueColorForGame(): Promise<string> {
    const players = await this.getPlayers();
    const usedColors = players.map((p) => p.color);
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const available = colors.filter((c) => !usedColors.includes(c));
    return available.length > 0
      ? available[Math.floor(Math.random() * available.length)]!
      : '#FFFFFF';
  }

  private shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }

  private generateTasks(): string[] {
    const pool = ['wire', 'align-engine', 'asteroids', 'navigate', 'shields', 'steering', 'swipe-card'];
    return this.shuffleArray([...pool]).slice(0, 3);
  }

  private notifyPlayersUpdate(eventType: string, record: any) {
    eventBus.dispatchEvent(
      new CustomEvent('players_update', {
        detail: { gameId: this.gameId, eventType, new: record },
      })
    );
  }

  private notifyGameUpdate(eventType: string, record: any) {
    eventBus.dispatchEvent(
      new CustomEvent('game_update', {
        detail: { gameId: this.gameId, eventType, new: record },
      })
    );
  }

  setOnPlayersUpdate(callback: (payload: any) => void): void {
    this.onPlayersUpdate = callback;
  }

  setOnGameUpdate(callback: (payload: any) => void): void {
    this.onGameUpdate = callback;
  }

  disconnect(): void {
    eventBus.removeEventListener('players_update', this.handlePlayersEvent);
    eventBus.removeEventListener('game_update', this.handleGameEvent);
  }
}

export default SupabaseManager;
