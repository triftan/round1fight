// Front-end check of the online leaderboard: serve index.html from a tiny local http server that stubs /api/scores, then
// confirm the board says ONLINE LEADERBOARD, lists the API rows, uses ?day= on the daily tab, and a finished run POSTs its
// score (also kept locally). A second server without the API checks the fallback to LOCAL SCORES.
// Run: NODE_PATH=<global node_modules> node tests/tapiui.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const HTML = fs.readFileSync(path.resolve(__dirname, '../index.html'));
const results = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (typeof info === 'string' ? info : JSON.stringify(info))));

function serve(withApi) {
  const seen = { gets: [], posts: [] };
  const rows = [{ id: '1', name: 'NEON', fighter: 'XI', score: 4242, wins: 3, world: 3, champ: true, day: '', at: 1 }];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/api/scores' && withApi) {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST') { let b = ''; req.on('data', c => b += c); req.on('end', () => { const j = JSON.parse(b); seen.posts.push(j); rows.push({ id: '2', ...j, world: j.wins, at: 2 }); res.statusCode = 201; res.end(JSON.stringify({ ok: true, score: { id: '2' } })); }); return; }
      seen.gets.push(u.search);
      const day = u.searchParams.get('day');
      return res.end(JSON.stringify({ ok: true, scores: day ? [{ id: 'd1', name: 'DAYPLAYER', fighter: 'SAM', score: 777, wins: 2, world: 2, champ: false, day, at: 1 }] : rows.slice().sort((a, b) => b.score - a.score) }));
    }
    if (u.pathname === '/' || u.pathname === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(HTML); }
    res.statusCode = 404; res.end('nf');
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, seen, url: 'http://127.0.0.1:' + srv.address().port + '/' })));
}

(async () => {
  const b = await chromium.launch(); const errs = [];
  // ---- with API
  let S = await serve(true);
  let p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(S.url); await p.waitForTimeout(1500);
  ok('Board picked the api backend', await p.evaluate(() => __R1F.Board.src) === 'api');
  ok('probe used n=1', S.seen.gets[0] === '?n=1', S.seen.gets);
  await p.evaluate(() => __R1F.act('board')); await p.waitForTimeout(600);
  ok('board shows ONLINE LEADERBOARD', (await p.textContent('#bsrc')).includes('ONLINE LEADERBOARD'), await p.textContent('#bsrc'));
  ok('board lists api rows', (await p.textContent('#btable')).includes('NEON') && (await p.textContent('#btable')).includes('4,242'));
  await p.click('#tabDaily'); await p.waitForTimeout(500);
  ok('daily tab requests ?day=YYYY-MM-DD', S.seen.gets.some(g => /[?&]day=\d{4}-\d\d-\d\d/.test(g)), S.seen.gets);
  ok('daily rows rendered', (await p.textContent('#btable')).includes('DAYPLAYER'));
  // finish a run and save
  await p.evaluate(() => { const { G, act } = __R1F; G.pick = 1; G.score = 12000; G.ladder = [0, 1, 2]; G.stage = 1; G.submitted = false; act('menu'); });
  await p.evaluate(() => { const { G } = __R1F; G.run = { champ: false, score: 12000, fighter: 'MASK', world: 2 }; G.state = 'result'; document.getElementById('rname').value = 'Tester!'; });
  await p.evaluate(() => document.querySelector('[data-act="submit"]') && __R1F.act('submit')); await p.waitForTimeout(800);
  ok('score POSTed to api', S.seen.posts.length === 1 && S.seen.posts[0].score === 12000 && S.seen.posts[0].name === 'TESTER!' && S.seen.posts[0].fighter === 'MASK' && S.seen.posts[0].wins === 2 && !('day' in S.seen.posts[0]), S.seen.posts);
  ok('score also saved locally', await p.evaluate(() => JSON.parse(localStorage.getItem('r1f_scores') || '[]').some(e => e.score === 12000)));
  ok('board reloaded with new row', (await p.textContent('#btable')).includes('TESTER'), await p.textContent('#btable'));
  await p.close(); S.srv.close();
  // ---- without API (404 on /api) -> falls back to local
  S = await serve(false);
  p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(S.url); await p.waitForTimeout(2200);
  ok('no API: falls back to local', await p.evaluate(() => __R1F.Board.src) === 'local');
  await p.evaluate(() => __R1F.act('board')); await p.waitForTimeout(500);
  ok('no API: label is LOCAL SCORES', (await p.textContent('#bsrc')).includes('LOCAL SCORES'), await p.textContent('#bsrc'));
  await p.close(); S.srv.close();
  // ---- file:// stays local
  p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(2200);
  ok('file:// stays local', await p.evaluate(() => __R1F.Board.src) === 'local');
  ok('no page errors', errs.length === 0, errs);
  await b.close();
  console.log(results.join('\n')); const f = results.filter(x => x.startsWith('FAIL')).length;
  console.log(f ? f + ' FAILED' : 'ALL ' + results.length + ' PASSED'); process.exit(f ? 1 : 0);
})();
