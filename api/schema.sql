-- Round 1 Fight online leaderboard (Neon Postgres). api/scores.js runs these statements lazily
-- (CREATE ... IF NOT EXISTS), so applying this file by hand is optional.

-- One table for both boards: day IS NULL = all-time arcade board, day = 'YYYY-MM-DD' (UTC) = that day's daily challenge.
CREATE TABLE IF NOT EXISTS scores (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  fighter    TEXT        NOT NULL,
  score      INTEGER     NOT NULL CHECK (score >= 0),
  wins       SMALLINT    NOT NULL DEFAULT 0 CHECK (wins BETWEEN 0 AND 12),
  champ      BOOLEAN     NOT NULL DEFAULT FALSE,
  day        DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scores_alltime_idx ON scores (score DESC) WHERE day IS NULL;
CREATE INDEX IF NOT EXISTS scores_day_idx     ON scores (day, score DESC);

-- Per-IP post log for rate limiting (ip is a salted SHA-256, never the raw address).
CREATE TABLE IF NOT EXISTS score_rate (
  ip TEXT        NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS score_rate_idx ON score_rate (ip, at DESC);
