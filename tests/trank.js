// Phase 4 win streaks, ranks and the profile (docs/PHASE4_SPEC.md): rank thresholds, rank points (win +10, perfect +5,
// fatality +5, daily clear +20, loss -3, floor 0), streaks and wins per fighter from real arcade matches (not the bonus
// stage, not training), the rank badge on the title and result screens, the rank-up banner, the PROFILE screen (title
// button, keyboard, phones), and the one versioned save key (sanitised, survives a reload).
// Run: NODE_PATH=<global node_modules> node tests/trank.js   (R1F_URL overrides the page URL, SHOTS a screenshot folder)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = process.env.R1F_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'r1f_rank_shots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (typeof info === 'string' ? info : JSON.stringify(info))));
const HELPERS = () => {
  const { G } = __R1F;
  window.__T = {
    play(F) { for (let k = 0; k < 900 && F.phase !== 'play'; k++) F.update({}); },
    // win / lose with a forced KO; flaw: the winner took no damage that round (a perfect)
    end(F, who, flaw) {
      this.play(F); const w = F.p[who], l = F.p[1 - who];
      F.wins[who] = 1; for (const f of F.p) { f.shield = 0; f.parry = 0; f.state = 'idle'; } l.hp = 1; if (!flaw) F.roundDmg[who] = 5;
      F.applyHit(w, l, { dmg: 9999, kb: 2, launch: 1, unblock: 1, noParry: 1, grab: 1 }, who ? -1 : 1);
      for (let k = 0; k < 4000 && G.fight === F && G.state === 'fight'; k++) F.update({});
      return G.state;
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
  console.log(fails ? `TRANK ${fails} FAILED of ${results.length}` : `TRANK OK ${results.length}`);
  process.exit(fails ? 1 : 0);
})();
async function main(b, errs) {
  const page = async vp => {
    const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 720 } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    await p.goto(URL); await p.waitForTimeout(1300); await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; }); await p.evaluate(HELPERS); return p;
  };
  const p = await page();
  // ------------------------------------------------------------ thresholds and points
  const r = await p.evaluate(() => {
    const { RANKS, Prof } = __R1F, at = rp => { Prof.get().rp = rp; return Prof.rank().name; };
    const o = { names: RANKS.map(x => x[0] + ' ' + x[1]), at: [0, 99, 100, 299, 300, 699, 700, 1499, 1500, 2999, 3000, 99999].map(at) };
    Prof.d = null; localStorage.clear(); const P = Prof.get();
    Prof.match('tramp', true, 0, false); o.win = P.rp;
    Prof.match('tramp', true, 2, true); o.perfFat = P.rp; // +10 +2x5 +5
    Prof.match('tramp', false, 0, false); o.loss = P.rp;
    P.rp = 1; Prof.match('xi', false, 0, false); o.floor = P.rp;
    P.rp = 0; const d = Prof.dailyDone('2026-10-04', { score: 5, wins: 3, fighter: 'xi', mod: 'glass' }, true); o.daily = P.rp; o.first = d.firstClear;
    const d2 = Prof.dailyDone('2026-10-04', { score: 9, wins: 3, fighter: 'xi', mod: 'glass' }, true); o.daily2 = P.rp; o.first2 = d2.firstClear; o.best = P.daily.best['2026-10-04'].score;
    o.stats = { wins: P.wins, losses: P.losses, streak: P.streak, best: P.best, perfects: P.perfects, fat: P.fatalities, tramp: Prof.fs('tramp'), xi: Prof.fs('xi') };
    return o;
  });
  ok('six ranks: Intern 0, Founder 100, Series A 300, Unicorn 700, Decacorn 1500, Trillionaire 3000', r.names.join() === 'INTERN 0,FOUNDER 100,SERIES A 300,UNICORN 700,DECACORN 1500,TRILLIONAIRE 3000', r.names);
  ok('rank boundaries', r.at.join() === 'INTERN,INTERN,FOUNDER,FOUNDER,SERIES A,SERIES A,UNICORN,UNICORN,DECACORN,DECACORN,TRILLIONAIRE,TRILLIONAIRE', r.at);
  ok('win +10; win with 2 perfects and a fatality +25; loss -3; floor 0', r.win === 10 && r.perfFat === 35 && r.loss === 32 && r.floor === 0, r);
  ok('daily clear +20, once per date (best score still updates)', r.daily === 20 && r.first && r.daily2 === 20 && !r.first2 && r.best === 9, r);
  ok('totals: wins, losses, streak reset by a loss, best streak kept, perfects, fatalities, per fighter', JSON.stringify(r.stats) === JSON.stringify({ wins: 2, losses: 2, streak: 0, best: 2, perfects: 2, fat: 1, tramp: { w: 2, l: 1, arcade: 0, daily: 0 }, xi: { w: 0, l: 1, arcade: 0, daily: 1 } }), r.stats);
  // ------------------------------------------------------------ real arcade matches
  await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; __R1F.act('menu'); });
  const a = await p.evaluate(() => {
    const { G, Prof } = __R1F, o = {};
    G.pick = 0; __P3.startArcade(); __P3.goVS(); __P3.startFight();
    o.s1 = __T.end(G.fight, 0, true); const P = Prof.get(); o.after1 = { wins: P.wins, streak: P.streak, rp: P.rp, perfects: P.perfects, w: Prof.fs('tramp').w };
    __P3.startFight(); o.s2 = __T.end(G.fight, 0, false); o.after2 = { wins: P.wins, streak: P.streak, rp: P.rp };
    __P3.startFight(); o.s3 = __T.end(G.fight, 1); o.after3 = { losses: P.losses, streak: P.streak, best: P.best, rp: P.rp, l: Prof.fs('tramp').l };
    // the bonus stage is not a match
    G.stage = G.ladder.indexOf(__P3.BONUS); G.state = 'vs'; __P3.goVS(); const F = G.fight; __T.play(F); const w0 = P.wins, l0 = P.losses;
    F.timer = 1; for (let k = 0; k < 2000 && G.fight === F && G.state === 'fight'; k++) F.update({});
    o.bonus = { st: G.state, bonus: !!F.bonus, wins: P.wins - w0, losses: P.losses - l0 };
    return o;
  });
  ok('arcade win (perfect): +1 win, streak 1, +15 RP, fighter wins 1', a.s1 === 'vs' && a.after1.wins === 1 && a.after1.streak === 1 && a.after1.rp === 15 && a.after1.perfects === 1 && a.after1.w === 1, a);
  ok('second win: streak 2, +10 RP', a.s2 === 'vs' && a.after2.wins === 2 && a.after2.streak === 2 && a.after2.rp === 25, a);
  ok('a loss (continue screen): streak back to 0, best streak 2, -3 RP', a.s3 === 'continue' && a.after3.losses === 1 && a.after3.streak === 0 && a.after3.best === 2 && a.after3.rp === 22 && a.after3.l === 1, a);
  ok('the bonus stage counts for nothing', a.bonus.bonus && a.bonus.wins === 0 && a.bonus.losses === 0, a.bonus);
  const tr = await p.evaluate(() => {
    const { G, Prof, act } = __R1F, w0 = Prof.get().wins + Prof.get().losses;
    act('menu'); G.pick = 2; act('training'); act('fight'); act('fight'); document.querySelector('#stagegrid button').click();
    const F = G.fight; __T.play(F); F.applyHit(F.p[0], F.p[1], { dmg: 9999, kb: 2, unblock: 1, grab: 1 }, 1); for (let k = 0; k < 600; k++) F.update({});
    const n = Prof.get().wins + Prof.get().losses - w0; act('menu'); return { n, training: F.training, phase: F.phase };
  });
  ok('training never counts', tr.n === 0 && tr.training, tr);
  // ------------------------------------------------------------ badges, banner
  await p.evaluate(() => __R1F.act('menu')); await p.waitForTimeout(200);
  const badge = await p.evaluate(() => ({ t: document.getElementById('trank').textContent, vis: document.getElementById('trank').offsetParent !== null }));
  ok('title rank badge shows rank and points', badge.vis && badge.t === '★ INTERN · 22 RP', badge);
  await p.evaluate(() => { const { Prof, Toast } = __R1F; Toast.q.length = 0; Toast.next(); Prof.get().rp = 95; Prof.save(); Prof.match('mask', true, 0, false); });
  await p.waitForTimeout(400);
  const up = await p.evaluate(() => ({ vis: !document.getElementById('toast').hidden, t: document.getElementById('toastT').textContent, s: document.getElementById('toastS').textContent, badge: document.getElementById('trank').textContent }));
  ok('crossing 100 RP: RANK UP! banner (FOUNDER), badge updated', up.vis && up.t === 'RANK UP!' && /FOUNDER/.test(up.s) && up.badge === '★★ FOUNDER · 105 RP', up);
  await p.screenshot({ path: path.join(SHOTS, 'rankup_banner.png') });
  await p.waitForTimeout(2900);
  ok('the banner clears itself', await p.evaluate(() => document.getElementById('toast').hidden), '');
  // on the results screen the banner sits above the title instead of over it (both phone orientations)
  for (const vp of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await p.setViewportSize(vp); await p.waitForTimeout(150);
    const ov = await p.evaluate(() => {
      const { G, Toast } = __R1F; G.pick = 0; __P3.startArcade(); __P3.goVS(); __P3.startFight();
      document.querySelectorAll('.scr').forEach(e => e.hidden = e.id !== 'result'); G.state = 'result';
      Toast.q.length = 0; Toast.show('RANK UP!', '★★ FOUNDER', '#ffd23a');
      const t = document.getElementById('toast').getBoundingClientRect(), h = document.getElementById('rtitle').getBoundingClientRect();
      Toast.q.length = 0; Toast.next(); return { tb: Math.round(t.bottom), ht: Math.round(h.top), th: Math.round(t.height) };
    });
    ok(`results screen ${vp.width}x${vp.height}: rank-up banner clear of the title`, ov.th > 0 && ov.tb <= ov.ht + 2, ov);
  }
  await p.setViewportSize({ width: 1280, height: 720 }); await p.evaluate(() => __R1F.act('menu'));
  // result screen badge
  const rb = await p.evaluate(() => { const { G } = __R1F; G.pick = 0; __P3.startArcade(); __P3.goVS(); __P3.startFight(); __T.end(G.fight, 1); __P3.contNo ? (G.contT = 99, __P3.contNo()) : 0; return { st: G.state, b: document.getElementById('rrank').textContent }; });
  ok('result screen shows the rank badge', rb.st === 'result' && /FOUNDER · \d+ RP/.test(rb.b), rb);
  // ------------------------------------------------------------ profile screen: title button, keyboard
  await p.evaluate(() => __R1F.act('menu')); await p.waitForTimeout(150);
  await p.click('#title .menu [data-act=profile]'); await p.waitForTimeout(250);
  const pr = await p.evaluate(() => ({ st: __R1F.G.state, vis: !document.getElementById('profile').hidden, rank: document.getElementById('prank').textContent, next: document.getElementById('pnext').textContent,
    stats: [...document.querySelectorAll('#pstats span')].map(e => e.textContent), rows: [...document.querySelectorAll('#pfight tr')].map(r => r.cells[0].textContent + ':' + r.cells[1].textContent + ':' + r.cells[2].children.length) }));
  ok('PROFILE: rank, points to next rank', pr.st === 'profile' && pr.vis && /FOUNDER/.test(pr.rank) && /TO SERIES A/.test(pr.next), pr);
  ok('PROFILE: streaks, daily streak, palettes unlocked', ['WIN STREAK', 'BEST STREAK', 'DAILY STREAK', 'PALETTES'].every(k => pr.stats.includes(k)), pr.stats);
  ok('PROFILE: wins per fighter with 4 palette dots each (SING hidden until unlocked)', pr.rows.length === 9 && pr.rows[0].startsWith('TRAMP:') && pr.rows.every(x => x.endsWith(':4')), pr.rows);
  await p.screenshot({ path: path.join(SHOTS, 'profile.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok('Esc leaves the profile', await p.evaluate(() => __R1F.G.state === 'title' && !document.getElementById('title').hidden), '');
  await p.click('#trank'); await p.waitForTimeout(150);
  ok('the title badge opens the profile too', await p.evaluate(() => __R1F.G.state === 'profile'), '');
  await p.click('#profile [data-act=back]'); await p.waitForTimeout(150);
  // ------------------------------------------------------------ the save: one versioned key, sanitised, survives a reload
  const sv = await p.evaluate(() => { const r = JSON.parse(localStorage.getItem('r1f_profile')); return { v: r.v, keys: Object.keys(localStorage).filter(k => k.startsWith('r1f_')), rp: r.rp }; });
  ok('one versioned key r1f_profile (v: 1)', sv.v === 1 && sv.rp > 0, sv);
  await p.evaluate(() => localStorage.setItem('r1f_profile', JSON.stringify({ v: 1, rp: 'lots', wins: -4, streak: '3', fighters: { tramp: { w: 'x', arcade: 'yes' }, nobody: { w: 5 } }, pal: { tramp: 9, xi: 2 }, daily: { days: ['2026-10-04', 'junk', 7], best: { '2026-10-04': { score: '12', wins: 9 }, nope: {} } } })));
  await p.reload(); await p.waitForTimeout(1300);
  const bad = await p.evaluate(() => { const P = __R1F.Prof.get(); return { rp: P.rp, wins: P.wins, streak: P.streak, tramp: P.fighters.tramp, nobody: !!P.fighters.nobody, pal: P.pal, days: P.daily.days, best: P.daily.best, badge: document.getElementById('trank').textContent, xiSel: __R1F.Prof.palSel('xi') }; });
  ok('a corrupted save is sanitised (numbers, known fighters, valid dates, palettes in range, locked pick ignored)', bad.rp === 0 && bad.wins === 0 && bad.streak === 3 && bad.tramp.w === 0 && bad.tramp.arcade === 1 && !bad.nobody && bad.pal.tramp === undefined && bad.pal.xi === 2 && bad.xiSel === 0 &&
    JSON.stringify(bad.days) === '["2026-10-04"]' && bad.best['2026-10-04'].score === 12 && bad.best['2026-10-04'].wins === 3 && !bad.best.nope && bad.badge === '★ INTERN · 0 RP', bad);
  await p.evaluate(() => { localStorage.setItem('r1f_profile', JSON.stringify({ v: 1, rp: 777, wins: 3 })); });
  await p.reload(); await p.waitForTimeout(1300);
  ok('the profile survives a reload', await p.evaluate(() => __R1F.Prof.get().rp === 777 && document.getElementById('trank').textContent === '★★★★ UNICORN · 777 RP'), '');
  // ------------------------------------------------------------ phones: profile and title badge fit, open by tap
  for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const q = await page(vp);
    await q.evaluate(() => { __R1F.Prof.get().rp = 340; __R1F.act('menu'); });
    await q.click('#trank'); await q.waitForTimeout(250);
    const fit = await q.evaluate(() => { const s = document.getElementById('screen').getBoundingClientRect(), pr = document.getElementById('profile'); const r = pr.querySelector('[data-act=back]').getBoundingClientRect(); return { st: __R1F.G.state, back: r.top >= s.top && r.bottom <= s.bottom + 1 || pr.scrollHeight > pr.clientHeight, w: [...pr.querySelectorAll('.panel')].every(e => { const b = e.getBoundingClientRect(); return b.left >= s.left - 1 && b.right <= s.right + 1; }) }; });
    ok(`profile by tap at ${vp.width}x${vp.height}: fits (BACK reachable)`, fit.st === 'profile' && fit.back && fit.w, fit);
    await q.screenshot({ path: path.join(SHOTS, `profile_${vp.width}x${vp.height}.png`) });
    await q.click('#profile [data-act=back]'); await q.waitForTimeout(150);
    ok(`BACK by tap at ${vp.width}x${vp.height}`, await q.evaluate(() => __R1F.G.state === 'title'), '');
    await q.close();
  }
}
