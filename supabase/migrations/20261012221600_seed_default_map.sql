INSERT INTO maps (map_id, map_image)
VALUES ('SKELD', NULL)
ON CONFLICT (map_id) DO UPDATE
SET map_image = EXCLUDED.map_image;

INSERT INTO maps_tasks (task_id, map_id, map_location, task_type, sub_task_type) VALUES
  ('wire-1-skeld', 'SKELD', NULL, 'WIRES', NULL),
  ('wire-2-skeld', 'SKELD', NULL, 'WIRES', NULL),
  ('wire-3-skeld', 'SKELD', NULL, 'WIRES', NULL),
  ('wire-4-skeld', 'SKELD', NULL, 'WIRES', NULL),
  ('wire-5-skeld', 'SKELD', NULL, 'WIRES', NULL),
  ('align-engine-skeld', 'SKELD', NULL, 'ALIGN_ENGINE', NULL),
  ('asteroids-skeld', 'SKELD', NULL, 'ASTEROIDS', NULL),
  ('navigate-skeld', 'SKELD', NULL, 'NAVIGATION', NULL),
  ('shields-skeld', 'SKELD', NULL, 'SHIELDS', NULL),
  ('steering-skeld', 'SKELD', NULL, 'STEERING', NULL),
  ('swipe-card-skeld', 'SKELD', NULL, 'SWIPE_CARD', NULL)
ON CONFLICT (task_id) DO UPDATE
SET map_id = EXCLUDED.map_id,
    map_location = EXCLUDED.map_location,
    task_type = EXCLUDED.task_type,
    sub_task_type = EXCLUDED.sub_task_type;
