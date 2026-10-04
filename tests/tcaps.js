// Captions: speech bubbles over a speaking fighter, the CAPTIONS setting (r1f_caps), the story narration bar, the VS bubble.
// Run: NODE_PATH=<global node_modules> node tests/tcaps.js   (R1F_URL overrides the page URL, SHOTS a screenshot folder)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = process.env.R1F_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'r1f_caps_shots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (typeof info === 'string' ? info : JSON.stringify(info))));
const VIEWS = { desktop: { width: 1280, height: 720 }, portrait: { width: 390, height: 844, isMobile: true, hasTouch: true }, landscape: { width: 844, height: 390, isMobile: true, hasTouch: true } };

(async () => {
  const b = await chromium.launch(); const errs = [];
  try { await main(b, errs); } catch (e) { errs.push('test crashed: ' + e.message.split('\n')[0]); }
  await b.close();
  for (const r of results) console.log(r);
  if (errs.length) console.log(errs.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length + errs.length;
  console.log(fails ? `TCAPS ${fails} FAILED of ${results.length}` : `TCAPS OK ${results.length}`);
  process.exit(fails ? 1 : 0);
})();

async function main(b, errs) {
  const page = async (vp, init) => {
    const { width, height, ...rest } = vp || VIEWS.desktop, ctx = await b.newContext({ viewport: { width, height }, ...rest });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message));
    await p.goto(URL); await p.waitForTimeout(1300); return p;
  };
  // a fight, run to the 'play' phase with the fighters side by side
  const fight = (a, bId) => p => p.evaluate(([a, bId]) => {
    const { G, CAST, STAGES, Fight } = __R1F, ID = i => CAST.findIndex(d => d.id === i);
    G.pick = ID(a); const F = new Fight(CAST[ID(a)], CAST[ID(bId)], STAGES[1], { c1: 'human', c2: 'dummy', lvl2: 0 }); G.fight = F; G.state = 'fight';
    document.querySelectorAll('.scr').forEach(e => e.hidden = true);
    for (let k = 0; k < 900 && F.phase !== 'play'; k++) F.update({});
    F.p[1].x = F.p[0].x + 130; for (const f of F.p) f.cap = null; F.cam = (F.p[0].x + F.p[1].x) / 2 - 192;
  }, [a, bId]);

  // ---- bubble content, replacement, expiry, cooldown
  {
    const p = await page();
    await fight('tramp', 'xing')(p);
    const r = await p.evaluate(() => {
      const F = __R1F.G.fight, [a, b] = F.p, out = {};
      F.startSpecial(a, 'taunt', 0); out.tauntCap = a.cap && a.cap.s; out.life = a.cap && a.cap.life;
      out.otherNone = !b.cap;
      F.voice(b, 'win'); out.bWin = b.cap && b.cap.s;
      F.voice(a, 'ko'); out.replaced = a.cap && a.cap.s; // newest replaces, one bubble per fighter
      a.cap = null; a.capAt = null; F.voice(a, 'taunt', 2000); const first = a.cap; a.cap = null; F.voice(a, 'taunt', 2000); out.cool = a.cap === null && !!first;
      a.cap = { s: 'x', t: 0, life: 5 }; for (let i = 0; i < 6; i++) F.updFx(); out.expired = a.cap === null;
      out.missing = []; for (const id in __R1F.VOICE_TEXT) for (const k of ['intro', 'super', 'sig', 'win', 'taunt', 'ko']) if (!__R1F.VOICE_TEXT[id][k]) out.missing.push(id + '_' + k);
      out.cast = __R1F.CAST.map(d => d.id).filter(id => !__R1F.VOICE_TEXT[id]);
      return out;
    });
    ok('taunt shows the taunt line as a bubble on the taunter only', r.tauntCap === 'Sad! Very sad!' && r.otherNone, r);
    ok('bubble lasts 1.6-2.5 s', r.life >= 96 && r.life <= 150, r.life);
    ok('win quote on the other fighter; newest line replaces the old one', r.bWin === 'IPO complete. Plus four sixty.' && r.replaced === 'Rigged! Totally rigged!', r);
    ok('taunt cooldown applies to the bubble too', r.cool, r);
    ok('bubble expires', r.expired, r);
    ok('every fighter has text for all six voice keys', !r.missing.length && !r.cast.length, r);
    // pixels: the bubble is drawn above the head, and nothing is drawn with CAPTIONS off
    const px = () => p.evaluate(() => {
      const F = __R1F.G.fight, a = F.p[0]; a.cap = { s: 'Sad! Very sad!', t: 20, life: 140, key: 'taunt' }; F.draw();
      const c = document.getElementById('h').getContext('2d'), x = Math.round(F.hx(a.x) * 2), y0 = Math.round((a.y - 82 * a.sc) * 1.25 * 2);
      const d = c.getImageData(Math.max(0, x - 60), Math.max(0, y0 - 100), 120, 90).data; let light = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] > 230 && d[i + 2] > 200 && d[i + 3] > 200) light++;
      return light;
    });
    const on = await px();
    await p.evaluate(() => __R1F.act('caps')); const off = await px();
    ok('bubble is drawn above the head, and not at all with CAPTIONS off', on > 300 && off === 0, { on, off });
    ok('setting saved (r1f_caps=0) and button label flips', await p.evaluate(() => localStorage.getItem('r1f_caps') === '0' && [...document.querySelectorAll('[data-act=caps]')].every(e => e.textContent === 'CAPTIONS: OFF')));
    await p.reload(); await p.waitForTimeout(1200);
    ok('CAPTIONS stays off after reload', await p.evaluate(() => __R1F.CAPS.on === false && document.querySelector('[data-act=caps]').textContent === 'CAPTIONS: OFF'));
    await p.evaluate(() => __R1F.act('caps'));
    ok('toggles back on', await p.evaluate(() => __R1F.CAPS.on === true && localStorage.getItem('r1f_caps') === '1'));
  }
  // ---- default ON; sound OFF still shows bubbles even though no clip plays
  {
    const p = await page(null, () => { try { if (!sessionStorage.getItem('x')) { localStorage.setItem('r1f_sound', '0'); localStorage.removeItem('r1f_caps'); sessionStorage.setItem('x', '1'); } } catch (e) {} });
    ok('CAPTIONS defaults to ON while SOUND is off', await p.evaluate(() => __R1F.CAPS.on === true && __R1F.AU.on === false));
    await fight('dario', 'sam')(p);
    const r = await p.evaluate(() => { const F = __R1F.G.fight, a = F.p[0]; F.startSpecial(a, 'taunt', 0); return { s: a.cap && a.cap.s, snd: __R1F.AU.on, voiced: __R1F.AU.voiceLog.length }; });
    ok('bubble shows with sound off / no clip played', r.s === 'I have concerns.' && !r.snd && r.voiced === 0, r);
  }
  // ---- BIG HEAD MODE (daily): the bubble sits above the 1.65x head, not on it
  {
    const p = await page();
    const r = await p.evaluate(() => {
      const { Fight, ROSTER, STAGES } = __R1F, mk = mods => new Fight(ROSTER[2], ROSTER[0], STAGES[0], { c1: 'human', c2: 'ai', mods });
      const a = mk(null), b = mk({ bighead: 1 }); return { plain: a.capHeadY(a.p[0]), big: b.capHeadY(b.p[0]) }; // HUD units (480 wide)
    });
    ok('BIG HEAD MODE lifts the speech bubble above the enlarged head', r.plain - r.big >= 8, r);
  }
  // ---- Singularity lines + phase 2
  {
    const p = await page();
    await fight('sing', 'tramp')(p);
    const r = await p.evaluate(() => { const F = __R1F.G.fight, a = F.p[0]; F.voice(a, 'phase2'); const s = a.cap && a.cap.s; F.voice(a, 'super'); return { s, s2: a.cap.s }; });
    ok('THE SINGULARITY phase-2 and super lines get bubbles', r.s === 'Phase two. Your kits are now my kits.' && r.s2 === 'Recursive self-improvement.', r);
  }
  // ---- story: caption bar in sync with the panel, with sound off too
  {
    const p = await page(null, () => { try { localStorage.setItem('r1f_sound', '0'); } catch (e) {} });
    await p.evaluate(() => { const { G, ROSTER } = __R1F; G.pick = ROSTER.findIndex(d => d.id === 'tramp'); __P3.startArcade(); });
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const e = document.getElementById('scap'), cs = getComputedStyle(e), S = __P3.Story; return { txt: e.textContent, want: __P3.INTRO[S.i].cap, who: e.dataset.who, vis: e.offsetParent !== null && e.getBoundingClientRect().height > 8, bg: cs.backgroundColor, fs: parseFloat(cs.fontSize), st: __R1F.G.state }; });
    ok('story panel shows its narration caption in the subtitle bar (ANNOUNCER tag, dark box, readable)', r.st === 'story' && r.txt === r.want && r.who === 'ANNOUNCER' && r.vis && /rgba\(0, 0, 0, 0\.7/.test(r.bg) && r.fs >= 10.5, r);
    await p.evaluate(() => { __P3.Story.t = 99; __P3.Story.next(); }); await p.waitForTimeout(200);
    ok('caption follows the next panel', await p.evaluate(() => document.getElementById('scap').textContent === __P3.INTRO[1].cap));
  }
  // ---- VS screen: banter data + the bubble timeline; hidden when CAPTIONS off
  {
    const p = await page();
    const r = await p.evaluate(() => {
      const { G, ROSTER } = __R1F; G.pick = ROSTER.findIndex(d => d.id === 'tramp'); __P3.startArcade(); __P3.Story.skip();
      for (let i = 0; i < G.ladder.length; i++) { G.stage = i; if (__P3.isRivalFight()) break; }
      __P3.goVS(); const ls = G.vsLines;
      return { n: ls.length, whos: ls.map(l => l.who), clips: ls.map(l => l.clip), st: G.state };
    });
    ok('rival fight: 4 banter lines alternate player/rival, each with its clip', r.n === 4 && r.whos.join() === '0,1,0,1' && r.clips.every(c => /^banter_tramp_xi_[1-4]$/.test(c)), r);
    await p.waitForTimeout(1500);
    const t = await p.evaluate(() => { const G = __R1F.G; return { line: G.vsLine, len: G.vsLineLen, st: G.state }; });
    ok('VS line advances on its own timer even with no clip', t.st === 'vs' && t.line >= 0 && t.len >= 60, t);
  }
  // ---- narration bar API (announcer fallback)
  {
    const p = await page();
    const r = await p.evaluate(() => { const C = __R1F.CAPS; C.narr('ANNOUNCER', 'TEST LINE', 5000); const e = document.getElementById('capbar'); const a = { vis: !e.hidden, who: e.dataset.who, txt: e.textContent }; C.set(false); a.hid = e.hidden; C.narr('X', 'nope'); a.stay = e.hidden; C.set(true); return a; });
    ok('narration bar shows name tag + text and obeys CAPTIONS', r.vis && r.who === 'ANNOUNCER' && r.txt === 'TEST LINE' && r.hid && r.stay, r);
  }
  // ---- screenshots on three viewports
  for (const [name, vp] of Object.entries(VIEWS)) {
    const p = await page(vp);
    await fight('tramp', 'xing')(p);
    await p.evaluate(() => { const F = __R1F.G.fight, V = __R1F.VOICE_TEXT; F.p[0].cap = { s: V.tramp.win, t: 30, life: 999, key: 'win' }; F.p[1].cap = { s: V.xing.sig, t: 30, life: 999, key: 'sig' }; });
    await p.waitForTimeout(150); await p.screenshot({ path: path.join(SHOTS, `fight_${name}.png`) });
    await p.evaluate(() => { const F = __R1F.G.fight; F.p[0].y = 60; F.p[0].vy = 0; });
    await p.waitForTimeout(100); await p.screenshot({ path: path.join(SHOTS, `fight_high_${name}.png`) });
    await p.evaluate(() => { const { G, ROSTER } = __R1F; G.pick = ROSTER.findIndex(d => d.id === 'tramp'); __P3.startArcade(); }); await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(SHOTS, `story_${name}.png`) });
    await p.evaluate(() => { __P3.Story.skip(); }); await p.waitForTimeout(2600);
    await p.screenshot({ path: path.join(SHOTS, `vs_${name}.png`) });
    await p.close();
  }
}
