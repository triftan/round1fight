// Phase 4 daily challenge (docs/PHASE4_SPEC.md): the date seeds every pick (same date -> same challenge, also after a
// reload), picks are valid, the intro screen, a full 3-fight run with forced wins, results (best of the day, day streak,
// share line), retries keep the best and pay the clear bonus once, the DAILY board tab, every modifier's effect, and that
// no modifier leaks into arcade or training afterwards.
// Run: NODE_PATH=<global node_modules> node tests/tdaily.js   (R1F_URL overrides the page URL, SHOTS a screenshot folder)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = process.env.R1F_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'r1f_daily_shots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (typeof info === 'string' ? info : JSON.stringify(info))));
const DATE = '2026-10-04';
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
      const d = new Date(t).toISOString().slice(0, 10), c = Daily.make(d); mods.add(c.mod); sigs.add(JSON.stringify([c.fighter, c.opps, c.stages, c.mod])); if (c.fighter < 0) any++;
      const okc = c.date === d && c.opps.length === 3 && new Set(c.opps).size === 3 && c.opps.every(o => ROSTER[o]) && !c.opps.includes(c.fighter) &&
        (c.fighter === -1 || ROSTER[c.fighter]) && c.stages.length === 3 && c.stages.every(x => STAGES[x] && STAGES[x].bg !== 'statedinner') && MODS.some(m => m.id === c.mod);
      if (!okc) bad.push(c);
    }
    Object.assign(out, { mods: mods.size, nMods: MODS.length, uniq: sigs.size, any, bad: bad.slice(0, 2), seed: Daily.seed(D), seed2: Daily.seed('2026-10-05') });
    Daily.override = null; out.today = Daily.today(); out.utc = new Date().toISOString().slice(0, 10);
    return out;
  }, DATE);
  ok('same date -> same challenge (two calls)', s.same, s.a);
  ok('a year of dates: every pick valid (3 distinct opponents, never you, real stages, no state dinner)', s.bad.length === 0, s.bad);
  ok('a year of dates: all 10 modifiers come up, challenges vary, some days are "any fighter"', s.mods === 10 && s.nMods === 10 && s.uniq > 300 && s.any > 30 && s.any < 150, s);
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
    return out;
  });
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
  await p.evaluate(() => { const F = __T.startMod('bighead'); for (let k = 0; k < 30; k++) F.update({}); F.p[1].x = F.p[0].x + 70; });
  await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, 'daily_bighead.png') });
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
