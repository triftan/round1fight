// Interactive tutorial (training mode > TUTORIAL). Enters through the real UI, then completes every lesson with scripted
// inputs fed to Fight.update (motions, blocks, throws...), checking completion comes from game events, plus skip / exit /
// lesson picker / localStorage progress / per-fighter move names / the onEvent plumbing used by the movement lessons.
// Env: R1F_URL (page), R1F_SHOTS (directory for screenshots), R1F_FIGHTERS (comma list of roster ids to run end to end).
const { chromium } = require('playwright');
const path = require('path');
const URL = process.env.R1F_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SHOTS = process.env.R1F_SHOTS || '';
const FIGHTERS = (process.env.R1F_FIGHTERS || 'tramp,wong,xing').split(',');

// page-side driver: returns a function doLesson(id) -> { id, ok, frames, info }
const DRIVER = `(() => {
  const { G, ROSTER } = __R1F, { Tut, LESSONS } = __TUT;
  const NONE = { l: 0, r: 0, u: 0, d: 0, b: 0, lp: 0, hp: 0, lk: 0, hk: 0, sp: 0, move: null };
  const F = () => G.fight, P = () => F().p[0], D = () => F().p[1];
  const step = (inp = {}, n = 1) => { for (let i = 0; i < n; i++) F().update({ ...NONE, ...inp }); };
  const fw = () => P().facing > 0 ? 'r' : 'l', bk = () => P().facing > 0 ? 'l' : 'r';
  const dirInp = n => { const o = {}; if ([1, 2, 3].includes(n)) o.d = 1; if ([7, 8, 9].includes(n)) o.u = 1; if ([3, 6, 9].includes(n)) o[fw()] = 1; if ([1, 4, 7].includes(n)) o[bk()] = 1; return o; };
  const dist = () => Math.abs(D().x - P().x);
  const free = () => ['idle', 'walk', 'crouch'].includes(P().state) && P().stun <= 0;
  const settle = (max = 160) => { for (let i = 0; i < max && !free(); i++) step(); step({}, 2); };
  const close = (d = 34) => { for (let i = 0; i < 260 && dist() > d; i++) step({ [fw()]: 1 }); };
  const MOT = { S1: [[2, 3, 6], 'lp'], S2: [[6, 2, 3], 'lp'], S3: [[2, 1, 4], 'lk'], S4: [[2, 1, 4], 'lp'], grab: [[4, 1, 2, 3, 6], 'lp'], super: [[2, 3, 6, 2, 3, 6], 'lp'] };
  const motion = (slot, extra = {}) => { const [dirs, btn] = MOT[slot]; for (const d of dirs) step({ ...dirInp(d), ...extra }, 2); step({ ...dirInp(dirs[dirs.length - 1]), [btn]: 1, ...extra }); };
  const cur = () => Tut.L && Tut.L.id;
  const until = (fn, max = 60) => { const id = cur(); for (let i = 0; i < max && cur() === id && !Tut.lock; i++) fn(i); };
  const afterLock = () => { for (let i = 0; i < 400 && Tut.lock; i++) step(); };
  const S = {
    walk() { step({ r: 1 }, 70); step({ l: 1 }, 70); },
    jump() { step({ u: 1 }); settle(); step({ r: 1, u: 1 }); settle(); },
    dash() { until(() => { settle(); step({ dk: 1 }); step({}, 3); settle(); }, 6); },
    run() { until(() => { settle(); step({ dk: 1, [fw()]: 1 }); step({ [fw()]: 1 }, 40); step({}, 4); settle(); }, 6); },
    djump() { until(() => { settle(); step({ u: 1 }); step({}, 10); for (let i = 0; i < 40 && P().vy <= -1; i++) step(); step({ u: 1 }); settle(); }, 6); },
    airSpecial() {
      const K = P().kit;
      if (!K.air) return S.djump(); // no air special (Tramp): the lesson completes on a double jump
      const sl = Object.keys(K.air)[0], f = sl === 'S1' ? fw : bk; // S1 = quarter circle forward, S4 = quarter circle back
      until(() => { settle(); step({ u: 1 }); step({}, 12); step({ d: 1 }); step({ d: 1, [f()]: 1 }); step({ [f()]: 1, lp: 1 }); settle(200); }, 6);
    },
    crouch() { step({ d: 1 }, 45); },
    normals() { for (const b of ['lp', 'hp', 'lk', 'hk']) { close(30); step({ [b]: 1 }); settle(); } },
    blockHigh() { until(() => step({ l: 1 }), 1500); },
    blockLow() { until(() => step({ l: 1, d: 1 }), 1500); },
    blockOver() { until(() => step({ l: 1 }), 2500); },
    throw() { until(() => { close(30); step({ [fw()]: 1, lp: 1, lk: 1 }); settle(); }, 40); },
    special1() { until(() => { close(60); settle(); motion('S1'); settle(80); }, 30); },
    special234() { for (const s of ['S2', 'S3', 'S4']) if (P().kit[s]) until(() => { close(60); settle(); motion(s); settle(80); }, 20); },
    chain() { until(() => { close(28); step({ lp: 1 }); step({}, 5); step({ hp: 1 }); settle(); }, 30); },
    cancel() { until(() => { close(28); step({ lp: 1 }); step({ d: 1 }, 1); step({ d: 1, [fw()]: 1 }, 1); step({ [fw()]: 1 }, 1); step({ lp: 1 }); settle(80); }, 30); },
    super() {
      for (let i = 0; i < 80 && P().meter < 100; i++) { close(28); step({ hp: 1 }); settle(); }
      until(() => { close(60); settle(); motion('super'); settle(90); }, 10);
    },
    unique() {
      const id = P().def.id;
      if (id === 'tramp') until(() => { close(30); settle(); motion('grab'); settle(80); }, 20);
      if (id === 'mask') {
        step({ u: 1 }); step({}, 9); step({ u: 1 }); step({}, 40); settle(200);
        step({ r: 1, u: 1 }); step({ r: 1 }, 6); step({}, 2); step({ r: 1 }); step({}, 2); step({ r: 1 }); step({ r: 1 }, 2); step({}, 40); settle(200);
      }
      if (id === 'xi') until(() => { if (free()) { motion('S2', { hp: 0 }); } step({ ph: 1 }, 80); settle(); }, 30);
      if (id === 'dario') until(() => { if (Tut.dm.cool === 20 && free()) { motion('S2'); } step(); }, 3000);
      if (id === 'sam') { try { until(() => { close(28); step({ lp: 1 }); step({}, 5); step({ hp: 1 }); settle(); if (P().ships >= 2) throw 'x'; }, 30); } catch (e) { if (e !== 'x') throw e; } settle(); motion('S1'); step({}, 40); }
      if (id === 'jensen') until(() => { close(60); settle(); motion('S3'); settle(90); }, 20);
      if (id === 'zuck') until(() => { close(36); settle(); motion('S3'); settle(120); }, 20);
      if (id === 'wong') { until(() => { settle(); motion('S4'); step({}, 60); }, 20); step({ hp: 1, hk: 1 }); step({}, 60); }
      if (id === 'xing') { until(() => { settle(); motion('super'); step({}, 30); }, 3); until(() => { P().hp = P().maxHp * .3; settle(); motion('super'); step({}, 30); }, 12); }
    },
    exam() {
      const f = F(); f.p[1].hp = 2;
      until(() => { close(30); step({ hp: 1 }); settle(); }, 60);
    },
  };
  return function doLesson(id) {
    const t0 = F() ? F().frame : 0;
    if (cur() !== id) return { id, ok: !!Tut.done[id], info: 'expected lesson ' + id + ' got ' + cur() + (Tut.done[id] ? ' (already done)' : '') };
    try { S[id](); } catch (e) { if (e !== 'x') return { id, ok: false, info: 'threw ' + e }; }
    const done = !!Tut.done[id], st = Tut.st ? JSON.stringify(Tut.st.parts) + ' n=' + Tut.st.n : '';
    if (Tut.lock) afterLock();
    return { id, ok: done, info: done ? '' : 'not completed: ' + st + ' dummy=' + D().state + ' me=' + P().state, frames: F().frame - t0 };
  };
})()`;

