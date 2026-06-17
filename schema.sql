-- MarkChart D1 schema
CREATE TABLE IF NOT EXISTS users (
  sub        TEXT PRIMARY KEY,
  email      TEXT,
  name       TEXT,
  picture    TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS flows (
  id          TEXT PRIMARY KEY,
  user_sub    TEXT NOT NULL,
  title       TEXT,
  description TEXT,
  icon        TEXT,
  data        TEXT NOT NULL,      -- JSON: { nodes: [...], edges: [...] }
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flows_user ON flows(user_sub);
