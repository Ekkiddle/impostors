-- SQL to create the database tables for the Impostors game
-- Run this in your Supabase SQL editor

-- Enable Row Level Security (RLS) for all tables
-- Enable realtime for tables

-- Games table
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'started', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  connected BOOLEAN DEFAULT true,
  alive BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'pending' CHECK (role IN ('pending', 'impostor', 'crewmate')),
  tasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (since using anon key)
CREATE POLICY "Allow all operations on games for anonymous users" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations on players for anonymous users" ON players FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;