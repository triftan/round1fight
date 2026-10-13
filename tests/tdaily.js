// Phase 4 daily challenge (docs/PHASE4_SPEC.md): the date seeds every pick (same date -> same challenge, also after a
// reload), picks are valid, the intro screen, a full 3-fight run with forced wins, results (best of the day, day streak,
// share line), retries keep the best and pay the clear bonus once, the DAILY board tab, every modifier's effect, and that
// no modifier leaks into arcade or training afterwards.
// The holiday specials (DAILY_SPECIALS: Halloween 10-31, Christmas 12-25) replace the seeded pick on those dates every year; every other
// date must keep exactly the pick it had before the table existed (GOLDEN below was computed with the code before it).
// Run: NODE_PATH=<global node_modules> node tests/tdaily.js   (R1F_URL overrides the page URL, SHOTS a screenshot folder)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = process.env.R1F_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'r1f_daily_shots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (typeof info === 'string' ? info : JSON.stringify(info))));
const DATE = '2026-10-04';
// FNV hash over the picks [fighter, opps, stages, mod] of every date 2026-01-01..2027-12-31 except 10-31 and 12-25, computed with the code before DAILY_SPECIALS existed, plus a few readable samples
const GOLDEN = { hash: 3554396869, sample: { '2026-01-01': [8, [4, 0, 5], [4, 3, 8], 'sponly'], '2026-04-08': [6, [4, 5, 3], [6, 7, 2], 'sponly'], '2026-07-14': [6, [1, 2, 8], [0, 5, 2], 'rate'], '2026-10-19': [-1, [2, 6, 1], [6, 4, 4], 'glass'],
  '2027-01-24': [4, [2, 0, 6], [5, 10, 7], 'mirror'], '2027-05-01': [5, [6, 4, 7], [7, 5, 8], 'bighead'], '2027-08-06': [5, [3, 7, 2], [0, 7, 3], 'rate'], '2027-11-11': [4, [8, 0, 5], [8, 6, 3], 'mandate'] } };
// in-page helpers: get a fight to 'play', then win / lose the match with one forced KO (the other round is pre-awarded)
const HELPERS = () => {
  const { G } = __R1F;
  window.__T = {
    play(F) { for (let k = 0; k < 900 && F.phase !== 'play'; k++) F.update({}); },
    end(F, who) {
      this.play(F); const w = F.p[who], l = F.p[1 - who];
      F.wins[who] = 1; for (const f of F.p) { f.shield = 0; f.parry = 0; f.state = 'idle'; } l.hp = 1;
      F.applyHit(w, l, { dmg: 9999, kb: 2, launch: 1, unblock: 1, noParry: 1, grab: 1 }, who ? -1 : 1);
      for (let k = 0; k < 4000 && G.fight === F && G.state === 'fight'; k++) F.update({});
      return G.state;
    },
    toFight() { if (G.state === 'vs') __P3.startFight(); return G.state; },
    win() { this.toFight(); return this.end(G.fight, 0); },
    lose() { this.toFight(); return this.end(G.fight, 1); },
    // the first date from `from` whose challenge has modifier `mod`
    dateFor(mod, from = '2026-01-01') { let t = Date.parse(from + 'T00:00:00Z'); for (let i = 0; i < 2000; i++, t += 864e5) { const d = new Date(t).toISOString().slice(0, 10); if (__R1F.Daily.make(d).mod === mod) return d; } return null; },
    startDate(d, pickId) { __R1F.daily.setDate(d); G.pick = __R1F.CAST.findIndex(x => x.id === (pickId || 'tramp')); __R1F.startDaily(); this.toFight(); this.play(G.fight); return G.fight; },
    startMod(mod, pickId) {
      const d = this.dateFor(mod); __R1F.daily.setDate(d);
      const ch = __R1F.Daily.make(d); if (ch.fighter < 0) G.pick = __R1F.CAST.findIndex(x => x.id === (pickId || 'tramp'));
      __R1F.startDaily(); this.toFight(); this.play(G.fight); return G.fight;
    },
  };
};

