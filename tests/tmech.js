// Movement and air-combat tests (docs/MECHANICS_PROPOSAL.md): dash inputs through real keyboard and touch events,
// run, back dash, double jump, air specials, air block, air throw, juggle stun and air tech, mobile buttons, onEvent hooks.
// Run: NODE_PATH=<global node_modules> node tests/tmech.js   (R1F_URL overrides the page URL)
const { chromium } = require('playwright');
const URL = process.env.R1F_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
const results = [], seen = new Set();
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + info));

// A human (p0) against an idle opponent, in the real game loop, so real keyboard / touch events drive it.
async function liveFight(p, fighter = 'sam') {
  await p.evaluate(fid => {
    const { G, ROSTER, STAGES, Fight } = __R1F, ID = id => ROSTER.findIndex(d => d.id === id);
    const F = new Fight(ROSTER[ID(fid)], ROSTER[ID('xing')], STAGES[1], { c1: 'human', c2: 'dummy', training: true, mult: 0 });
    G.trainMode = 'stand'; G.training = true; G.paused = false; G.fight = F; G.state = 'fight';
    document.querySelectorAll('.scr').forEach(e => e.hidden = true); document.body.classList.add('infight');
    window.__ev = []; F.onEvent = (f, n) => { if (f === F.p[0]) window.__ev.push(n); };
  }, fighter);
  await p.waitForFunction(() => __R1F.G.fight.phase === 'play', null, { timeout: 5000 });
  await reset(p);
}
const reset = p => p.evaluate(() => { const F = __R1F.G.fight; F.p[0].x = 150; F.p[1].x = 400; for (const f of F.p) { f.state = 'idle'; f.vx = 0; f.bdCool = 0; } window.__ev = []; });
const state = async p => { const s = await p.evaluate(() => { const f = __R1F.G.fight.p[0]; return { st: f.state, x: f.x, vx: f.vx, walk: f.walkSpd, ev: window.__ev.slice() }; }); s.ev.forEach(e => seen.add(e)); return s; };

async function tap(p, key, down, gap, times = 2) {
  for (let i = 0; i < times; i++) { await p.keyboard.down(key); await p.waitForTimeout(down); await p.keyboard.up(key); if (i < times - 1) await p.waitForTimeout(gap); }
}

