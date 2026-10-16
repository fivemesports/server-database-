CREATE TABLE IF NOT EXISTS daily_snapshots (
  day DATE PRIMARY KEY,
  total_players INTEGER NOT NULL DEFAULT 0,
  total_servers INTEGER NOT NULL DEFAULT 0,
  top_servers JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE TABLE IF NOT EXISTS server_snapshots (
  id BIGSERIAL PRIMARY KEY,
  server_id TEXT NOT NULL,
  server_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Unknown',
  players INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS server_snapshots_captured_at_idx ON server_snapshots(captured_at DESC);
CREATE INDEX IF NOT EXISTS server_snapshots_server_time_idx ON server_snapshots(server_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS server_snapshots_players_idx ON server_snapshots(players DESC);