(async () => {
  const b = await chromium.launch(); const errs = [];
  try { await main(b, errs); } catch (e) { errs.push('test crashed: ' + e.message.split('\n')[0]); }
  await b.close();
  for (const r of results) console.log(r);
  if (errs.length) console.log(errs.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length + errs.length;
  console.log(fails ? `TDAILY ${fails} FAILED of ${results.length}` : `TDAILY OK ${results.length}`);
  process.exit(fails ? 1 : 0);
})();
async function main(b, errs) {
  const page = async vp => {
    const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 720 } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    await p.goto(URL); await p.waitForTimeout(1300); await p.evaluate(HELPERS); return p;
  };
  const p = await page();
  // ------------------------------------------------------------ seeding
  const s = await p.evaluate(D => {
    const { Daily, ROSTER, STAGES, MODS } = __R1F, a = Daily.make(D), b2 = Daily.make(D), out = { a, same: JSON.stringify(a) === JSON.stringify(b2) };
    const mods = new Set(), sigs = new Set(), bad = []; let any = 0;
    let t = Date.parse('2026-01-01T00:00:00Z');
    for (let i = 0; i < 365; i++, t += 864e5) {
      const d = new Date(t).toISOString().slice(0, 10), c = Daily.make(d); if (!c.special) mods.add(c.mod); else { out.spec = (out.spec || 0) + 1; continue; }
      // (holiday specials are checked in their own section)
      sigs.add(JSON.stringify([c.fighter, c.opps, c.stages, c.mod])); if (c.fighter < 0) any++;
      const okc = c.date === d && c.opps.length === 3 && new Set(c.opps).size === 3 && c.opps.every(o => ROSTER[o]) && !c.opps.includes(c.fighter) &&
        (c.fighter === -1 || ROSTER[c.fighter]) && c.stages.length === 3 && c.stages.every(x => STAGES[x] && STAGES[x].bg !== 'statedinner') && MODS.some(m => m.id === c.mod);
      if (!okc) bad.push(c);
    }
    Object.assign(out, { mods: mods.size, nMods: MODS.length, uniq: sigs.size, any, bad: bad.slice(0, 2), seed: Daily.seed(D), lastMod: MODS[MODS.length - 1].id, seed2: Daily.seed('2026-10-05') });
    Daily.override = null; out.today = Daily.today(); out.utc = new Date().toISOString().slice(0, 10);
    return out;
  }, DATE);
  ok('same date -> same challenge (two calls)', s.same, s.a);
  ok('a year of dates: every pick valid (3 distinct opponents, never you, real stages, no state dinner)', s.bad.length === 0, s.bad);
  ok('a year of dates: all 11 modifiers come up (incl. SUPER INTELLIGENCE MANDATE, appended last), challenges vary, some days are "any fighter"', s.mods === 11 && s.nMods === 11 && s.lastMod === 'mandate' && s.uniq > 300 && s.any > 30 && s.any < 150, s);
  ok('different dates seed differently; no override = the UTC date', s.seed !== s.seed2 && s.today === s.utc, s);
  const known = JSON.stringify(s.a);
  await p.reload(); await p.waitForTimeout(1300); await p.evaluate(HELPERS);
  const again = await p.evaluate(D => JSON.stringify(__R1F.Daily.make(D)), DATE);
  ok('same date -> same challenge after a reload', again === known, { known, again });
  // ------------------------------------------------------------ intro screen (title button, fixed date)
  await p.evaluate(D => { localStorage.clear(); __R1F.Prof.d = null; __R1F.daily.setDate(D); __R1F.act('menu'); }, DATE);
  const btn = await p.$('#title [data-act=daily]');
  ok('title has a DAILY button (★ while today is unplayed)', !!btn && /DAILY ★/.test(await btn.textContent()), btn && await btn.textContent());
  await btn.click(); await p.waitForTimeout(300);
  const intro = await p.evaluate(() => ({ st: __R1F.G.state, vis: !document.getElementById('daily').hidden, mod: document.getElementById('dmodn').textContent, date: document.getElementById('ddate').textContent,
    cards: [...document.querySelectorAll('#drow .dcard b')].map(e => e.textContent), best: document.getElementById('dbest').textContent }));
  const ch = JSON.parse(known), modName = await p.evaluate(m => __R1F.MODS.find(x => x.id === m).name, ch.mod);
  ok('daily intro: date, modifier, you + 3 opponents, not played yet', intro.st === 'daily' && intro.vis && intro.mod === modName && /04 OCT 2026/.test(intro.date) && intro.cards.length === 4 && /NOT PLAYED/.test(intro.best), intro);
  await p.screenshot({ path: path.join(SHOTS, 'daily_intro.png') });
  // ------------------------------------------------------------ a full run: Enter starts it (via the select screen if the day is "any")
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  let st = await p.evaluate(() => ({ st: __R1F.G.state, sel: __R1F.G.dailySel, title: document.getElementById('selTitle').textContent }));
  if (ch.fighter < 0) { ok('an "any fighter" day goes through the select screen', st.st === 'select' && st.sel && /DAILY/.test(st.title), st); await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
  const run0 = await p.evaluate(() => { const { G, CAST } = __R1F; return { st: G.state, daily: !!G.daily, ladder: G.ladder.slice(), pick: CAST[G.pick].id, saved: !!localStorage.getItem('r1f_run') }; });
  const mir = ch.mod === 'mirror';
  ok('daily run starts on the VS screen with the seeded opponents, nothing saved to RESUME RUN', run0.st === 'vs' && run0.daily && !run0.saved &&
    JSON.stringify(run0.ladder) === JSON.stringify(mir ? run0.ladder.map(() => run0.ladder[0]) : ch.opps), { run0, ch });
  const per = [];
  for (let i = 0; i < 3; i++) {
    const f = await p.evaluate(() => { const { G, STAGES } = __R1F; __T.toFight(); const F = G.fight; return { st: G.state, stage: STAGES.indexOf(G.fight.stage) >= 0 ? STAGES.indexOf(F.stage) : STAGES.findIndex(s => s.name === F.stage.name), mods: Object.keys(F.mods), modName: F.modName, lvl: F.p[1].lvl, opp: F.p[1].def.id }; });
    per.push(f);
    const r = await p.evaluate(() => __T.end(__R1F.G.fight, 0));
    if (i < 2) ok(`daily fight ${i + 1} won -> next VS`, r === 'vs', r);
    else ok('third win -> results', r === 'result', r);
  }
  ok('each daily fight: the seeded stage, the modifier on the fight, rising AI', per.every((f, i) => f.stage === ch.stages[i] && f.mods.join() === ch.mod && f.modName === modName) && per[0].lvl < per[2].lvl, per);
  const res = await p.evaluate(() => ({ title: document.getElementById('rtitle').textContent, daily: !document.getElementById('rdaily').hidden, best: document.getElementById('rdbest').textContent,
    share: document.getElementById('rshare').textContent, score: __R1F.G.score, P: __R1F.Prof.get(), run: __R1F.G.run }));
  const shareRe = new RegExp('^Round 1 Fight daily 10/04: 3/3 wins, [\\d,]+ pts, ' + modName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
  ok('results: DAILY CLEARED, today\'s best, day streak, share line', /DAILY CLEARED/.test(res.title) && res.daily && /TODAY'S BEST/.test(res.best) && /DAILY STREAK 1 DAY/.test(res.best) && shareRe.test(res.share), res);
  ok('share line numbers match the score', res.share.includes(res.score.toLocaleString('en-US') + ' pts'), res);
  const db = res.P.daily;
  ok('profile: day played, best kept, cleared once (+20 RP on top of 3 wins)', db.days.includes(DATE) && db.best[DATE].score === res.score && db.best[DATE].wins === 3 && db.cleared.includes(DATE) && db.clears === 1 && res.P.rp >= 50, db);
  // the COPY button copies the share line
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await p.click('#rcopy'); await p.waitForTimeout(250);
  const clip = await p.evaluate(async () => { try { return await navigator.clipboard.readText(); } catch (e) { return 'ERR ' + e.message; } });
  ok('COPY puts the share line on the clipboard', clip === res.share, { clip, share: res.share });
  await p.screenshot({ path: path.join(SHOTS, 'daily_results.png') });
  // the daily board tab
  await p.fill('#rname', 'DAILYTEST'); await p.click('[data-act=submit]'); await p.waitForTimeout(600);
  const bd = await p.evaluate(async D => ({ vis: !document.getElementById('board').hidden, tab: __R1F.G.boardTab, rows: [...document.querySelectorAll('#btable tr')].map(r => r.textContent), title: document.getElementById('btitle').textContent,
    all: (await __R1F.Board.top(10)).map(e => e.name), day: (await __R1F.Board.top(10, D)).map(e => e.name + ':' + e.day), other: (await __R1F.Board.top(10, '2026-10-05')).length }), DATE);
  ok('save score -> the DAILY tab with today\'s entry; not on the all-time board or another day', bd.vis && bd.tab === 'daily' && bd.rows.some(r => /DAILYTEST/.test(r) && /3\/3/.test(r)) && !bd.all.includes('DAILYTEST') && bd.day.includes('DAILYTEST:' + DATE) && bd.other === 0, bd);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
  ok('left / right switch the board tabs', await p.evaluate(() => __R1F.G.boardTab === 'all' && document.getElementById('bworld').textContent === 'WORLD'), '');
  await p.screenshot({ path: path.join(SHOTS, 'daily_board.png') });
  // ------------------------------------------------------------ a retry that loses: best kept, no second clear bonus, back via PLAY AGAIN
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const retry = await p.evaluate(D => {
    const { G, Prof } = __R1F, rp0 = Prof.get().rp, best0 = Prof.get().daily.best[D].score;
    __R1F.act('again'); const st0 = G.state; __R1F.act('dailygo'); if (G.state === 'select') __R1F.act('fight');
    const s1 = __T.lose();
    return { st0, s1, title: document.getElementById('rtitle').textContent, best: Prof.get().daily.best[D].score, best0, rp: Prof.get().rp, rp0, clears: Prof.get().daily.clears, share: document.getElementById('rshare').textContent, streak: Prof.get().streak };
  }, DATE);
  ok('PLAY AGAIN on a daily result reopens the daily', retry.st0 === 'daily', retry);
  ok('a losing retry: DAILY OVER, best score kept, no new clear bonus (only the -3 loss), win streak reset', retry.s1 === 'result' && /DAILY OVER/.test(retry.title) && retry.best === retry.best0 && retry.clears === 1 && retry.rp === retry.rp0 - 3 && retry.streak === 0 && /: 0\/3 wins/.test(retry.share), retry);
  // ------------------------------------------------------------ every modifier
  const m = await p.evaluate(() => {
    const { G, STAGES, Fight, ROSTER } = __R1F, out = {};
    const T = __T, tramp = ROSTER[0];
    // BIG HEAD: the fight carries it and the head boxes resolve
    let F = T.startMod('bighead'); out.big = { mods: F.mods, hb: !!__R1F.headBox(F.p[0].def.id, 'stance'), draw: (() => { try { F.draw(); return true; } catch (e) { return e.message; } })() };
    // LOW GRAVITY: a floatier copy of the stage; the shared stage table is untouched
    F = T.startMod('lowg'); const base = STAGES.find(s => s.name === F.stage.name); out.lowg = { g: F.stage.g, g0: base.g, jv: F.stage.jv, jv0: base.jv, copy: F.stage !== base };
    // TARIFF TAX: a landed hit costs 1% of the score
    F = T.startMod('tariff'); F.base = 100000; F.score = 0; F.p[1].state = 'idle'; F.p[1].hp = 999;
    const r1 = F.applyHit(F.p[0], F.p[1], { dmg: 5, kb: 1 }, 1); out.tariff = { r1, score: F.score, pop: F.pops.some(x => /TARIFF/.test(x.s)) };
    // GLASS CANNON / SPECIALS ONLY: damage of one normal vs a plain fight
    const dmgOf = (mods, normal) => { const f = new Fight(tramp, ROSTER[1], STAGES[0], { c1: 'human', c2: 'ai', mods }); T.play(f); const a = f.p[0], d = f.p[1]; d.state = 'idle'; d.holdBack = false; const A = { dmg: 10, kb: 1 }; if (normal) { a.state = 'attack'; a.atk = A; } const h0 = d.hp; f.applyHit(a, d, A, 1); return +(h0 - d.hp).toFixed(3); };
    out.dmg = { plain: dmgOf(null, true), glass: dmgOf({ glass: 1 }, true), sponlyNormal: dmgOf({ sponly: 1 }, true), sponlySpecial: dmgOf({ sponly: 1 }, false), plainSpecial: dmgOf(null, false) };
    // HYPER SPEED: 8 game ticks run 10 fight updates
    F = T.startMod('hyper'); const f0 = F.frame; for (let i = 0; i < 8; i++) tick(); out.hyper = { n: F.frame - f0 };
    // NO BLOCK: a blocking defender still gets hit; the block button is stripped
    F = T.startMod('noblock'); { const d = F.p[1]; d.state = 'block'; d.holdBack = true; d.facing = -1; out.noblock = { r: F.applyHit(F.p[0], d, { dmg: 3, kb: 1 }, 1), b: F.ctl(F.p[0], { ...{ l: 0, r: 0, u: 0, d: 0, b: 1, lp: 0, hp: 0, lk: 0, hk: 0, sp: 0 } }).b }; }
    // RATE LIMITED: a second special within 3 s is refused
    F = T.startMod('rate'); { const a = F.p[0]; a.state = 'idle'; F.startSpecial(a, 'S1', 0); const s1 = a.state; for (let k = 0; k < 90; k++) F.update({}); a.state = 'idle'; a.mv = null; F.projs.length = 0; F.startSpecial(a, 'S2', 0); const s2 = a.state, cd = a.rateCd, pop = F.pops.some(x => /RATE LIMITED/.test(x.s)); for (let k = 0; k < 200; k++) F.update({}); a.state = 'idle'; F.projs.length = 0; F.startSpecial(a, 'S2', 0); out.rate = { s1, s2, cd, s3: a.state, pop }; }
    // MIRROR MATCH: three of you, the opponent in another palette
    F = T.startMod('mirror', 'zuck'); out.mirror = { ladder: G.ladder.map(i => __R1F.CAST[i].id), me: __R1F.CAST[G.pick].id, p1: F.p[0].pal, p2: F.p[1].pal, ids: F.p.map(f => f.def.id) };
    // POWER SURGE: full bars, double gain
    F = T.startMod('surge'); { const a = F.p[0]; const m0 = [F.p[0].meter, F.p[1].meter]; a.meter = 0; F.gainMeter(a, 10); out.surge = { m0, gain: a.meter }; }
    // SUPER INTELLIGENCE MANDATE: CPU at max level, score x1.5, this fight only
    F = T.startMod('mandate'); { const n0 = F.score; F.addScore(100); out.mandate = { lvl: F.p[1].lvl, gain: F.score - n0, mods: Object.keys(F.mods), name: F.modName }; }
    F = T.startMod('surge'); { const n0 = F.score; F.addScore(100); out.noMandate = { lvl: F.p[1].lvl, gain: F.score - n0 }; }
    return out;
  });
  const decoy = await p.evaluate(() => { // Sam's deepfake decoy gets the big head too (a small-headed copy would give itself away)
    const { Fight, ROSTER, STAGES } = __R1F; const F = new Fight(ROSTER.find(d => d.id === 'sam'), ROSTER[0], STAGES[0], { c1: 'human', c2: 'dummy', mods: { bighead: 1 } }), me = F.p[0];
    __T.play(F); me.state = 'idle'; F.startSpecial(me, 'S4', 0); for (let k = 0; k < 6; k++) F.update({});
    const seen = [], orig = window.drawFrame; window.drawFrame = (c, id, name, x, y, flip, o) => { seen.push({ name, big: o && o.big }); return orig(c, id, name, x, y, flip, o); };
    try { F.draw(); } finally { window.drawFrame = orig; }
    return { proj: F.projs.some(q => q.beh === 'decoy'), calls: seen.length, small: seen.filter(x => !x.big).length };
  });
  ok('BIG HEAD MODE: the deepfake decoy wears the big head as well', decoy.proj && decoy.calls >= 3 && decoy.small === 0, decoy);
  ok('BIG HEAD MODE: on the fight, head boxes found, frames draw', m.big.mods.bighead && m.big.hb && m.big.draw === true, m.big);
  ok('LOW GRAVITY: lower gravity on a copy of the stage, the stage table untouched', m.lowg.copy && m.lowg.g < m.lowg.g0 * .7 && m.lowg.jv < m.lowg.jv0, m.lowg);
  ok('TARIFF TAX: a landed hit costs 1% of the score', m.tariff.r1 === 'hit' && m.tariff.pop && m.tariff.score < 0, m.tariff);
  ok('GLASS CANNON: double damage', Math.abs(m.dmg.glass - 2 * m.dmg.plain) < .01, m.dmg);
  ok('SPECIALS ONLY: normals do 25%, specials full', Math.abs(m.dmg.sponlyNormal - .25 * m.dmg.plain) < .01 && Math.abs(m.dmg.sponlySpecial - m.dmg.plainSpecial) < .01, m.dmg);
  ok('HYPER SPEED: 1.25x updates', m.hyper.n === 10, m.hyper);
  ok('NO BLOCK: a blocking defender is hit, no block button', m.noblock.r === 'hit' && !m.noblock.b, m.noblock);
  ok('RATE LIMITED: second special inside 3 s refused, allowed after', m.rate.s1 === 'special' && m.rate.s2 !== 'special' && m.rate.cd > 0 && m.rate.pop && m.rate.s3 === 'special', m.rate);
  ok('MIRROR MATCH: all three opponents are you, in another palette', m.mirror.ladder.length === 3 && m.mirror.ladder.every(x => x === m.mirror.me) && m.mirror.ids.join() === m.mirror.me + ',' + m.mirror.me && m.mirror.p1 !== m.mirror.p2, m.mirror);
  ok('POWER SURGE: bars start full, gain doubled', m.surge.m0[0] === 100 && m.surge.m0[1] === 100 && m.surge.gain === 20, m.surge);
  ok('SUPER INTELLIGENCE MANDATE: CPU level 1, score x1.5, scoped to this fight (other mods: normal level, x1)', m.mandate.lvl === 1 && m.mandate.gain === Math.round(m.noMandate.gain * 1.5) && m.mandate.mods.join() === 'mandate' && /MANDATE/.test(m.mandate.name) && m.noMandate.lvl < 1 && m.mandate.gain > m.noMandate.gain, m);
  await p.evaluate(() => { const F = __T.startMod('bighead'); for (let k = 0; k < 30; k++) F.update({}); F.p[1].x = F.p[0].x + 70; });
  await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, 'daily_bighead.png') });
  // MIRROR MATCH as THE SINGULARITY (an "any fighter" day): the mirror is a normal opponent, not the arcade boss's extra health
  const singMir = await p.evaluate(() => {
    const { G, CAST } = __R1F; localStorage.setItem('r1f_unlock_sing', '1');
    let t = Date.parse('2026-01-01T00:00:00Z'), d = null;
    for (let i = 0; i < 3000 && !d; i++, t += 864e5) { const x = new Date(t).toISOString().slice(0, 10), c = __R1F.Daily.make(x); if (c.mod === 'mirror' && c.fighter < 0) d = x; }
    __R1F.daily.setDate(d); G.pick = CAST.findIndex(x => x.id === 'sing'); __R1F.startDaily(); __T.toFight();
    const F = G.fight; return { d, ids: F.p.map(f => f.def.id), hp: F.p.map(f => f.maxHp) };
  });
  ok('MIRROR MATCH as SING: same health on both sides (no boss HP in the daily)', singMir.ids.join() === 'sing,sing' && singMir.hp[0] === singMir.hp[1], singMir);
  // midnight UTC: START on a screen showing yesterday re-shows today's challenge; a run that crosses midnight keeps its date
  // on the board it opens after SAVE SCORE
  const mid = await p.evaluate(async () => {
    const { G, act } = __R1F, D1 = '2026-11-20', D2 = '2026-11-21';
    __R1F.daily.setDate(D1); act('menu'); act('daily'); const shown = document.getElementById('ddate').textContent;
    __R1F.daily.setDate(D2); act('dailygo'); const st = G.state, shown2 = document.getElementById('ddate').textContent;
    __R1F.daily.setDate(D1); act('daily'); act('dailygo'); if (G.state === 'select') act('fight');
    __T.win(); __T.win(); __R1F.daily.setDate(D2); const r = __T.win();
    document.getElementById('rname').value = 'MIDNIGHT'; act('submit'); await new Promise(z => setTimeout(z, 500));
    return { shown, st, shown2, r, run: G.run && G.run.daily, tab: document.getElementById('tabDaily').textContent, rows: [...document.querySelectorAll('#btable tr')].map(x => x.textContent) };
  });
  ok('00:00 UTC on the daily screen: START shows the new day instead of starting it unseen', /20 NOV/.test(mid.shown) && mid.st === 'daily' && /21 NOV/.test(mid.shown2), mid);
  ok('a run crossing 00:00 UTC: saved and shown on its own date\'s board', mid.r === 'result' && mid.run === '2026-11-20' && /11\/20/.test(mid.tab) && mid.rows.some(x => /MIDNIGHT/.test(x)), mid);
  // ------------------------------------------------------------ holiday specials
  const sp = await p.evaluate(GOLD => {
    const { Daily, CAST, STAGES, DAILY_SPECIALS, MODS } = __R1F, out = { picks: {}, normal: {} };
    const ids = c => c.opps.map(i => CAST[i].id), bgs = c => c.stages.map(i => STAGES[i].bg);
    for (const d of ['2026-10-31', '2027-10-31', '2026-12-25', '2027-12-25']) { const c = Daily.make(d); out.picks[d] = { special: c.special, fighter: c.fighter, opps: ids(c), stages: bgs(c), mod: c.mod, again: JSON.stringify(Daily.make(d)) === JSON.stringify(c) }; }
    for (const d of ['2026-10-30', '2026-11-01', '2026-12-24', '2026-12-26', '2027-10-30', '2027-12-31']) out.normal[d] = !Daily.make(d).special;
    // normal dates: the hash over two years of picks (all but the two special dates) equals the pre-change one; samples match
    let h = 2166136261, t = Date.parse('2026-01-01T00:00:00Z'); const modsSeen = new Set();
    for (let i = 0; i < 730; i++, t += 864e5) { const d = new Date(t).toISOString().slice(0, 10); if (Daily.special(d)) continue; const c = Daily.make(d), s = JSON.stringify([c.fighter, c.opps, c.stages, c.mod]); modsSeen.add(c.mod); for (const ch of d + s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } }
    out.hash = h >>> 0; out.samples = Object.keys(GOLD.sample).every(d => { const c = Daily.make(d); return JSON.stringify([c.fighter, c.opps, c.stages, c.mod]) === JSON.stringify(GOLD.sample[d]); });
    out.modsSeen = [...modsSeen].sort().join(); out.inMods = MODS.some(m => m.id === 'haunted' || m.id === 'xmas'); out.table = Object.keys(DAILY_SPECIALS);
    // a full YYYY-MM-DD key overrides that one date only (and wins over MM-DD)
    DAILY_SPECIALS['2031-03-17'] = Object.assign({}, DAILY_SPECIALS['12-25'], { key: 'xmas', name: 'ONE-OFF' }); out.oneOff = [Daily.special('2031-03-17').name, Daily.special('2032-03-17'), Daily.special('2031-12-25').name]; delete DAILY_SPECIALS['2031-03-17'];
    return out;
  }, GOLDEN);
  const SP = { halloween: { fighter: -1, opps: ['zuck', 'mask', 'sing'], stages: ['void', 'metaroof', 'void'], mod: 'haunted' }, xmas: { fighter: -1, opps: ['jensen', 'sam', 'tramp'], stages: ['statedinner', 'valley', 'maralago'], mod: 'xmas' } };
  const spOk = (d, k) => { const x = sp.picks[d], e = SP[k]; return x.special === k && x.fighter === e.fighter && x.opps.join() === e.opps.join() && x.stages.join() === e.stages.join() && x.mod === e.mod && x.again; };
  ok('Halloween 10-31 (2026 and 2027): any fighter, Zuck, Mask, THE SINGULARITY on The Void / Meta rooftop / The Void, haunted', spOk('2026-10-31', 'halloween') && spOk('2027-10-31', 'halloween'), sp.picks);
  ok('Christmas 12-25 (2026 and 2027): any fighter, Jensen, Sam, Tramp on State Dinner / Silicon Valley HQ / Mar-a-Lago, xmas', spOk('2026-12-25', 'xmas') && spOk('2027-12-25', 'xmas'), sp.picks);
  ok('the day before / after a special is automatic, not special', Object.values(sp.normal).every(Boolean), sp.normal);
  ok('normal dates unchanged: the hash of every pick over 2026-2027 (minus the 2 special dates) and 8 samples equal the pre-change ones', sp.hash === GOLDEN.hash && sp.samples, { hash: sp.hash, want: GOLDEN.hash, samples: sp.samples });
  ok('haunted / xmas are special-only: not in MODS, never picked on a normal date', !sp.inMods && !/haunted|xmas/.test(sp.modsSeen), sp);
  ok('a full YYYY-MM-DD key overrides one date only; the table has the two MM-DD entries', sp.oneOff[0] === 'ONE-OFF' && sp.oneOff[1] === null && sp.oneOff[2] === 'SILENT NIGHT FIGHT' && sp.table.join() === '10-31,12-25', sp);
  // --- Halloween run
  await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; __R1F.daily.setDate('2026-10-31'); __R1F.act('menu'); });
  const hi = await p.evaluate(() => { __R1F.goDaily(); const q = id => document.getElementById(id); return { btn: document.querySelector('#title [data-act=daily]').textContent, news: document.getElementById('ntrack').textContent, vis: !q('dspec').hidden, n: q('dspecn').textContent, d: q('dspecd').textContent, mod: q('dmodn').textContent,
    cards: [...document.querySelectorAll('#drow .dcard b')].map(e => e.textContent), stages: [...document.querySelectorAll('#drow .dcard i')].map(e => e.textContent), hint: q('dhint').textContent }; });
  ok('Halloween intro: pumpkin badge, NIGHT OF THE LIVING TECH BROS, TRICK OR TREAT. MOSTLY TRICK., HAUNTED, the 3 opponents and stages, ANY fighter', hi.vis && /^🎃 NIGHT OF THE LIVING TECH BROS 🎃$/.test(hi.n) && /TRICK OR TREAT\. MOSTLY TRICK\./.test(hi.d) && /PUMPKIN SPICE/.test(hi.d) && hi.mod === 'HAUNTED' &&
    hi.cards.join() === 'ANY,ZUCK,MASK,SINGULARITY' && hi.stages.join().includes('THE VOID,META DATA-CENTER ROOFTOP,THE VOID'), hi);
  ok('title: DAILY ★ button wears the 🎃 badge and the ticker leads with the Halloween headline (NEWS itself untouched)', /^🎃 DAILY ★$/.test(hi.btn) && /^HALLOWEEN: TECH BROS RISE/.test(hi.news) && hi.news.includes(await p.evaluate(() => __R1F.NEWS[0])), hi);
  await p.screenshot({ path: path.join(SHOTS, 'daily_halloween_intro.png') });
  const hl = await p.evaluate(() => {
    const { G, CAST, Fight } = __R1F; const T = __T, out = { fights: [], ghost: [] }; G.pick = CAST.findIndex(x => x.id === 'dario'); __R1F.startDaily();
    out.ladder = G.ladder.map(i => CAST[i].id); out.vsLine = G.vsLines.map(l => l.s); out.vsPal = G.vsPal.slice();
    for (let i = 0; i < 3; i++) {
      T.toFight(); const F = G.fight; T.play(F);
      const seen = []; const orig = window.drawFrame; window.drawFrame = (c, id, name, x, y, flip, o) => { seen.push({ id, a: o && o.alpha, hat: o && o.hat }); return orig(c, id, name, x, y, flip, o); };
      const alphas = []; try { for (let k = 0; k < 300; k++) { F.update({}); F.draw(); const me = seen.filter(z => z.id === 'dario'), op = seen.filter(z => z.id !== 'dario'); if (op.length) alphas.push(op[op.length - 1].a); seen.length = 0; } } finally { window.drawFrame = orig; }
      out.fights.push({ id: F.p[1].def.id, mods: Object.keys(F.mods).join(), name: F.modName, pal2: F.p[1].pal, stage: F.stage.bg, min: +Math.min(...alphas).toFixed(2), max: +Math.max(...alphas).toFixed(2), hat: F.mods.xmas || null });
      const r = T.end(F, 0); out.fights[i].next = r;
    }
    out.res = { share: document.getElementById('rshare').textContent, sub: document.getElementById('rsub').textContent, title: document.getElementById('rtitle').textContent };
    out.P = __R1F.Prof.palUnlocked('dario').slice(4); out.other = __R1F.Prof.palUnlocked('tramp').slice(4); out.hol = __R1F.Prof.get().hol;
    return out;
  });
  ok('Halloween run: ladder Zuck, Mask, SINGULARITY; the fight carries ONLY haunted; stages as picked; Zuck in METAVERSE BLUE; special VS lines', hl.ladder.join() === 'zuck,mask,sing' && hl.fights.every(f => f.mods === 'haunted' && f.name === 'HAUNTED') && hl.fights.map(f => f.stage).join() === 'void,metaroof,void' && hl.fights[0].pal2 === 3 && hl.fights[1].pal2 === 0 && /METAVERSE GHOST/.test(hl.vsLine[0]) && hl.vsPal[1] === 3, hl);
  ok('HAUNTED: the opponent is drawn at 0.55 opacity and dips to ~0.15 every few seconds (never fully gone); you stay solid', hl.fights.every(f => f.max === .55 && f.min <= .17 && f.min >= .1), hl.fights);
  ok('Halloween cleared: share line has the special name, results show it, PUMPKIN SPICE unlocked for the fighter you used only', /^Round 1 Fight daily 10\/31: 3\/3 wins, [\d,]+ pts, 🎃 NIGHT OF THE LIVING TECH BROS \(HAUNTED\)$/.test(hl.res.share) && /NIGHT OF THE LIVING TECH BROS/.test(hl.res.sub) && /DAILY CLEARED/.test(hl.res.title) &&
    JSON.stringify(hl.P) === '[true,false]' && JSON.stringify(hl.other) === '[false,false]' && hl.hol.halloween.join() === 'dario', hl);
  await p.screenshot({ path: path.join(SHOTS, 'daily_halloween_result.png') });
  // the haunted fight draws without errors and cheaply; nothing leaks into arcade / training / the next normal date
  const hf = await p.evaluate(() => {
    const T = __T, F = T.startDate('2026-10-31', 'tramp'); F.p[1].x = F.p[0].x + 80; const t0 = performance.now(); for (let k = 0; k < 120; k++) { F.update({}); F.draw(); } const ms = (performance.now() - t0) / 120;
    return { ms: +ms.toFixed(2), moon: !!__R1F.G.fight.mods.haunted };
  });
  ok('HAUNTED: update + draw stays cheap (< 12 ms a frame headless)', hf.ms < 12 && hf.moon, hf);
  // --- Christmas run (2027)
  await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; __R1F.daily.setDate('2027-12-25'); __R1F.act('menu'); });
  const xi = await p.evaluate(() => { __R1F.goDaily(); const q = id => document.getElementById(id); return { btn: document.querySelector('#title [data-act=daily]').textContent, news: document.getElementById('ntrack').textContent, n: q('dspecn').textContent, d: q('dspecd').textContent, mod: q('dmodn').textContent,
    cards: [...document.querySelectorAll('#drow .dcard b')].map(e => e.textContent) }; });
  ok('Christmas intro + title: 🎄 badges, SILENT NIGHT FIGHT, HO HO HO. YOU\'RE ALL ON THE NAUGHTY LIST., GIFT WRAPPED, Jensen / Sam / Tramp, seasonal headline', /^🎄 DAILY ★$/.test(xi.btn) && /^SANTA CHECKS THE LIST/.test(xi.news) && /^🎄 SILENT NIGHT FIGHT 🎄$/.test(xi.n) && xi.d.startsWith("HO HO HO. YOU'RE ALL ON THE NAUGHTY LIST.") && xi.d.includes('CANDY CANE') && xi.mod === 'GIFT WRAPPED' && xi.cards.join() === 'ANY,JENSEN,SAM,TRAMP', xi);
  await p.screenshot({ path: path.join(SHOTS, 'daily_xmas_intro.png') });
  const xl = await p.evaluate(() => {
    const { G, CAST } = __R1F; const T = __T, out = { fights: [] }; G.pick = CAST.findIndex(x => x.id === 'xi'); __R1F.startDaily(); out.vsLine = G.vsLines.map(l => l.s);
    for (let i = 0; i < 3; i++) {
      T.toFight(); const F = G.fight; T.play(F); const o = { opp: F.p[1].def.id, mods: Object.keys(F.mods).join(), stage: F.stage.bg };
      const calls = []; const orig = window.drawFrame; window.drawFrame = (c, id, name, x, y, flip, op) => { calls.push({ id, hat: op && op.hat, name }); return orig(c, id, name, x, y, flip, op); };
      try { F.update({}); F.draw(); } finally { window.drawFrame = orig; }
      o.hats = calls.filter(z => z.hat).length; o.calls = calls.length;
      // GIFT WRAPPED: the first hit you land this round drops a present; the second doesn't; walking over it gives +25% power
      const me = F.p[0], op = F.p[1]; me.meter = 10; op.state = 'idle'; op.hp = op.maxHp; me.x = 200; op.x = 240; me.y = op.y = 192;
      o.hit1 = F.applyHit(me, op, { dmg: 2, kb: 0 }, 1); o.g1 = F.gifts.length; op.state = 'idle'; o.hit2 = F.applyHit(me, op, { dmg: 2, kb: 0 }, 1); o.g2 = F.gifts.length;
      for (let k = 0; k < 80; k++) { F.update({}); F.draw(); op.state = 'idle'; } o.landed = F.gifts[0] && Math.round(F.gifts[0].y);
      me.x = F.gifts[0].x; me.state = 'idle'; me.y = 192; const m0 = me.meter; F.update({}); o.gain = me.meter - m0; o.g3 = F.gifts.length;
      // the enemy landing a hit gives nothing; a new round re-arms the present
      F.startRound(); o.afterRound = { gifts: F.gifts.length, armed: !F.giftRound };
      o.res = T.end(F, 0); out.fights.push(o);
    }
    out.res = { share: document.getElementById('rshare').textContent, title: document.getElementById('rtitle').textContent };
    out.P = __R1F.Prof.palUnlocked('xi').slice(4); out.other = __R1F.Prof.palUnlocked('tramp').slice(4); out.hol = __R1F.Prof.get().hol;
    return out;
  });
  ok('Christmas run: ladder Jensen, Sam, Tramp on State Dinner / Silicon Valley / Mar-a-Lago; ONLY xmas on the fight; special VS line for Jensen', xl.fights.map(f => f.opp).join() === 'jensen,sam,tramp' && xl.fights.every(f => f.mods === 'xmas') && xl.fights.map(f => f.stage).join() === 'statedinner,valley,maralago' && /GPUS/.test(xl.vsLine[0]), xl);
  ok('xmas: a Santa hat is drawn on every fighter (both of them)', xl.fights.every(f => f.hats === 2 && f.calls >= 2), xl.fights.map(f => [f.hats, f.calls]));
  ok('GIFT WRAPPED: first hit drops one present (the second hit does not), it lands on the floor, picking it up gives exactly +25% power, new round re-arms', xl.fights.every(f => f.hit1 === 'hit' && f.hit2 === 'hit' && f.g1 === 1 && f.g2 === 1 && f.landed === 192 && f.gain === 25 && f.g3 === 0 && f.afterRound.gifts === 0 && f.afterRound.armed), xl.fights);
  ok('Christmas cleared: share line has the special name, CANDY CANE unlocked for the fighter used only', /^Round 1 Fight daily 12\/25: 3\/3 wins, [\d,]+ pts, 🎄 SILENT NIGHT FIGHT \(GIFT WRAPPED\)$/.test(xl.res.share) && JSON.stringify(xl.P) === '[false,true]' && JSON.stringify(xl.other) === '[false,false]' && xl.hol.xmas.join() === 'xi', xl);
  await p.evaluate(() => { const F = __T.startDate('2027-12-25', 'xi'); F.p[1].x = F.p[0].x + 70; F.p[0].state = 'idle'; F.applyHit(F.p[0], F.p[1], { dmg: 2, kb: 0 }, 1); for (let k = 0; k < 50; k++) { F.update({}); F.p[1].state = 'idle'; } });
  await p.waitForTimeout(250); await p.screenshot({ path: path.join(SHOTS, 'daily_xmas_fight.png') });
  // --- nothing leaks: arcade, training and the next normal date after the specials
  const lk = await p.evaluate(() => {
    const { G, act, Daily } = __R1F; act('menu'); G.pick = 0; __P3.startArcade(); __P3.goVS(); __P3.startFight(); const A = G.fight;
    const a = { mods: Object.keys(A.mods).length, gifts: A.gifts.length, draw: (() => { A.draw(); return 1; })() };
    act('menu'); __R1F.daily.setDate('2026-12-26'); __R1F.goDaily(); const c = Daily.make('2026-12-26');
    const d = { spec: document.getElementById('dspec').hidden, btn: document.querySelector('#title [data-act=daily]').textContent, news: document.getElementById('ntrack').textContent.startsWith(__R1F.NEWS[0].slice(0, 20)), special: !!c.special };
    const F = __T.startDate('2026-12-26'); d.mods = Object.keys(F.mods).join(); d.name = F.modName;
    act('menu'); return { a, d };
  });
  ok('after the specials: arcade has no modifier / gifts; the next day has no badge, no seasonal headline and a normal modifier', lk.a.mods === 0 && lk.a.gifts === 0 && lk.d.spec && !/🎃|🎄/.test(lk.d.btn) && lk.d.news && !lk.d.special && lk.d.mods && !/haunted|xmas/.test(lk.d.mods), lk);
  // ------------------------------------------------------------ no leaks: arcade and training after a daily
  const leak = await p.evaluate(() => {
    const { G, STAGES, ROSTER, act } = __R1F;
    __T.startMod('glass'); act('menu');
    G.pick = 0; __P3.startArcade(); __P3.goVS(); __P3.startFight(); const F = G.fight;
    const a = { mods: Object.keys(F.mods).length, modName: F.modName, stageShared: STAGES.includes(F.stage), daily: G.daily, meter: F.p[0].meter };
    act('menu'); G.pick = 1; G.dummyPick = 2; act('training'); act('fight'); act('fight'); document.querySelector('#stagegrid button').click();
    const T = G.fight; const t = { mods: Object.keys(T.mods).length, stageShared: STAGES.includes(T.stage), training: T.training };
    act('menu'); return { a, t, title: G.state };
  });
  ok('after a daily: arcade fights carry no modifier, the real stage, empty bars, no daily state', leak.a.mods === 0 && !leak.a.modName && leak.a.stageShared && leak.a.daily === null && leak.a.meter === 0, leak.a);
  ok('after a daily: training carries no modifier', leak.t.mods === 0 && leak.t.stageShared && leak.t.training, leak.t);
  // ------------------------------------------------------------ phone layouts: the intro fits and starts by tap
  for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const q = await page(vp);
    await q.evaluate(D => { __R1F.daily.setDate(D); __R1F.goDaily(); }, DATE); await q.waitForTimeout(300);
    const fit = await q.evaluate(() => { const s = document.getElementById('screen').getBoundingClientRect(); return [...document.querySelectorAll('#daily .btn, #daily .dcard')].map(e => { const r = e.getBoundingClientRect(); return r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1 && r.bottom <= s.bottom + 1; }); });
    ok(`daily intro fits ${vp.width}x${vp.height}`, fit.length && fit.every(Boolean), fit);
    await q.screenshot({ path: path.join(SHOTS, `daily_intro_${vp.width}x${vp.height}.png`) });
    await q.click('[data-act=dailygo]'); await q.waitForTimeout(250);
    const st2 = await q.evaluate(() => __R1F.G.state);
    ok(`tap START at ${vp.width}x${vp.height} -> VS or select`, st2 === 'vs' || st2 === 'select', st2);
    await q.close();
  }
}
