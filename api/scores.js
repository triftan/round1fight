'use strict';
// Round 1 Fight online leaderboard: Vercel Node function (CommonJS) on Neon Postgres.
//   GET  /api/scores?n=25            all-time top scores
//   GET  /api/scores?day=YYYY-MM-DD  that day's daily-challenge board
//   POST /api/scores  {name,fighter,score,wins,champ,day?}
// Storage: Supabase when SUPABASE_URL + SUPABASE_KEY are set (calls the top_scores / post_score SQL functions in
// api/supabase.sql over REST), else Neon Postgres via DATABASE_URL or POSTGRES_URL.
const crypto = require('crypto');

const FIGHTERS = ['tramp', 'mask', 'xi', 'dario', 'sam', 'jensen', 'zuck', 'wong', 'xing', 'sing'];
// the client shows each fighter's short name (the id upper-cased; the boss is SINGULARITY)
const SHORT = Object.fromEntries(FIGHTERS.map(f => [f, f.toUpperCase()])); SHORT.sing = 'SINGULARITY';
const FROM_SHORT = Object.fromEntries([...FIGHTERS.map(id => [id, id]), ['singularity', 'sing']]); // id or short name, any case

// Score cap. A run is at most 11 fights (4 + bonus + 4 + rival + boss) and the multiplier is +1 per win, so the fight
// multipliers sum to 1+2+...+11 = 66. One fight's base score is damage*10 + combo bonuses (a 165 HP boss ~ 2k-4k),
// round win 1000 + hp*10 + time*25 + 3000 flawless, +10000 finisher, bonus stage <= ~10k, daily time bonus <= 12000.
// ~30k base per fight is generous, so 66 * 30k ~ 2M is a hard ceiling for honest play; double it plus headroom = 5M.
const SCORE_CAP = 5000000, MAX_WINS = 12;
const RATE_MAX = 10, RATE_WINDOW_MIN = 10;
const NAME_MAX = 12, N_DEFAULT = 25, N_MAX = 100;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const SETUP = [
  `CREATE TABLE IF NOT EXISTS scores (
    id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, fighter TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0), wins SMALLINT NOT NULL DEFAULT 0 CHECK (wins BETWEEN 0 AND 12),
    champ BOOLEAN NOT NULL DEFAULT FALSE, day DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  'CREATE INDEX IF NOT EXISTS scores_alltime_idx ON scores (score DESC) WHERE day IS NULL',
  'CREATE INDEX IF NOT EXISTS scores_day_idx ON scores (day, score DESC)',
  'CREATE TABLE IF NOT EXISTS score_rate (ip TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now())',
  'CREATE INDEX IF NOT EXISTS score_rate_idx ON score_rate (ip, at DESC)',
];

const isoDay = d => d.toISOString().slice(0, 10);
function validDay(s) { // real calendar date in YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(s + 'T00:00:00Z'); return !isNaN(t) && isoDay(new Date(t)) === s;
}
function cleanName(v) {
  const s = String(v == null ? '' : v).replace(/[^A-Za-z0-9 ._-]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  if (!s) throw new HttpError(400, 'name must have 1-' + NAME_MAX + ' letters, digits, spaces or . _ -');
  return s;
}
function validate(b, now) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'JSON object body required');
  const name = cleanName(b.name);
  const fighter = FROM_SHORT[String(b.fighter == null ? '' : b.fighter).toLowerCase()];
  if (!fighter) throw new HttpError(400, 'unknown fighter (use one of: ' + FIGHTERS.join(' ') + ')');
  const score = typeof b.score === 'string' && /^\d+$/.test(b.score) ? Number(b.score) : b.score;
  if (!Number.isInteger(score) || score < 0 || score > SCORE_CAP) throw new HttpError(400, 'score must be an integer 0-' + SCORE_CAP);
  const w = b.wins !== undefined ? b.wins : b.world !== undefined ? b.world : 0; // the client calls wins "world"
  if (!Number.isInteger(w) || w < 0 || w > MAX_WINS) throw new HttpError(400, 'wins must be an integer 0-' + MAX_WINS);
  let day = null;
  if (b.day !== undefined && b.day !== null && b.day !== '') {
    const today = isoDay(now), yday = isoDay(new Date(now.getTime() - 864e5));
    if (typeof b.day !== 'string' || !validDay(b.day)) throw new HttpError(400, 'day must be YYYY-MM-DD');
    if (b.day !== today && b.day !== yday) throw new HttpError(400, 'day must be today or yesterday (UTC)');
    day = b.day;
  }
  return { name, fighter, score, wins: w, champ: b.champ === true, day };
}
function clientIp(req) {
  const h = req.headers || {}, x = String(h['x-forwarded-for'] || h['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown');
  return x.split(',')[0].trim() || 'unknown';
}
const ipKey = ip => crypto.createHash('sha256').update('r1f:' + ip).digest('hex').slice(0, 32);
const row = r => ({ id: String(r.id), name: r.name, fighter: SHORT[r.fighter] || String(r.fighter).toUpperCase(), score: Number(r.score), wins: Number(r.wins), world: Number(r.wins),
  champ: !!r.champ, day: r.day ? (r.day instanceof Date ? isoDay(r.day) : String(r.day).slice(0, 10)) : '', at: new Date(r.created_at).getTime() });

// sql: async (text, params) => rows[]. now: () => Date (injectable for tests).
// store (optional): { top(day, n) => rows[], post(e, ipKey) => row } replaces the SQL path (Supabase).
function createHandler({ sql, store, now = () => new Date() }) {
  let ready = store ? Promise.resolve() : null;
  const ensure = () => ready || (ready = (async () => { for (const s of SETUP) await sql(s, []); })().catch(e => { ready = null; throw e; }));
  return async function handler(req, res) {
    const send = (code, obj, cache) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', cache || 'no-store'); res.end(JSON.stringify(obj)); };
    try {
      if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(405, { ok: false, error: 'method not allowed' }); }
      await ensure();
      if (req.method === 'GET') {
        const q = new URL(req.url || '/', 'http://x').searchParams;
        const n = Math.min(N_MAX, Math.max(1, Math.floor(Number(q.get('n'))) || N_DEFAULT)), day = q.get('day');
        if (day && !validDay(day)) throw new HttpError(400, 'day must be YYYY-MM-DD');
        const rows = store ? await store.top(day || null, n) : day
          ? await sql('SELECT id, name, fighter, score, wins, champ, day, created_at FROM scores WHERE day = $1 ORDER BY score DESC, id ASC LIMIT $2', [day, n])
          : await sql('SELECT id, name, fighter, score, wins, champ, day, created_at FROM scores WHERE day IS NULL ORDER BY score DESC, id ASC LIMIT $1', [n]);
        return send(200, { ok: true, scores: rows.map(row) }, 'public, s-maxage=10, stale-while-revalidate=30');
      }
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { throw new HttpError(400, 'invalid JSON'); } }
      const e = validate(body, now()), key = ipKey(clientIp(req));
      if (store) return send(201, { ok: true, score: row(await store.post(e, key)) });
      await sql(`DELETE FROM score_rate WHERE at < now() - interval '1 hour'`, []);
      const c = await sql(`SELECT count(*)::int AS n FROM score_rate WHERE ip = $1 AND at > now() - interval '${RATE_WINDOW_MIN} minutes'`, [key]);
      if (Number(c[0] && c[0].n) >= RATE_MAX) { res.setHeader('Retry-After', String(RATE_WINDOW_MIN * 60)); throw new HttpError(429, `too many scores, max ${RATE_MAX} per ${RATE_WINDOW_MIN} minutes`); }
      await sql('INSERT INTO score_rate (ip) VALUES ($1)', [key]);
      const r = await sql('INSERT INTO scores (name, fighter, score, wins, champ, day) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, fighter, score, wins, champ, day, created_at',
        [e.name, e.fighter, e.score, e.wins, e.champ, e.day]);
      return send(201, { ok: true, score: row(r[0]) });
    } catch (err) {
      if (err instanceof HttpError) return send(err.status, { ok: false, error: err.message });
      console.error('scores api error', err && err.message);
      if (err && err.status === 429) { res.setHeader('Retry-After', String(RATE_WINDOW_MIN * 60)); return send(429, { ok: false, error: `too many scores, max ${RATE_MAX} per ${RATE_WINDOW_MIN} minutes` }); }
      const noDb = !process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.SUPABASE_URL && /connection|DATABASE/i.test(String(err && err.message));
      return send(500, { ok: false, error: noDb ? 'database not configured' : 'server error' });
    }
  };
}

let live = null; // the real handler, built on first request from the env
function supabaseStore(base, key) {
  const rpc = async (fn, args) => {
    const r = await fetch(base.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { const m = String(j && (j.message || j.code) || r.status); const e = new Error(m); if (/rate limited|P0429/.test(m + (j && j.code))) e.status = 429; else if (/bad day/.test(m)) throw new HttpError(400, 'day must be today or yesterday (UTC)'); throw e; }
    return j;
  };
  return {
    top: (day, n) => rpc('top_scores', { p_day: day, p_n: n }),
    post: async (e, ip) => (await rpc('post_score', { p_ip: ip, p_name: e.name, p_fighter: e.fighter, p_score: e.score, p_wins: e.wins, p_champ: e.champ, p_day: e.day, p_max: RATE_MAX, p_window_min: RATE_WINDOW_MIN }))[0],
  };
}
function connect() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { neon } = require('@neondatabase/serverless');
  const q = neon(url);
  return (text, params) => q.query(text, params);
}
module.exports = async function (req, res) {
  if (!live) { try { live = process.env.SUPABASE_URL && process.env.SUPABASE_KEY ? createHandler({ store: supabaseStore(process.env.SUPABASE_URL, process.env.SUPABASE_KEY) }) : createHandler({ sql: connect() }); } catch (e) { console.error(e.message); res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ ok: false, error: 'database not configured' })); } }
  return live(req, res);
};
module.exports.createHandler = createHandler;
module.exports.supabaseStore = supabaseStore;
module.exports.SCORE_CAP = SCORE_CAP;
module.exports.FIGHTERS = FIGHTERS;
