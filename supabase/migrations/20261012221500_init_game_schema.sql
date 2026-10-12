CREATE TABLE maps (
  map_id TEXT PRIMARY KEY,
  map_image TEXT
);

CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL DEFAULT '',
  host_id UUID,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'started', 'ended')),
  map_id TEXT NOT NULL DEFAULT 'SKELD' REFERENCES maps(map_id),
  num_impostors INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  connected BOOLEAN DEFAULT true,
  alive BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'pending' CHECK (role IN ('pending', 'impostor', 'crewmate')),
  player_vote UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE maps_tasks (
  task_id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(map_id) ON DELETE CASCADE,
  map_location JSONB CHECK (
    map_location IS NULL OR jsonb_typeof(map_location) = 'object'
  ),
  task_type TEXT NOT NULL,
  sub_task_type TEXT
);

CREATE TABLE players_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES maps_tasks(task_id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  value INTEGER DEFAULT 0,
  time_started TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE players_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on games for anonymous users"
  ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on players for anonymous users"
  ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on maps for anonymous users"
  ON maps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on maps_tasks for anonymous users"
  ON maps_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on players_tasks for anonymous users"
  ON players_tasks FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE players_tasks;

CREATE OR REPLACE FUNCTION public.leave_game_and_promote(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id uuid;
  v_host_id uuid;
  v_next_host_id uuid;
  v_deleted_count integer;
BEGIN
  SELECT game_id
  INTO v_game_id
  FROM players
  WHERE id = p_player_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT host_id
  INTO v_host_id
  FROM games
  WHERE id = v_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM players
  WHERE id = p_player_id
    AND game_id = v_game_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN;
  END IF;

  SELECT id
  INTO v_next_host_id
  FROM players
  WHERE game_id = v_game_id
  ORDER BY created_at, id
  LIMIT 1;

  IF v_next_host_id IS NULL THEN
    DELETE FROM games
    WHERE id = v_game_id;
  ELSIF v_host_id = p_player_id THEN
    UPDATE games
    SET host_id = v_next_host_id
    WHERE id = v_game_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_game_and_promote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_game_and_promote(uuid) TO anon, authenticated;
