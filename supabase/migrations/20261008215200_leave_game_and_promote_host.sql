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

  IF v_deleted_count = 0 OR v_host_id IS DISTINCT FROM p_player_id THEN
    RETURN;
  END IF;

  SELECT id
  INTO v_next_host_id
  FROM players
  WHERE game_id = v_game_id
  ORDER BY created_at, id
  LIMIT 1;

  UPDATE games
  SET host_id = v_next_host_id
  WHERE id = v_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_game_and_promote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_game_and_promote(uuid) TO anon, authenticated;
