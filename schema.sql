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

-- API keys: one row per key a user generates. We store only a SHA-256 hash of
-- the key (the plaintext is shown to the user exactly once, at creation).
CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,   -- public key id (also used in the URL to revoke)
  user_sub     TEXT NOT NULL,
  name         TEXT,               -- user-friendly label
  key_hash     TEXT NOT NULL,      -- sha-256 hex of the full secret key
  prefix       TEXT,               -- first chars of the key, for display ("mk_live_AbC…")
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_sub);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
