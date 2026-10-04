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
      for (let k = 1; k < 4; k++) {
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
    ok(`${f.id}: 4 palettes with distinct names`, f.n === 4 && f.uniq === 4 && f.names.every(x => x && x.length < 26), f.names);
    ok(`${f.id}: each recolour changes the sprite (>= 12% of pixels)`, f.body.every(x => x >= .12), f.body);
    const skin = !['xing', 'sing'].includes(f.id);
    ok(`${f.id}: ${skin ? 'the face keeps its skin (<= 25% of face pixels change)' : 'robot / data: anything goes'}`, !skin || f.face.every(x => x >= 0 && x <= .25), f.face);
    ok(`${f.id}: palette 0 is the original art, recolours cached`, f.def && f.cached, f);
    ok(`${f.id}: recolouring one atlas stays quick (< 400 ms each, lazily)`, f.times.every(t => t < 400), f.times);
  }
  ok('the spec names: Spray Tan Gold, Sweet Baby Ray\'s, Leather 2.0', d.find(f => f.id === 'tramp').names.includes('SPRAY TAN GOLD') && d.find(f => f.id === 'zuck').names.includes("SWEET BABY RAY'S") && d.find(f => f.id === 'jensen').names.includes('LEATHER 2.0'), '');
  // contact sheets: every fighter's 4 palettes (stance, jab, roundhouse)
  for (const f of d) {
    const url = await p.evaluate(id => {
      const fr = ASSETS.fighters[id].f, c = document.createElement('canvas'); c.width = 4 * 300; c.height = 290; const x = c.getContext('2d');
      x.fillStyle = '#3c3c4c'; x.fillRect(0, 0, c.width, c.height);
      for (let k = 0; k < 4; k++) {
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
  ok('fresh profile: only the default palette', JSON.stringify(u.fresh) === '[true,false,false,false]', u.fresh);
  ok('palette 2 after 3 wins with the fighter (not 2), with a NEW PALETTE banner', !u.two && u.three[1] && u.toast.some(t => /NEW PALETTE/.test(t) && /SPRAY TAN GOLD/.test(t)), u);
  ok('palette 3 after clearing arcade with them', u.arcade[2] && !u.arcade[3], u.arcade);
  ok('palette 4 after clearing a daily with them (only them)', u.daily[3] && !u.otherAfterDaily, u);
  ok('a 7-day daily streak unlocks palette 4 for everyone, nothing else', u.streak >= 7 && u.xi4 && !u.xi2, u);
  ok('a locked palette can\'t be picked (a hand-edited pick falls back to default)', u.lockedSel === 0 && u.setLocked === false && u.setOk === true && u.sel === 3, u);
  // ------------------------------------------------------------ select screen
  await p.evaluate(() => { localStorage.clear(); __R1F.Prof.d = null; const { Prof } = __R1F; for (let i = 0; i < 3; i++) Prof.match('tramp', true, 0, false); Prof.arcadeClear('tramp'); __R1F.Toast.q.length = 0; __R1F.G.pick = 0; __R1F.act('start'); });
  await p.waitForTimeout(300);
  const sw = await p.evaluate(() => ({ n: document.querySelectorAll('#palrow .sw').length, locked: [...document.querySelectorAll('#palrow .sw')].map(e => e.classList.contains('lk')), on: [...document.querySelectorAll('#palrow .sw')].findIndex(e => e.classList.contains('on')), name: document.getElementById('palname').textContent, lockSvg: !!document.querySelector('#palrow .sw.lk svg') }));
  ok('select: 4 swatches, the 4th locked with a padlock, default picked', sw.n === 4 && JSON.stringify(sw.locked) === '[false,false,false,true]' && sw.on === 0 && sw.name === 'CLASSIC NAVY' && sw.lockSvg, sw);
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
  ok('right moves to the next fighter, whose swatches show their own locks', mk.pick === 1 && JSON.stringify(mk.locked) === '[false,true,true,true]' && mk.name === 'DEFAULT', mk);
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
