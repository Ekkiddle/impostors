
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

export interface PlayerTask {
    player_id: string;
    task_id: string;
    ready: boolean;
    completed: boolean;
    time_started: string | null; // time stamp
}

export interface PlayerMapTask {
    player_id: string;
    task_id: string;
    ready: boolean;
    completed: boolean;
    time_started: string | null; // time stamp
    map_location: string;
    task_type: string;
    sub_task_type: string;
}

export interface GameResult {
    gameId: string;
    gameCode: string;
    playerId: string;
}
