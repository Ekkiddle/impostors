-- Add game code column for shorter game IDs
ALTER TABLE games ADD COLUMN code VARCHAR(8) UNIQUE NOT NULL DEFAULT '';
CREATE INDEX idx_games_code ON games(code);