(async () => {
  const b = await chromium.launch();
  const errs = [], notes = [];
  const fail = m => errs.push(m);
  const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const page = async (w, h, touch) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch, isMobile: !!touch });
    const p = await ctx.newPage();
    p.on('pageerror', e => fail('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type() === 'error') fail('console.error ' + m.text()); });
    await p.goto(URL); await p.waitForTimeout(1400);
    return p;
  };
  const enter = async (p, rosterIdx) => {
    await p.click('[data-act="training"]'); await p.waitForTimeout(150);
    const two = await p.evaluate(() => ({ tut: document.getElementById('tutBtn').textContent, free: document.getElementById('selBtn').textContent, tutVisible: !document.getElementById('tutBtn').hidden }));
    if (two.tut !== 'TUTORIAL' || two.free !== 'FREE PRACTICE' || !two.tutVisible) fail('training entry does not offer TUTORIAL / FREE PRACTICE: ' + JSON.stringify(two));
    if (await p.evaluate(i => __R1F.G.pick !== i, rosterIdx)) { await p.click('#grid .card[data-i="' + rosterIdx + '"]'); await p.waitForTimeout(100); } // a second click on the picked card would confirm it
    await p.click('#tutBtn'); await p.waitForTimeout(200);
  };

  // ---------------------------------------------------------------- 1. desktop: full run for each chosen fighter
  const p = await page(1280, 720, false);
  const ids = await p.evaluate(() => __R1F.ROSTER.map(d => d.id));
  for (const fid of FIGHTERS) {
    const idx = ids.indexOf(fid);
    await p.evaluate(() => { try { localStorage.removeItem('r1f_tutorial'); } catch (_) {} });
    await p.reload(); await p.waitForTimeout(1400);
    await enter(p, idx);
    let st = await p.evaluate(() => ({ state: __R1F.G.state, pickerShown: !document.getElementById('tutpick').hidden, n: document.querySelectorAll('#tutlist .tl').length, go: document.getElementById('tutgo').textContent }));
    if (st.state !== 'tutpick' || !st.pickerShown || st.n < 15) fail(fid + ': lesson picker not shown ' + JSON.stringify(st));
    await shot(p, 'pick_' + fid);
    await p.click('#tutgo'); await p.waitForTimeout(300);
    st = await p.evaluate(() => ({ state: __R1F.G.state, training: __R1F.G.training, tut: !!__R1F.G.tut, banner: !document.getElementById('tut').hidden, pick: __R1F.ROSTER[__R1F.G.pick].id, dummy: __R1F.ROSTER[__R1F.G.dummyPick].id, n: __TUT.LESSONS.length, cur: __TUT.Tut.L.id }));
    if (st.state !== 'fight' || !st.tut || !st.banner || st.pick !== fid || st.dummy === fid || st.cur !== 'walk') fail(fid + ': tutorial did not start ' + JSON.stringify(st));
    await shot(p, 'les_walk_' + fid);
    await p.evaluate(DRIVER.replace(/^\(\(\) =>/, 'window.__drv = (() =>')); // defines window.__drv
    const ran = [];
    const lessonIds = await p.evaluate(() => __TUT.LESSONS.map(l => l.id));
    for (const id of lessonIds) {
      const r = await p.evaluate(id => window.__drv(id), id);
      ran.push(r);
      if (!r.ok) { fail(fid + ': lesson ' + id + ' failed: ' + r.info); break; }
      if (id === 'blockHigh' || id === 'special1' || id === 'unique') await shot(p, 'done_' + id + '_' + fid);
    }
    const fin = await p.evaluate(() => ({ state: __R1F.G.state, picker: !document.getElementById('tutpick').hidden, msg: document.getElementById('tutmsg').textContent,
      done: JSON.parse(localStorage.getItem('r1f_tutorial') || '{}').done || {}, ticks: document.querySelectorAll('#tutlist .tl.ok').length }));
    const all = lessonIds.every(id => fin.done[id]);
    if (fin.state !== 'tutpick' || !fin.picker || !all || fin.ticks !== lessonIds.length || !/COMPLETE/.test(fin.msg)) fail(fid + ': completion state wrong ' + JSON.stringify(fin));
    notes.push(fid + ': ' + ran.map(r => r.id + (r.ok ? '' : '!')).join(' ') + ' | frames ' + ran.reduce((a, r) => a + (r.frames || 0), 0));
    await shot(p, 'complete_' + fid);
  }

  // ---------------------------------------------------------------- 2. skip / Tab / lessons / exit / persistence / free practice
  await p.evaluate(() => { try { localStorage.removeItem('r1f_tutorial'); } catch (_) {} });
  await p.reload(); await p.waitForTimeout(1400);
  await enter(p, 0);
  await p.click('#tutgo'); await p.waitForTimeout(200);
  await p.click('#tutSkip'); await p.waitForTimeout(100);
  let s2 = await p.evaluate(() => ({ cur: __TUT.Tut.L.id, saved: localStorage.getItem('r1f_tutorial'), n: document.getElementById('tutN').textContent }));
  if (s2.cur !== 'dash' || /walk/.test(s2.saved || '') || s2.n !== 'LESSON 2/' + (await p.evaluate(() => __TUT.LESSONS.length))) fail('SKIP button: ' + JSON.stringify(s2));
  await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  s2 = await p.evaluate(() => ({ cur: __TUT.Tut.L.id, focus: document.activeElement && document.activeElement.tagName }));
  if (s2.cur !== 'run') fail('Tab did not skip: ' + JSON.stringify(s2));
  // real keyboard: complete crouch by holding S (lessons are looked up by id, never by position)
  await p.evaluate(() => __TUT.Tut.start(__TUT.LESSONS.findIndex(l => l.id === 'crouch'))); await p.waitForTimeout(100);
  await p.keyboard.down('KeyS'); await p.waitForTimeout(900); await p.keyboard.up('KeyS'); await p.waitForTimeout(1900);
  s2 = await p.evaluate(() => ({ cur: __TUT.Tut.L.id, done: JSON.parse(localStorage.getItem('r1f_tutorial') || '{}').done }));
  if (!s2.done || !s2.done.crouch || s2.cur !== 'normals') fail('real keyboard crouch did not complete/advance: ' + JSON.stringify(s2));
  // real keyboard: walk
  await p.evaluate(() => __TUT.Tut.start(0)); await p.waitForTimeout(100);
  await p.keyboard.down('KeyD'); await p.waitForTimeout(700); await p.keyboard.up('KeyD');
  await p.keyboard.down('KeyA'); await p.waitForTimeout(700); await p.keyboard.up('KeyA'); await p.waitForTimeout(400);
  s2 = await p.evaluate(() => ({ lock: __TUT.Tut.lock, parts: __TUT.Tut.st.parts, done: JSON.parse(localStorage.getItem('r1f_tutorial') || '{}').done }));
  if (!(s2.done && s2.done.walk)) fail('real keyboard walk did not complete: ' + JSON.stringify(s2));
  // LESSONS button returns to the picker with ticks
  await p.click('[data-act="tutlist"]'); await p.waitForTimeout(200);
  s2 = await p.evaluate(() => ({ picker: !document.getElementById('tutpick').hidden, ticks: [...document.querySelectorAll('#tutlist .tl.ok')].map(e => e.textContent), go: document.getElementById('tutgo').textContent }));
  if (!s2.picker || s2.ticks.length !== 2 || !/✓/.test(s2.ticks[0])) fail('picker ticks after progress: ' + JSON.stringify(s2));
  // picking a lesson starts it; the progress survives a reload
  await p.click('#tutlist .tl[data-i="' + (await p.evaluate(() => __TUT.LESSONS.findIndex(l => l.id === 'blockHigh'))) + '"]'); await p.waitForTimeout(200);
  s2 = await p.evaluate(() => __TUT.Tut.L.id);
  if (s2 !== 'blockHigh') fail('picking the blockHigh lesson started ' + s2);
  await p.reload(); await p.waitForTimeout(1400); await enter(p, 0);
  s2 = await p.evaluate(() => [...document.querySelectorAll('#tutlist .tl.ok')].length);
  if (s2 !== 2) fail('progress not restored after reload: ' + s2);
  // EXIT
  await p.click('#tutgo'); await p.waitForTimeout(200);
  await p.click('[data-act="tutexit"]'); await p.waitForTimeout(200);
  s2 = await p.evaluate(() => ({ state: __R1F.G.state, tut: !!__R1F.G.tut, banner: document.getElementById('tut').hidden, pick: document.getElementById('tutpick').hidden }));
  if (s2.state !== 'title' || s2.tut || !s2.banner || !s2.pick) fail('EXIT did not return to the title: ' + JSON.stringify(s2));
  // free practice still works and has no tutorial banner
  await p.click('[data-act="training"]'); await p.waitForTimeout(150);
  await p.click('#selBtn'); await p.waitForTimeout(150); await p.click('#selBtn'); await p.waitForTimeout(150);
  await (await p.$('#stagegrid button')).click(); await p.waitForTimeout(400);
  s2 = await p.evaluate(() => ({ state: __R1F.G.state, tut: !!__R1F.G.tut, banner: document.getElementById('tut').hidden, bar: !document.getElementById('trainbar').hidden, tutorialFlag: !!__R1F.G.fight.tutorial }));
  if (s2.state !== 'fight' || s2.tut || !s2.banner || !s2.bar || s2.tutorialFlag) fail('free practice affected: ' + JSON.stringify(s2));
  await p.evaluate(() => __R1F.act('exittraining'));

  // ---------------------------------------------------------------- 3. movement placeholders + onEvent plumbing + text per fighter + touch text
  const plumb = await p.evaluate(() => {
    const { G, ROSTER, act } = __R1F, { Tut, LESSONS } = __TUT, out = {}, NONE_ = { l: 0, r: 0, u: 0, d: 0, b: 0, lp: 0, hp: 0, lk: 0, hk: 0, sp: 0, move: null };
    G.pick = 0; Tut.begin(0);
    // a new lesson added to the data list that listens for a Fight.onEvent name
    const stub = { id: 'stubDash', title: 'DASH', dummy: 'stand', text: () => 'Tap → twice.', check: (F, ev) => ev.mine && ev.name === 'dash' };
    LESSONS.splice(1, 0, stub); Tut.start(1);
    const F = G.fight; out.hasHook = typeof F.onEvent === 'function';
    F.onEvent(F.p[1], 'dash', {}); out.otherIgnored = !Tut.lock;
    F.onEvent(F.p[0], 'dash', { dir: 1 }); out.completed = Tut.lock === true && Tut.done.stubDash === 1;
    out.nice = !!(F.banner && F.banner.txt === 'NICE!');
    LESSONS.splice(1, 1); Tut.stop(); G.tut = null;
    // SP assist is accepted for the special lesson (and nudges toward the motion)
    G.pick = 0; Tut.begin(0); Tut.start(LESSONS.findIndex(l => l.id === 'special1'));
    const F2 = G.fight; F2.p[0].x = 150; F2.p[1].x = 330;
    F2.update({ ...NONE_, sp: 1 }); for (let i = 0; i < 40; i++) F2.update({ ...NONE_ });
    out.assistCounts = Tut.st.n === 1 && F2.pops.some(p => /MOTION/.test(p.s));
    // exam: losing a round restarts it, the exam is a real (non-training) CPU fight
    Tut.start(LESSONS.findIndex(l => l.id === 'exam'));
    const E = G.fight; out.examReal = !E.training && E.p[1].ctrl === 'ai' && E.p[1].maxHp < 60;
    E.applyHit(E.p[1], E.p[0], { dmg: 999, kb: 1, launch: 1 }, 1);
    for (let i = 0; i < 400 && G.fight === E; i++) E.update({ ...NONE_ });
    out.examRetry = G.fight !== E && G.fight.exam === true && !Tut.done.exam;
    Tut.stop(); G.tut = null;
    return out;
  });
  if (!plumb.hasHook || !plumb.otherIgnored || !plumb.completed || !plumb.nice || !plumb.assistCounts || !plumb.examReal || !plumb.examRetry) fail('onEvent plumbing: ' + JSON.stringify(plumb));
  const names = await p.evaluate(() => {
    const { G, ROSTER } = __R1F, { Tut, LESSONS } = __TUT, out = [], texts = [];
    const T = () => document.body.classList.contains('touch');
    for (const touch of [false, true]) {
      document.body.classList.toggle('touch', touch);
      ROSTER.forEach((d, i) => {
        G.pick = i;
        const L = k => Tut.lessonAt(LESSONS.findIndex(l => l.id === k)), tx = k => Tut.text(L(k)), KK = KITS[d.id], K = { ...Object.fromEntries(['S1', 'S2', 'S3', 'S4', 'super'].map(x => [x, KK[x] ? MOVES[KK[x]].name : ''])) };
        const need = [];
        need.push(['special1', K.S1]);
        for (const s of ['S2', 'S3', 'S4']) if (K[s]) need.push(['special234', K[s]]);
        need.push(['super', K.super]);
        need.push(['unique', null]);
        // movement lessons: dash / run / double jump read for the device, the air special names this fighter's air move (Tramp has none)
        for (const lid of ['dash', 'run', 'djump']) if (!tx(lid)) out.push(d.id + ' ' + lid + ' empty text');
        const air = KK.air ? Object.keys(KK.air).map(sl => MOVES[KK.air[sl]].name) : [], at = tx('airSpecial');
        texts.push((touch ? 'touch ' : 'kb    ') + d.id.padEnd(7) + at);
        if (air.length ? !at.includes(air[0]) : !/no air special/.test(at)) out.push((touch ? 'touch ' : 'kb ') + d.id + ' airSpecial text does not name ' + (air[0] || 'the no-air-special fallback') + ': ' + at);
        if (touch ? /\(or [A-Z]\)|\bE\b/.test(tx('dash') + tx('djump')) || !/joystick/.test(tx('dash')) : !/E\)/.test(tx('dash'))) out.push((touch ? 'touch ' : 'kb ') + d.id + ' dash/djump text not device specific: ' + tx('dash') + ' | ' + tx('djump'));
        for (const [lid, mv] of need) { const t = tx(lid); if (mv && !t.includes(mv)) out.push((touch ? 'touch ' : 'kb ') + d.id + ' ' + lid + ' lacks "' + mv + '": ' + t); if (!t) out.push(d.id + ' ' + lid + ' empty text'); }
        const u = L('unique'); if (!u.check || !u.title) out.push(d.id + ' unique lesson incomplete');
        if (touch && !/joystick|SP|tap|Push|Flick|Hold the/.test(tx('special1'))) out.push('touch text not device specific for ' + d.id + ': ' + tx('special1'));
        if (!touch && /joystick/.test(tx('walk'))) out.push('keyboard walk text mentions joystick');
      });
    }
    document.body.classList.remove('touch');
    return { out, texts };
  }).catch(e => ({ out: ['names eval failed ' + e.message], texts: [] }));
  for (const n of names.out) fail(n);
  notes.push('airSpecial lesson text:\n' + names.texts.join('\n'));
  if (!errs.length) notes.push('per-fighter text: 9 fighters x kb/touch OK');
  await p.context().close();

  // ---------------------------------------------------------------- 4. per-fighter special lessons for the fighters not run end to end
  for (const fid of ids.filter(i => !FIGHTERS.includes(i))) {
    const q = await page(1280, 720, false);
    await q.evaluate(id => { const { G, ROSTER } = __R1F; G.pick = ROSTER.findIndex(d => d.id === id); __TUT.Tut.begin(0); }, fid);
    await q.evaluate(DRIVER.replace(/^\(\(\) =>/, 'window.__drv = (() =>'));
    const r = await q.evaluate(() => { __TUT.Tut.start(__TUT.LESSONS.findIndex(l => l.id === 'unique')); return window.__drv('unique'); });
    const r2 = await q.evaluate(() => { __TUT.Tut.start(__TUT.LESSONS.findIndex(l => l.id === 'special234')); return window.__drv('special234'); });
    const r3 = await q.evaluate(() => { __TUT.Tut.start(__TUT.LESSONS.findIndex(l => l.id === 'super')); return window.__drv('super'); });
    const mv = [];
    for (const id of ['dash', 'run', 'djump', 'airSpecial']) mv.push(await q.evaluate(id => { __TUT.Tut.start(__TUT.LESSONS.findIndex(l => l.id === id)); return window.__drv(id); }, id));
    for (const x of [r, r2, r3, ...mv]) if (!x.ok) fail(fid + ': lesson ' + x.id + ' failed: ' + x.info);
    notes.push(fid + ': unique + special234 + super + dash/run/djump/airSpecial OK');
    await q.context().close();
  }

  // ---------------------------------------------------------------- 5. layout: banner clear of the HUD and the fighters on desktop and both phone orientations
  for (const [name, w, h, touch] of [['desktop', 1280, 720, false], ['phone-portrait', 390, 844, true], ['phone-landscape', 844, 390, true]]) {
    const q = await page(w, h, touch);
    await enter(q, 0); await shot(q, `picker_${name}`); await q.click('#tutgo'); await q.waitForTimeout(500);
    for (const lesson of ['walk', 'normals', 'blockHigh', 'special234', 'super', 'unique']) {
      const geo = await q.evaluate(lesson => {
        __TUT.Tut.start(__TUT.LESSONS.findIndex(l => l.id === lesson));
        const F = __R1F.G.fight; for (let i = 0; i < 3; i++) F.update({ l: 0, r: 0, u: 0, d: 0, b: 0, lp: 0, hp: 0, lk: 0, hk: 0, sp: 0, move: null });
        __TUT.Tut.layout();
        const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
        const sc = document.getElementById('screen').getBoundingClientRect();
        return { banner: r(document.getElementById('tut')), screen: { l: sc.left, t: sc.top, r: sc.right, b: sc.bottom, w: sc.width, h: sc.height }, dock: document.getElementById('tut').dataset.dock, vw: innerWidth, vh: innerHeight };
      }, lesson);
      const B = geo.banner, Sc = geo.screen, hudBottom = Sc.t + Sc.h * .13, fightersTop = Sc.t + Sc.h * .42; // HUD (bars, timer) is the top ~12% of the screen, fighters' heads start ~45% down
      const inScreen = !(B.b <= Sc.t || B.t >= Sc.b);
      if (B.l < -1 || B.r > geo.vw + 1 || B.b > geo.vh + 1 || B.t < -1) fail(`${name} ${lesson}: banner off screen ${JSON.stringify(B)}`);
      if (inScreen && geo.dock === 'in' && (B.t < hudBottom - 1 || B.b > fightersTop)) fail(`${name} ${lesson}: banner ${Math.round(B.t)}-${Math.round(B.b)} overlaps HUD (<${Math.round(hudBottom)}) or fighters (>${Math.round(fightersTop)})`);
      if (inScreen && geo.dock !== 'in') fail(`${name} ${lesson}: docked ${geo.dock} but overlaps the screen`);
      if (lesson === 'blockHigh' || lesson === 'special234' || lesson === 'unique') await shot(q, `layout_${name}_${lesson}`);
    }
    // the on-screen buttons of the touch layout are not covered by the banner
    if (touch) {
      const ov = await q.evaluate(() => { const a = document.getElementById('tut').getBoundingClientRect(); return [...document.querySelectorAll('#btns button,#dpad')].some(e => { const b = e.getBoundingClientRect(); return !(b.right < a.left || b.left > a.right || b.bottom < a.top || b.top > a.bottom); }); });
      if (ov) fail(name + ': banner overlaps the touch controls');
    }
    await q.context().close();
  }

  console.log(notes.join('\n'));
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'ttut: all PASS');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
