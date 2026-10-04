// api/scores.js against an in-memory fake of the Neon sql function: validation, score cap, wins, day rule, daily filter,
// all-time vs daily separation, n cap, rate limit, caching headers, method handling.
// Run: node tests/tapi.js
const { createHandler, SCORE_CAP } = require('../api/scores.js');
const results = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));

function fakeDb() {
  const scores = [], rate = []; let id = 0; const log = [];
  const sql = async (text, p) => {
    log.push(text);
    if (/^CREATE/.test(text)) return [];
    if (/^DELETE FROM score_rate/.test(text)) return [];
    if (/SELECT count\(\*\)/.test(text)) return [{ n: rate.filter(r => r === p[0]).length }];
    if (/^INSERT INTO score_rate/.test(text)) { rate.push(p[0]); return []; }
    if (/^INSERT INTO scores/.test(text)) { const r = { id: ++id, name: p[0], fighter: p[1], score: p[2], wins: p[3], champ: p[4], day: p[5], created_at: new Date('2026-10-04T12:00:00Z') }; scores.push(r); return [r]; }
    if (/FROM scores WHERE day = \$1/.test(text)) return scores.filter(r => r.day === p[0]).sort((a, b) => b.score - a.score || a.id - b.id).slice(0, p[1]);
    if (/FROM scores WHERE day IS NULL/.test(text)) return scores.filter(r => !r.day).sort((a, b) => b.score - a.score || a.id - b.id).slice(0, p[0]);
    throw new Error('unexpected sql ' + text);
  };
  return { sql, scores, rate, log };
}
const NOW = new Date('2026-10-04T12:00:00Z');
function mk() { const db = fakeDb(); return { db, h: createHandler({ sql: db.sql, now: () => NOW }) }; }
async function call(h, method, url, body, ip) {
  const res = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(s) { this.body = s; } };
  await h({ method, url, body, headers: { 'x-forwarded-for': ip || '1.1.1.1' } }, res);
  return { code: res.statusCode, json: JSON.parse(res.body), headers: res.headers };
}
const good = (o) => Object.assign({ name: 'ACE', fighter: 'tramp', score: 12345, wins: 3, champ: false }, o);

