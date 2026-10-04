-- Round 1 Fight leaderboard on Supabase (live project "round1fight"). api/scores.js calls the two functions over
-- REST with SUPABASE_URL + SUPABASE_KEY from the Vercel env. RLS is on with no table policies, so the tables are only
-- reachable through these SECURITY DEFINER functions (rate limit and score/day checks live in post_score too).
CREATE TABLE IF NOT EXISTS public.scores (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 12),
  fighter TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 5000000),
  wins SMALLINT NOT NULL DEFAULT 0 CHECK (wins BETWEEN 0 AND 12),
  champ BOOLEAN NOT NULL DEFAULT FALSE,
  day DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scores_alltime_idx ON public.scores (score DESC) WHERE day IS NULL;
CREATE INDEX IF NOT EXISTS scores_day_idx ON public.scores (day, score DESC);
CREATE TABLE IF NOT EXISTS public.score_rate (ip TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS score_rate_idx ON public.score_rate (ip, at DESC);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_rate ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.top_scores(p_day DATE DEFAULT NULL, p_n INT DEFAULT 25)
RETURNS TABLE (id BIGINT, name TEXT, fighter TEXT, score INT, wins SMALLINT, champ BOOLEAN, day DATE, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT s.id, s.name, s.fighter, s.score, s.wins, s.champ, s.day, s.created_at FROM scores s
  WHERE (p_day IS NULL AND s.day IS NULL) OR s.day = p_day
  ORDER BY s.score DESC, s.id ASC LIMIT LEAST(GREATEST(COALESCE(p_n, 25), 1), 100);
$fn$;

CREATE OR REPLACE FUNCTION public.post_score(p_ip TEXT, p_name TEXT, p_fighter TEXT, p_score INT, p_wins INT, p_champ BOOLEAN, p_day DATE, p_max INT DEFAULT 10, p_window_min INT DEFAULT 10)
RETURNS TABLE (id BIGINT, name TEXT, fighter TEXT, score INT, wins SMALLINT, champ BOOLEAN, day DATE, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE n INT;
BEGIN
  IF p_day IS NOT NULL AND p_day NOT IN ((now() AT TIME ZONE 'utc')::date, (now() AT TIME ZONE 'utc')::date - 1) THEN
    RAISE EXCEPTION 'bad day' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO n FROM score_rate r WHERE r.ip = p_ip AND r.at > now() - make_interval(mins => LEAST(p_window_min, 60));
  IF n >= LEAST(p_max, 10) THEN RAISE EXCEPTION 'rate limited' USING ERRCODE = 'P0429'; END IF;
  INSERT INTO score_rate (ip) VALUES (p_ip);
  RETURN QUERY INSERT INTO scores AS s (name, fighter, score, wins, champ, day)
    VALUES (p_name, p_fighter, p_score, p_wins, COALESCE(p_champ, FALSE), p_day)
    RETURNING s.id, s.name, s.fighter, s.score, s.wins, s.champ, s.day, s.created_at;
END $fn$;

GRANT EXECUTE ON FUNCTION public.top_scores(DATE, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_score(TEXT, TEXT, TEXT, INT, INT, BOOLEAN, DATE, INT, INT) TO anon, authenticated;
