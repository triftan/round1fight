// Phase 4 costumes and palettes (docs/PHASE4_SPEC.md): 4 palettes per fighter with joke names, recoloured in code (the
// clothes change, the face mostly does not), lazily and quickly; unlock rules (3 wins, arcade clear, daily clear or a
// 7-day daily streak); the select screen swatch row (up/down cycles unlocked ones, a locked tap shows the condition,
// the pick persists); fights wear the pick; mirror matches force another palette. Writes a contact sheet per fighter.
// Run: NODE_PATH=<global node_modules> node tests/tcos.js   (R1F_URL overrides the page URL, SHOTS a screenshot folder)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = process.env.R1F_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'r1f_cos_shots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (typeof info === 'string' ? info : JSON.stringify(info))));

(async () => {
  const b = await chromium.launch(); const errs = [];
  try { await main(b, errs); } catch (e) { errs.push('test crashed: ' + e.message.split('\n')[0]); }
  await b.close();
  for (const r of results) console.log(r);
  if (errs.length) console.log(errs.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length + errs.length;
  console.log(fails ? `TCOS ${fails} FAILED of ${results.length}` : `TCOS OK ${results.length}`);
  process.exit(fails ? 1 : 0);
})();
async function main(b, errs) {
  const page = async vp => {
    const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 720 } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    await p.goto(URL); await p.waitForTimeout(1300); await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; }); return p;
  };
  const p = await page();
  // ------------------------------------------------------------ data + recolouring
  const d = await p.evaluate(() => {
    const { CAST, PALS, palImg, ROSTER } = __R1F, out = [];
    for (const f of CAST) {
      const P = PALS[f.id], names = P ? P.map(x => x[0]) : [];
      const fr = ASSETS.fighters[f.id].f, [sx, sy, w, h] = fr.stance, el = HEAD_EL[f.id];
      const read = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, sx, sy, w, h, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
      const base = read(palImg(f.id, 0)), times = [], body = [], face = [];
      // the face: the middle of the head ellipse (stance frame)
      const [hx, hy, hs] = fr.head, cx = hx + el[0] * hs / 10, cy = hy + el[1] * hs / 10, r = Math.min(el[2], el[3]) * hs / 10 * .55;
      for (let k = 1; k < 6; k++) { // 1-3 the classic recolours, 4-5 the holiday palettes (PUMPKIN SPICE, CANDY CANE)
        const t0 = performance.now(); const img = palImg(f.id, k); times.push(Math.round(performance.now() - t0));
        const q = read(img); let ch = 0, n = 0, fc = 0, fn = 0;
        for (let i = 0; i < q.length; i += 4) {
          if (base[i + 3] < 200) continue; n++;
          const diff = Math.abs(q[i] - base[i]) + Math.abs(q[i + 1] - base[i + 1]) + Math.abs(q[i + 2] - base[i + 2]) > 30;
          if (diff) ch++;
          const px = (i / 4) % w, py = Math.floor(i / 4 / w); if ((px - cx) ** 2 + (py - cy) ** 2 < r * r) { fn++; if (diff) fc++; }
        }
        body.push(+(ch / n).toFixed(2)); face.push(fn ? +(fc / fn).toFixed(2) : -1);
      }
      out.push({ id: f.id, n: P ? P.length : 0, names, uniq: new Set(names).size, times, body, face, cached: palImg(f.id, 1) === palImg(f.id, 1), def: palImg(f.id, 0) === IMG['f_' + f.id] });
    }
    return out;
  });
  for (const f of d) {
    ok(`${f.id}: 4 palettes + 2 holiday ones (PUMPKIN SPICE, CANDY CANE), distinct names`, f.n === 6 && f.uniq === 6 && f.names[4] === 'PUMPKIN SPICE' && f.names[5] === 'CANDY CANE' && f.names.every(x => x && x.length < 26), f.names);
    ok(`${f.id}: each recolour changes the sprite (>= 12% of pixels)`, f.body.every(x => x >= .12), f.body);
    const skin = !['xing', 'sing'].includes(f.id);
    ok(`${f.id}: ${skin ? 'the face keeps its skin (<= 25% of face pixels change)' : 'robot / data: anything goes'}`, !skin || f.face.every(x => x >= 0 && x <= .25), f.face);
    ok(`${f.id}: palette 0 is the original art, recolours cached`, f.def && f.cached, f);
    ok(`${f.id}: recolouring one atlas stays quick (< 400 ms each, lazily)`, f.times.every(t => t < 400), f.times);
  }
  const cache = await p.evaluate(() => { // every palette of every fighter was just built: only the last few stay in memory, and they still draw
    const { PAL_IMG, palImg, CAST } = __R1F, n = PAL_IMG.size; let px = -1;
    try { const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.drawImage(palImg('tramp', 2), 0, 0); x.drawImage(palImg(CAST[3].id, 3), 0, 0); px = PAL_IMG.size; } catch (e) { px = e.message; }
    return { n, px, live: [...PAL_IMG.values()].every(c => c.width > 0) };
  });
  ok('recoloured atlases: at most 4 kept (no ~250 MB of canvases on a phone), evicted ones rebuilt on demand', cache.n <= 4 && cache.px <= 4 && cache.live, cache);
  ok('the spec names: Spray Tan Gold, Sweet Baby Ray\'s, Leather 2.0', d.find(f => f.id === 'tramp').names.includes('SPRAY TAN GOLD') && d.find(f => f.id === 'zuck').names.includes("SWEET BABY RAY'S") && d.find(f => f.id === 'jensen').names.includes('LEATHER 2.0'), '');
  // contact sheets: every fighter's 6 palettes (stance, jab, roundhouse)
  for (const f of d) {
    const url = await p.evaluate(id => {
      const fr = ASSETS.fighters[id].f, c = document.createElement('canvas'); c.width = 6 * 300; c.height = 290; const x = c.getContext('2d');
      x.fillStyle = '#3c3c4c'; x.fillRect(0, 0, c.width, c.height);
      for (let k = 0; k < 6; k++) {
        const img = palImg(id, k); let px = k * 300 + 6;
        for (const n of ['stance', 'jab']) { const [sx, sy, w, h] = fr[n], s = Math.min(1, 250 / h) * .95; x.drawImage(img, sx, sy, w, h, px, 284 - h * s, w * s, h * s); px += w * s + 2; }
        x.fillStyle = '#fff'; x.font = 'bold 15px sans-serif'; x.fillText((k + 1) + ' ' + __R1F.PALS[id][k][0], k * 300 + 6, 18);
      }
      return c.toDataURL();
    }, f.id);
    fs.writeFileSync(path.join(SHOTS, 'palettes_' + f.id + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  // ------------------------------------------------------------ unlock rules
  const u = await p.evaluate(() => {
    const { Prof } = __R1F, o = {};
    o.fresh = Prof.palUnlocked('tramp');
    Prof.match('tramp', true, 0, false); Prof.match('tramp', true, 0, false); o.two = Prof.palUnlocked('tramp')[1];
    Prof.match('tramp', true, 0, false); o.three = Prof.palUnlocked('tramp'); o.toast = __R1F.Toast.q.concat([[document.getElementById('toastT').textContent, document.getElementById('toastS').textContent]]).map(t => t.join(' '));
    Prof.arcadeClear('tramp'); o.arcade = Prof.palUnlocked('tramp');
    Prof.dailyDone('2026-10-04', { score: 100, wins: 3, fighter: 'tramp', mod: 'glass' }, true); o.daily = Prof.palUnlocked('tramp'); o.otherAfterDaily = Prof.palUnlocked('xi')[3];
    // 7-day streak unlocks palette 4 for everyone
    for (let i = 5; i <= 11; i++) Prof.dailyDone('2026-10-' + String(i).padStart(2, '0'), { score: 1, wins: 0, fighter: 'mask', mod: 'glass' }, false);
    o.streak = Prof.get().daily.bestStreak; o.xi4 = Prof.palUnlocked('xi')[3]; o.xi2 = Prof.palUnlocked('xi')[1];
    o.count = Prof.palCount();
    o.lockedSel = (Prof.get().pal.xi = 1, Prof.palSel('xi')); o.setLocked = Prof.setPal('xi', 1); o.setOk = Prof.setPal('xi', 3); o.sel = Prof.palSel('xi');
    return o;
  });
  ok('fresh profile: only the default palette', JSON.stringify(u.fresh) === '[true,false,false,false,false,false]', u.fresh);
  ok('palette 2 after 3 wins with the fighter (not 2), with a NEW PALETTE banner', !u.two && u.three[1] && u.toast.some(t => /NEW PALETTE/.test(t) && /SPRAY TAN GOLD/.test(t)), u);
  ok('palette 3 after clearing arcade with them', u.arcade[2] && !u.arcade[3], u.arcade);
  ok('palette 4 after clearing a daily with them (only them)', u.daily[3] && !u.otherAfterDaily, u);
  ok('a 7-day daily streak unlocks palette 4 for everyone, nothing else', u.streak >= 7 && u.xi4 && !u.xi2, u);
  ok('a locked palette can\'t be picked (a hand-edited pick falls back to default)', u.lockedSel === 0 && u.setLocked === false && u.setOk === true && u.sel === 3, u);
  // ------------------------------------------------------------ holiday palettes (daily specials): PUMPKIN SPICE / CANDY CANE
  const hp = await p.evaluate(() => {
    localStorage.clear(); __R1F.Prof.d = null; const { Prof, Toast } = __R1F, o = {}; Toast.q.length = 0;
    o.fresh = Prof.palUnlocked('mask').slice(4);
    Prof.dailyDone('2027-10-30', { score: 1, wins: 3, fighter: 'mask', mod: 'glass' }, true); o.normalDaily = Prof.palUnlocked('mask').slice(4); // an ordinary daily clear gives no holiday palette
    Prof.dailyDone('2027-10-31', { score: 1, wins: 1, fighter: 'dario', mod: 'haunted' }, false, 'halloween'); o.failed = Prof.palUnlocked('dario').slice(4);
    Prof.dailyDone('2027-10-31', { score: 9, wins: 3, fighter: 'mask', mod: 'haunted' }, true, 'halloween');
    o.hal = Prof.palUnlocked('mask').slice(4); o.halOther = Prof.palUnlocked('xi').slice(4); o.toast = Toast.q.concat(Toast.cur ? [Toast.cur] : []).map(t => t.join(' '));
    Prof.dailyDone('2027-12-25', { score: 9, wins: 3, fighter: 'xi', mod: 'xmas' }, true, 'xmas');
    o.xmas = Prof.palUnlocked('xi').slice(4); o.maskStill = Prof.palUnlocked('mask').slice(4);
    o.count = Prof.palCount(); o.setLocked = Prof.setPal('mask', 5); o.set = Prof.setPal('mask', 4); o.sel = Prof.palSel('mask');
    o.stored = JSON.parse(localStorage.getItem('r1f_profile')); o.sw = [4, 5].map(i => __R1F.PALS.mask[i][0]);
    return o;
  });
  ok('holiday palettes: locked on a fresh profile; an ordinary daily clear or a failed holiday run gives none', JSON.stringify(hp.fresh) === '[false,false]' && JSON.stringify(hp.normalDaily) === '[false,false]' && JSON.stringify(hp.failed) === '[false,false]', hp);
  ok('clearing the Halloween daily unlocks PUMPKIN SPICE for that fighter only, with a NEW PALETTE banner', JSON.stringify(hp.hal) === '[true,false]' && JSON.stringify(hp.halOther) === '[false,false]' && hp.toast.some(t => /NEW PALETTE/.test(t) && /PUMPKIN SPICE/.test(t)), hp);
  ok('clearing the Christmas daily unlocks CANDY CANE for that fighter only (the Halloween one stays)', JSON.stringify(hp.xmas) === '[false,true]' && JSON.stringify(hp.maskStill) === '[true,false]', hp);
  ok('a holiday palette can be picked once earned, not before; counts in PALETTES', hp.setLocked === false && hp.set === true && hp.sel === 4 && hp.count >= 12 && hp.stored.hol.halloween.includes('mask') && hp.stored.hol.xmas.includes('xi') && hp.stored.pal.mask === 4, hp);
  await p.reload(); await p.waitForTimeout(1300);
  const hp2 = await p.evaluate(() => { const { Prof } = __R1F; return { mask: Prof.palUnlocked('mask').slice(4), xi: Prof.palUnlocked('xi').slice(4), sel: Prof.palSel('mask') }; });
  ok('holiday palettes and the pick persist across a reload (r1f_profile)', JSON.stringify(hp2.mask) === '[true,false]' && JSON.stringify(hp2.xi) === '[false,true]' && hp2.sel === 4, hp2);
  const hp3 = await p.evaluate(() => { // a hand-edited save: junk ids and shapes are dropped, valid ones kept
    localStorage.setItem('r1f_profile', JSON.stringify({ v: 1, rp: 5, pal: { tramp: 5, mask: 9 }, hol: { halloween: ['nobody', 'tramp', 7], xmas: 'tramp' } })); __R1F.Prof.d = null; const { Prof } = __R1F;
    return { t: Prof.palUnlocked('tramp').slice(4), sel: Prof.palSel('tramp'), m: Prof.palUnlocked('mask').slice(4), hol: Prof.get().hol };
  });
  ok('a corrupted holiday list is sanitised (unknown fighters / wrong types dropped)', JSON.stringify(hp3.t) === '[true,false]' && hp3.sel === 0 && JSON.stringify(hp3.m) === '[false,false]' && JSON.stringify(hp3.hol) === '{"halloween":["tramp"]}', hp3);
  await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; const { Prof } = __R1F; Prof.dailyDone('2026-10-31', { score: 9, wins: 3, fighter: 'tramp', mod: 'haunted' }, true, 'halloween'); __R1F.Toast.q.length = 0; __R1F.G.pick = 0; __R1F.act('start'); }); await p.waitForTimeout(300);
  const hs = await p.evaluate(() => ({ locked: [...document.querySelectorAll('#palrow .sw')].map(e => e.classList.contains('lk')), aria: [...document.querySelectorAll('#palrow .sw')].map(e => e.getAttribute('aria-label')) }));
  ok('select screen: PUMPKIN SPICE swatch open, CANDY CANE locked with its unlock text', JSON.stringify(hs.locked.slice(4)) === '[false,true]' && hs.aria[4] === 'PUMPKIN SPICE' && /Locked: CLEAR THE CHRISTMAS DAILY WITH TRAMP/.test(hs.aria[5]), hs);
  await p.click('#palrow .sw[data-pal="5"]'); await p.waitForTimeout(150);
  ok('tapping the locked holiday swatch says how to unlock it', /LOCKED: CLEAR THE CHRISTMAS DAILY WITH TRAMP/.test(await p.evaluate(() => document.getElementById('palname').textContent)), '');
  await p.click('#palrow .sw[data-pal="4"]'); await p.waitForTimeout(200);
  ok('tapping PUMPKIN SPICE picks it; the fight wears it', await p.evaluate(() => { const { Prof, Fight, ROSTER, STAGES } = __R1F; return Prof.palSel('tramp') === 4 && new Fight(ROSTER[0], ROSTER[1], STAGES[0], { c1: 'human', c2: 'ai', pal1: Prof.palSel('tramp') }).p[0].pal === 4; }), '');
  await p.screenshot({ path: path.join(SHOTS, 'select_holiday_palette.png') });
  await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; __R1F.act('menu'); });
  // ------------------------------------------------------------ select screen
  await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; const { Prof } = __R1F; for (let i = 0; i < 3; i++) Prof.match('tramp', true, 0, false); Prof.arcadeClear('tramp'); __R1F.Toast.q.length = 0; __R1F.G.pick = 0; __R1F.act('start'); });
  await p.waitForTimeout(300);
  const sw = await p.evaluate(() => ({ n: document.querySelectorAll('#palrow .sw').length, locked: [...document.querySelectorAll('#palrow .sw')].map(e => e.classList.contains('lk')), on: [...document.querySelectorAll('#palrow .sw')].findIndex(e => e.classList.contains('on')), name: document.getElementById('palname').textContent, lockSvg: !!document.querySelector('#palrow .sw.lk svg') }));
  ok('select: 6 swatches (4 + the 2 holiday ones), the 3 not yet earned locked with a padlock, default picked', sw.n === 6 && JSON.stringify(sw.locked) === '[false,false,false,true,true,true]' && sw.on === 0 && sw.name === 'CLASSIC NAVY' && sw.lockSvg, sw);
  const big0 = await p.evaluate(() => document.getElementById('bigp').toDataURL());
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150);
  const k1 = await p.evaluate(() => ({ sel: __R1F.Prof.palSel('tramp'), name: document.getElementById('palname').textContent, pick: __R1F.G.pick, big: document.getElementById('bigp').toDataURL() }));
  ok('ArrowDown: next palette (fighter unchanged), portrait recoloured', k1.sel === 1 && k1.name === 'SPRAY TAN GOLD' && k1.pick === 0 && k1.big !== big0, k1.name);
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150);
  ok('cycling skips the locked palette and wraps', await p.evaluate(() => __R1F.Prof.palSel('tramp')) === 0, '');
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(100);
  ok('ArrowUp goes back (wraps to palette 3)', await p.evaluate(() => __R1F.Prof.palSel('tramp')) === 2, '');
  await p.click('#palrow .sw[data-pal="3"]'); await p.waitForTimeout(150);
  const lk = await p.evaluate(() => ({ sel: __R1F.Prof.palSel('tramp'), name: document.getElementById('palname').textContent, st: __R1F.G.state }));
  ok('tapping a locked swatch shows its unlock condition, keeps the pick', lk.sel === 2 && /LOCKED: CLEAR A DAILY WITH TRAMP/.test(lk.name) && lk.st === 'select', lk);
  await p.click('#palrow .sw[data-pal="1"]'); await p.waitForTimeout(150);
  ok('tapping an unlocked swatch picks it', await p.evaluate(() => __R1F.Prof.palSel('tramp')) === 1, '');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  const mk = await p.evaluate(() => ({ pick: __R1F.G.pick, locked: [...document.querySelectorAll('#palrow .sw')].map(e => e.classList.contains('lk')), name: document.getElementById('palname').textContent }));
  ok('right moves to the next fighter, whose swatches show their own locks', mk.pick === 1 && JSON.stringify(mk.locked) === '[false,true,true,true,true,true]' && mk.name === 'DEFAULT', mk);
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150);
  ok('ArrowDown with nothing unlocked: says what unlocks the next one', /NEXT: WIN 3 MATCHES WITH MASK/.test(await p.evaluate(() => document.getElementById('palname').textContent)), '');
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(SHOTS, 'select_palettes.png') });
  // persists across a reload
  await p.reload(); await p.waitForTimeout(1300);
  ok('the palette pick survives a reload (r1f_profile)', await p.evaluate(() => __R1F.Prof.palSel('tramp') === 1 && JSON.parse(localStorage.getItem('r1f_profile')).pal.tramp === 1), '');
  // ------------------------------------------------------------ fights wear it; mirrors are forced apart
  const fw = await p.evaluate(() => {
    const { G, Fight, ROSTER, STAGES, act } = __R1F, o = {};
    G.pick = 0; __P3.startArcade(); __P3.goVS(); o.vs = G.vsPal.slice(); __P3.startFight(); o.arcade = [G.fight.p[0].pal, G.fight.p[1].pal];
    const m = new Fight(ROSTER[0], ROSTER[0], STAGES[0], { c1: 'human', c2: 'ai', pal1: 1, pal2: 1 }); o.mirror = [m.p[0].pal, m.p[1].pal];
    const m0 = new Fight(ROSTER[3], ROSTER[3], STAGES[0], { c1: 'human', c2: 'ai' }); o.mirror0 = [m0.p[0].pal, m0.p[1].pal];
    act('menu'); G.pick = 0; G.dummyPick = 0; act('training'); act('fight'); G.dummyPick = 0; act('fight'); document.querySelector('#stagegrid button').click(); o.train = [G.fight.p[0].pal, G.fight.p[1].pal];
    G.fight.draw(); act('menu');
    return o;
  });
  ok('arcade: the player wears the picked palette (VS screen and fight)', fw.vs[0] === 1 && fw.arcade[0] === 1 && fw.arcade[1] === 0, fw);
  ok('mirror matches never show twins (same palette asked -> the second moves)', fw.mirror[0] === 1 && fw.mirror[1] !== 1 && fw.mirror0[0] !== fw.mirror0[1], fw);
  ok('training mirror (Tramp v Tramp dummy) is forced apart too', fw.train[0] === 1 && fw.train[1] !== 1, fw);
  // the daily intro of a MIRROR MATCH day previews the mirrors in the palette the fight will give them (not yours)
  const dm = await p.evaluate(() => {
    const { Daily, Prof, ROSTER, act } = __R1F; let t = Date.parse('2026-01-01T00:00:00Z'), d = null;
    for (let i = 0; i < 3000 && !d; i++, t += 864e5) { const x = new Date(t).toISOString().slice(0, 10), c = Daily.make(x); if (c.mod === 'mirror' && c.fighter >= 0) d = x; }
    const me = ROSTER[Daily.make(d).fighter].id; for (let i = 0; i < 3; i++) Prof.match(me, true, 0, false); __R1F.Toast.q.length = 0; Prof.setPal(me, 1);
    __R1F.daily.setDate(d); act('menu'); act('daily');
    const px = cv => cv.getContext('2d').getImageData(0, 0, 64, 64).data.join(), cv = [...document.querySelectorAll('#drow .dcard canvas')].map(px);
    act('dailygo'); const vs = __R1F.G.vsPal.slice(); __P3.startFight(); const f = __R1F.G.fight.p.map(x => x.pal);
    __R1F.daily.setDate(null); act('menu'); Prof.setPal(me, 0);
    return { d, me, youVsMirror: cv[0] === cv[1], mirrorsSame: cv[1] === cv[2] && cv[2] === cv[3], vs, f };
  });
  ok('daily MIRROR MATCH intro: the mirrors are shown in another palette than yours, like the VS screen and the fight', !dm.youVsMirror && dm.mirrorsSame && dm.vs[0] === 1 && dm.vs[1] === 0 && dm.f.join() === '1,0', dm);
  // ------------------------------------------------------------ phones: swatches tappable and on screen
  for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const q = await page(vp);
    await q.evaluate(() => { const { Prof } = __R1F; for (let i = 0; i < 3; i++) Prof.match('tramp', true, 0, false); __R1F.Toast.q.length = 0; __R1F.G.pick = 0; __R1F.act('start'); }); await q.waitForTimeout(300);
    const g = await q.evaluate(() => { const s = document.getElementById('screen').getBoundingClientRect(); return [...document.querySelectorAll('#palrow .sw')].map(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), in: r.left >= s.left && r.right <= s.right && r.top >= s.top && r.bottom <= s.bottom }; }); });
    ok(`swatches on screen and >= 22x17 px at ${vp.width}x${vp.height}`, g.every(x => x.in && x.w >= 22 && x.h >= 17), g);
    await q.tap('#palrow .sw[data-pal="1"]').catch(() => q.click('#palrow .sw[data-pal="1"]')); await q.waitForTimeout(150);
    ok(`tap picks a palette at ${vp.width}x${vp.height}`, await q.evaluate(() => __R1F.Prof.palSel('tramp')) === 1, '');
    await q.screenshot({ path: path.join(SHOTS, `select_palettes_${vp.width}x${vp.height}.png`) });
    await q.close();
  }
}