(async () => {
  let { h, db } = mk();
  let r = await call(h, 'POST', '/api/scores', good());
  ok('valid post -> 201', r.code === 201 && r.json.ok && r.json.score.name === 'ACE' && r.json.score.fighter === 'TRAMP', r);
  ok('tables created lazily with indexes', db.log.filter(t => /^CREATE (TABLE|INDEX) IF NOT EXISTS/.test(t)).length === 5);
  ok('post is no-store', r.headers['cache-control'] === 'no-store');

  // validation
  const bad = async (name, body, re) => { const x = await call(h, 'POST', '/api/scores', body, '9.9.' + Math.random()); ok('400 ' + name, x.code === 400 && x.json.ok === false && (!re || re.test(x.json.error)), x); };
  await bad('empty name', good({ name: '' }), /name/);
  await bad('name only symbols', good({ name: '<>!?' }), /name/);
  await bad('missing name', good({ name: undefined }), /name/);
  await bad('unknown fighter', good({ fighter: 'bob' }), /fighter/);
  await bad('negative score', good({ score: -1 }), /score/);
  await bad('float score', good({ score: 1.5 }), /score/);
  await bad('NaN-ish score', good({ score: 'abc' }), /score/);
  await bad('score over cap', good({ score: SCORE_CAP + 1 }), /score/);
  await bad('wins 13', good({ wins: 13 }), /wins/);
  await bad('wins negative', good({ wins: -1 }), /wins/);
  await bad('day too old', good({ day: '2026-10-02' }), /today or yesterday/);
  await bad('day in future', good({ day: '2026-10-05' }), /today or yesterday/);
  await bad('day malformed', good({ day: '10/04/2026' }), /day/);
  await bad('day impossible date', good({ day: '2026-02-30' }), /day/);
  await bad('array body', [1], /JSON/);
  await bad('null body', null, /JSON/);
  r = await call(h, 'POST', '/api/scores', '{nope', undefined, '8.8.8.8'); ok('400 invalid JSON string', r.code === 400, r);

  // accepted edge values
  ({ h, db } = mk());
  r = await call(h, 'POST', '/api/scores', good({ score: SCORE_CAP, wins: 12, name: '  a<b>c  d.e_f-g!!  ', fighter: 'SINGULARITY' }));
  ok('cap and 12 wins accepted, name sanitized, short-name fighter mapped', r.code === 201 && r.json.score.name === 'abc d.e_f-g' && r.json.score.fighter === 'SINGULARITY' && db.scores[0].fighter === 'sing' && r.json.score.score === SCORE_CAP, r);
  r = await call(h, 'POST', '/api/scores', good({ name: 'ABCDEFGHIJKLMNOP' }), '2.2.2.2'); ok('name truncated to 12', r.json.score.name === 'ABCDEFGHIJKL', r);
  r = await call(h, 'POST', '/api/scores', good({ wins: undefined, world: 2 }), '2.2.2.3'); ok('"world" accepted as wins', r.code === 201 && r.json.score.wins === 2, r);
  for (const f of ['tramp', 'mask', 'xi', 'dario', 'sam', 'jensen', 'zuck', 'wong', 'xing', 'sing']) { r = await call(h, 'POST', '/api/scores', good({ fighter: f }), 'f.' + f); if (r.code !== 201) ok('fighter ' + f, false, r); }
  ok('all ten fighter ids accepted', db.scores.length >= 13);

  // daily vs all-time
  ({ h, db } = mk());
  await call(h, 'POST', '/api/scores', good({ name: 'ALLTIME', score: 500 }), '3.0.0.1');
  await call(h, 'POST', '/api/scores', good({ name: 'TODAY1', score: 900, day: '2026-10-04' }), '3.0.0.2');
  await call(h, 'POST', '/api/scores', good({ name: 'TODAY2', score: 1200, day: '2026-10-04' }), '3.0.0.3');
  await call(h, 'POST', '/api/scores', good({ name: 'YDAY', score: 700, day: '2026-10-03' }), '3.0.0.4');
  await call(h, 'POST', '/api/scores', good({ name: 'ZERO', score: 0, day: '' }), '3.0.0.5');
  r = await call(h, 'GET', '/api/scores?day=2026-10-04');
  ok('daily filter returns only that day, sorted desc', r.json.scores.map(s => s.name).join() === 'TODAY2,TODAY1' && r.json.scores.every(s => s.day === '2026-10-04'), r.json);
  r = await call(h, 'GET', '/api/scores?day=2026-10-03'); ok('yesterday board', r.json.scores.length === 1 && r.json.scores[0].name === 'YDAY');
  r = await call(h, 'GET', '/api/scores');
  ok('all-time excludes daily rows', r.json.scores.map(s => s.name).join() === 'ALLTIME,ZERO', r.json);
  ok('GET cache header s-maxage=10', /s-maxage=10/.test(r.headers['cache-control']), r.headers);
  r = await call(h, 'GET', '/api/scores?day=bogus'); ok('bad day on GET -> 400', r.code === 400);

  // n cap
  ({ h, db } = mk());
  for (let i = 0; i < 130; i++) db.scores.push({ id: i + 1, name: 'P' + i, fighter: 'xi', score: i, wins: 0, champ: false, day: null, created_at: NOW });
  r = await call(h, 'GET', '/api/scores?n=1000'); ok('n capped at 100', r.json.scores.length === 100 && r.json.scores[0].score === 129, r.json.scores.length);
  r = await call(h, 'GET', '/api/scores?n=1'); ok('n=1', r.json.scores.length === 1);
  r = await call(h, 'GET', '/api/scores'); ok('default n = 25', r.json.scores.length === 25);
  r = await call(h, 'GET', '/api/scores?n=-5'); ok('negative n falls back to >=1 row', r.code === 200 && r.json.scores.length >= 1);

  // rate limit
  ({ h, db } = mk());
  const codes = []; for (let i = 0; i < 12; i++) codes.push((await call(h, 'POST', '/api/scores', good({ score: i }), '7.7.7.7, 10.0.0.1')).code);
  ok('11th post from one IP is 429', codes.slice(0, 10).every(c => c === 201) && codes[10] === 429 && codes[11] === 429, codes);
  r = await call(h, 'POST', '/api/scores', good(), '7.7.7.8'); ok('other IP unaffected', r.code === 201);
  r = await call(h, 'POST', '/api/scores', good({ score: -5 }), '7.7.7.7'); ok('invalid input is 400 before rate counting', r.code === 400);
  ok('rejected posts were not stored', db.scores.length === 11, db.scores.length);
  ok('raw IP never stored', db.rate.every(k => !/7\.7/.test(k)));

  // misc
  r = await call(h, 'PUT', '/api/scores', {}); ok('PUT -> 405', r.code === 405);
  const broken = createHandler({ sql: async () => { throw new Error('boom'); } });
  r = await call(broken, 'GET', '/api/scores'); ok('db failure -> 500 json, no leak', r.code === 500 && r.json.ok === false && !/boom/.test(JSON.stringify(r.json)), r);

  console.log(results.join('\n')); const f = results.filter(x => x.startsWith('FAIL')).length;
  console.log(f ? f + ' FAILED' : 'ALL ' + results.length + ' PASSED'); process.exit(f ? 1 : 0);
})();
