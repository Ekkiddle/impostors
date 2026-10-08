INSERT INTO tasks (id, task, location) VALUES
  ('wire', 'Fix Wiring', 'Electrical'),
  ('align-engine', 'Align Engine Output', 'Engine Room'),
  ('asteroids', 'Clear Asteroids', 'Weapons'),
  ('navigate', 'Chart Course', 'Navigation'),
  ('shields', 'Prime Shields', 'Shields'),
  ('steering', 'Stabilize Steering', 'Navigation'),
  ('swipe-card', 'Swipe Card', 'Admin')
ON CONFLICT (id) DO UPDATE
SET task = EXCLUDED.task,
    location = EXCLUDED.location;