(async () => {
  const b = await chromium.launch(); const errs = [];
  // ------------------------------------------------------------ keyboard: double tap timings, dash key, run
  {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(1500); await liveFight(p);
    for (const [d, g] of [[60, 90], [90, 110]]) {
      await reset(p); await tap(p, 'ArrowRight', d, g); await p.waitForTimeout(60); const s = await state(p);
      ok(`keyboard double tap ${d}ms down / ${g}ms gap dashes`, s.ev.includes('dash'), JSON.stringify(s));
    }
    await reset(p); await tap(p, 'ArrowRight', 150, 300); await p.waitForTimeout(60);
    { const s = await state(p); ok('slow taps (150 / 300 ms) just walk', !s.ev.includes('dash'), JSON.stringify(s)); }
    await reset(p); await tap(p, 'ArrowLeft', 70, 100); await p.waitForTimeout(40);
    { const s = await state(p); ok('double tap back = back dash', s.ev.includes('backdash'), JSON.stringify(s)); }
    await reset(p); await p.keyboard.press('KeyE'); await p.waitForTimeout(60);
    { const s = await state(p); ok('dash key E dashes forward', s.ev.includes('dash'), JSON.stringify(s)); }
    await reset(p); await p.keyboard.down('ArrowLeft'); await p.keyboard.press('KeyE'); await p.waitForTimeout(60); await p.keyboard.up('ArrowLeft');
    { const s = await state(p); ok('back + E back dashes', s.ev.includes('backdash'), JSON.stringify(s)); }
    // hold to run
    await reset(p); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(60); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(90);
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500);
    { const s = await state(p); ok('double tap and hold runs', s.st === 'run' && s.ev.includes('run'), JSON.stringify(s)); ok('run speed about 2.1x walk', Math.abs(Math.abs(s.vx) / s.walk - 2.1) < .25, (s.vx / s.walk).toFixed(2)); }
    await p.keyboard.up('ArrowRight'); await p.waitForTimeout(200);
    { const s = await state(p); ok('releasing stops the run', s.st === 'idle' || s.st === 'walk', s.st); }
    await p.close();
  }
  // ------------------------------------------------------------ touch: joystick flick dash, double tap on the stick, buttons
  for (const [w, h] of [[390, 844], [844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(1500);
    await p.evaluate(() => { document.body.classList.add('touch'); dispatchEvent(new Event('resize')); });
    await liveFight(p); await p.waitForTimeout(100);
    const tag = `${w}x${h}`;
    const btns = await p.evaluate(() => [...document.querySelectorAll('#btns button')].map(e => { const r = e.getBoundingClientRect(); return { k: e.dataset.k, w: r.width, h: r.height }; }));
    ok(`${tag} BLK button removed`, !btns.some(x => x.k === 'b') && btns.length === 5, JSON.stringify(btns.map(x => x.k)));
    // same sizing rule as before the change: min(15vw, 11vh, 78px) in portrait, min(14vh, 70px) in landscape (plus the 3px border box)
    const want = w < h ? Math.min(w * .15, h * .11, 78) : Math.min(h * .14, 70);
    ok(`${tag} buttons keep their size (${want.toFixed(1)}px)`, btns.every(x => Math.abs(x.w - want) < 1 && Math.abs(x.h - x.w) < 1), JSON.stringify(btns));
    const pad = await p.evaluate(() => { const r = document.getElementById('dpad').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; });
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1 })) });
    // flick: centre to 80% of the radius as fast as the test can send it (well under 120 ms), then hold (run)
    await reset(p);
    await touch('touchStart', [[pad.x, pad.y]]); await p.waitForTimeout(40);
    for (const k of [.2, .5, .8]) await touch('touchMove', [[pad.x + pad.r * k, pad.y]]); // back to back: a real flick takes ~50 ms
    await p.waitForTimeout(80); { const s = await state(p); ok(`${tag} joystick flick dashes`, s.ev.includes('dash'), JSON.stringify(s)); }
    await p.waitForTimeout(450); { const s = await state(p); ok(`${tag} flick and hold runs`, s.st === 'run', JSON.stringify(s)); }
    await touch('touchEnd', []); await p.waitForTimeout(200);
    // slow push: no dash
    await reset(p);
    await touch('touchStart', [[pad.x, pad.y]]); await p.waitForTimeout(40);
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [[pad.x + pad.r * .8 * i / 10, pad.y]]); await p.waitForTimeout(40); }
    await p.waitForTimeout(80); { const s = await state(p); ok(`${tag} slow push walks, no dash`, !s.ev.includes('dash') && s.st === 'walk', JSON.stringify(s)); }
    await touch('touchEnd', []); await p.waitForTimeout(150);
    // flick back: back dash
    await reset(p);
    await touch('touchStart', [[pad.x, pad.y]]); await p.waitForTimeout(40);
    for (const k of [.2, .5, .8]) await touch('touchMove', [[pad.x - pad.r * k, pad.y]]);
    await p.waitForTimeout(60); { const s = await state(p); ok(`${tag} flick back = back dash`, s.ev.includes('backdash'), JSON.stringify(s)); }
    await touch('touchEnd', []); await p.waitForTimeout(250);
    // double tap on the stick (thumb lands to the right twice)
    await reset(p);
    for (let i = 0; i < 2; i++) { await touch('touchStart', [[pad.x + pad.r * .6, pad.y]]); await p.waitForTimeout(70); await touch('touchEnd', []); await p.waitForTimeout(90); }
    { const s = await state(p); ok(`${tag} double tap on the joystick dashes`, s.ev.includes('dash'), JSON.stringify(s)); }
    // holding back on the stick blocks (BLK button replacement)
    await reset(p);
    await touch('touchStart', [[pad.x - pad.r * .6, pad.y]]); await p.waitForTimeout(200);
    const blocked = await p.evaluate(() => { const F = __R1F.G.fight, f = F.p[0]; F.p[1].x = f.x + 36; return F.applyHit(F.p[1], f, { dmg: 8, kb: 2 }, -1); });
    ok(`${tag} holding back on the stick blocks`, blocked === 'block', blocked);
    await touch('touchEnd', []);
    await ctx.close();
  }
  // ------------------------------------------------------------ engine checks through Fight.update
  {
    const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const { G, ROSTER, STAGES, Fight } = __R1F, out = [], ev = [];
      const ok = (n, c, i) => out.push([n, !!c, i]);
      const ID = id => ROSTER.findIndex(d => d.id === id);
      G.state = 'result';
      const mk = (a, bb = 'xing', d = 200) => {
        const F = new Fight(ROSTER[ID(a)], ROSTER[ID(bb)], STAGES[1], { c1: 'human', c2: 'ai', lvl2: 0 }); G.fight = F;
        for (let k = 0; k < 400 && F.phase !== 'play'; k++) F.update({});
        F.p[1].ctrl = 'ai'; F.in1 = {}; F.ai = () => F.in1;
        F.p[0].x = 150; F.p[1].x = 150 + d; F.p[0].facing = 1; F.p[1].facing = -1; for (const f of F.p) { f.state = 'idle'; f.vx = 0; }
        F.onEvent = (f, n) => ev.push(F.idx(f) + ':' + n); return F;
      };
      const run = (F, n, i0 = {}, i1 = {}) => { for (let k = 0; k < n; k++) { F.in1 = Object.assign({}, i1); F.update(Object.assign({}, i0)); } };
      // back dash: invulnerable to a jab on its early frames, counter-hit in recovery
      { const F = mk('sam', 'dario', 30); run(F, 1, { l: 1 }); run(F, 1); run(F, 1, { l: 1 }); const s = F.p[0].state; F.p[1].x = F.p[0].x + 24;
        const inv = []; for (let k = 0; k < 8; k++) { inv.push(F.p[0].invul > 0); run(F, 1); }
        ok('back dash starts', s === 'dash' && F.p[0].dashDir < 0, s); ok('back dash invulnerable for its first 8 frames', inv.every(Boolean), inv.join());
        const hp = F.p[0].hp; F.p[1].x = F.p[0].x + 30; const t = F.p[0].t; const res = F.applyHit(F.p[1], F.p[0], { dmg: 5, kb: 1 }, -1); ok('hit in back dash recovery lands (t=' + t + ')', res === 'hit' && F.p[0].hp < hp, res); }
      // double jump for all 9: higher than one jump, heavies gain less, Elon the most
      const gain = {};
      for (const d of ROSTER) {
        let F = mk(d.id), f = F.p[0]; run(F, 1, { u: 1 }); let top = 999, n = 0; while ((!f.onGround || n < 3) && n++ < 300) { run(F, 1); top = Math.min(top, f.y); }
        const one = GY - top;
        F = mk(d.id); f = F.p[0]; run(F, 1, { u: 1 }); top = 999; n = 0; let dj = 0; while ((!f.onGround || n < 3) && n++ < 300) { const go = !dj && f.vy > -1; run(F, 1, go ? { u: 1 } : {}); if (go) dj = 1; top = Math.min(top, f.y); }
        gain[d.id] = (GY - top) - one; ok(d.id + ' double jump goes higher (+' + gain[d.id].toFixed(0) + ')', gain[d.id] > 8, gain[d.id]);
      }
      const others = ROSTER.map(d => d.id).filter(i => !['tramp', 'xing', 'mask'].includes(i));
      ok('heavies (Tramp, Xing) get a smaller second jump', Math.max(gain.tramp, gain.xing) < Math.min(...others.map(i => gain[i])), JSON.stringify(gain));
      ok('Elon has the biggest double jump', Object.keys(gain).every(i => i === 'mask' || gain.mask > gain[i]), JSON.stringify(gain));
      // air specials: every fighter except Tramp
      const AIRIN = { S1: [{ d: 1 }, { d: 1, r: 1 }, { r: 1, lp: 1 }], S4: [{ d: 1 }, { d: 1, l: 1 }, { l: 1, lp: 1 }] };
      for (const d of ROSTER) {
        const F = mk(d.id, 'xing', 110), K = F.p[0].kit; run(F, 1, { u: 1 }); run(F, 12);
        const slot = K.air ? Object.keys(K.air)[0] : 'S1'; run(F, 0); AIRIN[slot].forEach(i => run(F, 1, i));
        if (!K.air) { ok('tramp has no air special', F.p[0].state !== 'special', F.p[0].state + '/' + F.p[0].mv); continue; }
        const f = F.p[0]; ok(d.id + ' air special ' + K.air[slot], f.state === 'special' && f.mv === K.air[slot] && !f.onGround, f.state + '/' + f.mv);
        run(F, 200); ok(d.id + ' air special lands safely', f.onGround && ['idle', 'walk', 'crouch'].includes(f.state) && F.projs.every(q => q.y <= 192), f.state);
      }
      // Sam's air hurricane (second air slot) and the one-button assist in the air
      { const F = mk('sam', 'xing', 110); run(F, 1, { u: 1 }); run(F, 12); [{ d: 1 }, { d: 1, l: 1 }, { l: 1, lk: 1 }].forEach(i => run(F, 1, i)); ok('sam air hurricane', F.p[0].mv === 'spinA', F.p[0].mv); }
      { const F = mk('jensen', 'xing', 110); run(F, 1, { u: 1 }); run(F, 12); run(F, 1, { sp: 1 }); ok('SP assist fires the air special', F.p[0].mv === 'chipsA', F.p[0].mv); }
      // air block vs an air attack
      { const F = mk('sam', 'dario', 40); run(F, 1, { u: 1, r: 1 }, { u: 1 }); run(F, 10, { r: 1 }, { r: 1 }); run(F, 1, { hk: 1 }, { r: 1 }); const hp = F.p[1].hp; let st = new Set();
        for (let k = 0; k < 14; k++) { run(F, 1, {}, { r: 1 }); st.add(F.p[1].state); } ok('air block vs air attack', st.has('ablock') && hp - F.p[1].hp < 4, [...st].join()); }
      // air block vs a projectile
      { const F = mk('sam', 'dario', 150); run(F, 1, { d: 1 }); run(F, 1, { d: 1, r: 1 }); run(F, 1, { r: 1, lp: 1 }); let g = 0; while (!(F.projs[0] && F.p[1].x - F.projs[0].x < 90) && g++ < 80) run(F, 1);
        run(F, 1, {}, { u: 1 }); let st = new Set(); for (let k = 0; k < 40; k++) { run(F, 1, {}, { r: 1 }); st.add(F.p[1].state); } ok('air block vs projectile', st.has('ablock'), [...st].join()); }
      // the crouching HP anti-air can't be air blocked
      { const F = mk('sam', 'dario', 30); run(F, 1, {}, { u: 1 }); run(F, 14, {}, { r: 1 }); F.p[1].x = F.p[0].x + 26; run(F, 1, { d: 1, hp: 1 }, { r: 1 }); let st = new Set(); for (let k = 0; k < 12; k++) { run(F, 1, { d: 1 }, { r: 1 }); st.add(F.p[1].state); }
        ok('crouching HP anti-air beats air block', st.has('air') && !st.has('ablock'), [...st].join()); }
      // air throw (also through an air block)
      { const F = mk('sam', 'dario', 26); run(F, 1, { u: 1 }, { u: 1 }); run(F, 10, {}, { r: 1 }); run(F, 1, { lp: 1, lk: 1 }, { r: 1 }); run(F, 3, {}, { r: 1 }); ok('air throw grabs an air-blocking opponent', F.p[1].state === 'air' && F.p[0].mv === 'athrow', F.p[1].state + ' ' + F.p[0].mv);
        run(F, 80); ok('air throw ends in a knockdown', ['down', 'getup', 'idle'].includes(F.p[1].state), F.p[1].state); }
      { const F = mk('sam', 'dario', 26); run(F, 1, { u: 1 }, { u: 1 }); run(F, 10); run(F, 1, { lp: 1 }); run(F, 1, { lk: 1 }); run(F, 3); ok('air throw with LP then LK a frame later', F.p[0].mv === 'athrow' && F.p[1].state === 'air', F.p[0].mv + ' ' + F.p[1].state); }
      // juggle stun: a light air normal keeps an airborne opponent in stun (no knockdown), a heavy knocks down
      { const F = mk('sam', 'dario', 30); run(F, 1, { u: 1 }, { u: 1 }); run(F, 10); run(F, 1, { lp: 1 }); const st = []; for (let k = 0; k < 8; k++) { run(F, 1); st.push(F.p[1].state); }
        ok('light air hit = juggle stun', st.includes('ahit') && !st.includes('air'), st.join()); }
      { const F = mk('sam', 'dario', 30); run(F, 1, { u: 1 }, { u: 1 }); run(F, 10); run(F, 1, { hp: 1 }); const st = []; for (let k = 0; k < 10; k++) { run(F, 1); st.push(F.p[1].state); }
        ok('heavy air hit knocks down', st.includes('air'), st.join()); }
      // air tech: a button while knocked into the air flips out; not too early and not off a throw
      { const F = mk('sam', 'dario', 30); F.applyHit(F.p[0], F.p[1], { dmg: 6, kb: 2, lvy: -8, launch: 1, heavy: 1 }, 1); run(F, 21); run(F, 1, {}, { lk: 1 }); const s = F.p[1]; // 7 frames of hitstop first
        ok('air tech flips out', s.state === 'jump' && s.invul > 0, s.state);
        const F2 = mk('sam', 'dario', 30); F2.applyHit(F2.p[0], F2.p[1], { dmg: 6, kb: 2, lvy: -8, launch: 1, heavy: 1 }, 1); run(F2, 4, {}, { lk: 1 }); ok('no air tech in the first frames', F2.p[1].state === 'air', F2.p[1].state);
        const F3 = mk('sam', 'dario', 30); F3.applyHit(F3.p[0], F3.p[1], { dmg: 6, kb: 2, lvy: -8, launch: 1, heavy: 1, grab: 1, unblock: 1 }, 1); run(F3, 14); run(F3, 1, {}, { lk: 1 }); ok('no air tech off a throw', F3.p[1].state === 'air', F3.p[1].state); }
      // jump cancel: crouching HP that hits, then up
      { const F = mk('sam', 'dario', 30); run(F, 1, { d: 1, hp: 1 }); let k = 0; while (!F.p[0].lastHit && k++ < 20) run(F, 1, { d: 1 }); run(F, 10, { u: 1 }); ok('jump cancel on hit', F.p[0].state === 'jump', F.p[0].state); }
      // super jump: down then up
      { const F = mk('sam'); run(F, 3, { d: 1 }); run(F, 1); run(F, 1, { u: 1 }); ok('super jump', F.p[0].sj === 1, F.p[0].sj); }
      return { out, ev };
    });
    for (const [n, c, i] of r.out) ok(n, c, i);
    for (const e of r.ev) seen.add(e.split(':')[1]);
    await p.close();
  }
  for (const n of ['dash', 'backdash', 'run', 'superJump', 'djump', 'airSpecial', 'airBlock', 'airThrow', 'airTech', 'jumpCancel']) ok('onEvent hook fires: ' + n, seen.has(n), [...seen].join());
  if (errs.length) ok('no page errors', false, errs.join(' | '));
  console.log(results.join('\n'));
  const fails = results.filter(s => s.startsWith('FAIL')).length;
  console.log(fails ? `\nTMECH ${fails} FAILED of ${results.length}` : `\nTMECH OK ${results.length}`);
  await b.close(); process.exit(fails ? 1 : 0);
})();
