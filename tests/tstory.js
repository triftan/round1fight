// Phase 3 story mode (docs/PHASE3_SPEC.md): a full arcade run driven through window.__R1F / __P3 with forced wins.
// Checks the 10-slot ladder (8 unique opponents on their home stages, rival at fight 8, bonus stage after fight 4,
// THE SINGULARITY last), the AI ramp, the Cybertruck damage states, the boss's mirror phase and phase-2 transform with
// every stolen special firing, the continue screen (continue + timeout), the ending (+ marked seen), the unlock surviving
// a reload, the gallery, resume-run, and that every fighter has rival banter.
// Run: NODE_PATH=<global node_modules> node tests/tstory.js   (R1F_URL overrides the page URL, SHOTS a screenshot folder)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = process.env.R1F_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'r1f_story_shots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, cond, info) => results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (typeof info === 'string' ? info : JSON.stringify(info))));
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, 'story_' + n + '.png') });
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
    win() { return this.end(G.fight, 0); },
    lose() { return this.end(G.fight, 1); },
  };
};

(async () => {
  const b = await chromium.launch(); const errs = [];
  try { await main(b, errs); } catch (e) { errs.push('test crashed: ' + e.message.split('\n')[0]); }
  await b.close();
  for (const r of results) console.log(r);
  if (errs.length) console.log(errs.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length + errs.length;
  console.log(fails ? `TSTORY ${fails} FAILED of ${results.length}` : `TSTORY OK ${results.length}`);
  process.exit(fails ? 1 : 0);
})();
async function main(b, errs) {
  const page = async (vp, init) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 720 } });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    await p.goto(URL); await p.waitForTimeout(1300); await p.evaluate(HELPERS); return p;
  };
  // ------------------------------------------------------------ data: rivals, banter, trash talk, endings
  {
    const p = await page();
    const d = await p.evaluate(() => {
      const { ROSTER } = __R1F, { RIVAL, BANTER, TRASH, ENDINGS, HOME, homeStage } = __P3;
      return ROSTER.map(f => ({ id: f.id, rival: RIVAL[f.id], banter: (BANTER[f.id] || []).map(l => l[0]), trash: !!TRASH[f.id], end: (ENDINGS[f.id] || []).length, home: homeStage(f.id).bg === HOME[f.id] }));
    });
    for (const f of d) {
      ok(`${f.id}: rival ${f.rival}`, !!f.rival && f.rival !== f.id, f);
      ok(`${f.id}: rival banter 3-4 lines, both speak`, f.banter.length >= 3 && f.banter.length <= 4 && f.banter.includes(0) && f.banter.includes(1), f);
      ok(`${f.id}: trash talk + 3 ending panels + home stage`, f.trash && f.end === 3 && f.home, f);
    }
    await p.close();
  }
  // ------------------------------------------------------------ the full run as Tramp
  const p = await page();
  await p.evaluate(() => { localStorage.clear(); const { G, ROSTER } = __R1F; G.pick = ROSTER.findIndex(d => d.id === 'tramp'); __P3.startArcade(); });
  await p.waitForTimeout(400);
  const intro = await p.evaluate(() => ({ st: __R1F.G.state, n: __P3.Story.panels.length, cap: document.getElementById('scap').textContent, vis: !document.getElementById('story').hidden }));
  ok('arcade opens with the 3-panel AGI Summit intro', intro.st === 'story' && intro.n === 3 && intro.vis && /AGI SUMMIT/.test(intro.cap), intro);
  await shot(p, '01_intro');
  await p.keyboard.press('Space'); await p.waitForTimeout(200);
  ok('a key advances the intro', await p.evaluate(() => __P3.Story.i === 1), '');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const lad = await p.evaluate(() => {
    const { G, CAST } = __R1F, { BONUS, SING_I, RIVAL } = __P3;
    const opp = G.ladder.filter(e => e !== BONUS && e !== SING_I);
    return { st: G.state, len: G.ladder.length, bonusAt: G.ladder.indexOf(BONUS), last: G.ladder[9], sing: SING_I, opp: opp.map(i => CAST[i].id), rival: RIVAL.tramp, saved: !!__P3.loadRun() };
  });
  ok('Esc skips the intro to the VS screen', lad.st === 'vs', lad);
  ok('ladder: 10 slots, bonus at slot 5, Singularity last', lad.len === 10 && lad.bonusAt === 4 && lad.last === lad.sing, lad);
  ok('ladder: 8 unique opponents, never the player', lad.opp.length === 8 && new Set(lad.opp).size === 8 && !lad.opp.includes('tramp'), lad);
  ok('ladder: the rival is the 8th opponent', lad.opp[7] === lad.rival, lad);
  ok('run saved on the VS screen', lad.saved, lad);
  const lvls = [], stages = [];
  for (let slot = 0; slot < 9; slot++) {
    const info = await p.evaluate(() => {
      const { G } = __R1F, P = __P3;
      if (P.curOpp && G.ladder[G.stage] === P.BONUS) return { bonus: true, st: G.state };
      return { st: G.state, opp: P.curOpp().id, rival: P.isRivalFight(), lines: G.vsLines.map(l => [l.who, l.clip || '']), fightNo: P.fightNo() };
    });
    if (info.bonus) {
      // ---------------------------------------------------- bonus stage
      const b1 = await p.evaluate(() => {
        const { G } = __R1F, F = G.fight; __T.play(F);
        const T = F.p[1], seen = [F.bonus.state], hp0 = T.hp;
        for (let k = 0; k < 5; k++) { F.applyHit(F.p[0], T, { dmg: 9, kb: 1 }, 1, T.x - 40, GY - 30); for (let j = 0; j < 8; j++) F.update({}); seen.push(F.bonus.state); }
        return { st: G.state, bonus: !!F.bonus, timer: F.timer, hpDrop: hp0 - T.hp, seen, x: T.x, hidden: T.hidden, banner: F.banner && F.banner.txt };
      });
      ok('bonus stage starts after fight 4 (30 s timer)', b1.st === 'fight' && b1.bonus && b1.timer <= 30 && b1.timer >= 28, b1);
      ok('bonus: hits damage the truck', b1.hpDrop > 30, b1);
      // a real special on the truck: Tramp's Liberation Day Boomerang
      const b2 = await p.evaluate(() => {
        const { G } = __R1F, F = G.fight, T = F.p[1], a = F.p[0]; a.x = T.x - 120; a.state = 'idle'; a.facing = 1; const h0 = T.hp, hits0 = F.bonus.hits;
        F.startSpecial(a, 'S1', 1); for (let k = 0; k < 120; k++) F.update({});
        // and normals in the real input path
        a.x = T.x - 70; for (let k = 0; k < 6; k++) { F.update({ hp: 1 }); for (let j = 0; j < 26; j++) F.update({}); }
        return { special: h0 - T.hp, hits: F.bonus.hits - hits0, state: F.bonus.state };
      });
      ok('bonus: specials and normals hit the truck', b2.special > 0 && b2.hits >= 3, b2);
      await p.evaluate(() => { const F = __R1F.G.fight, T = F.p[1]; while (F.bonus.state < 2) F.truckHit(F.p[0], T, { dmg: 8, kb: 1 }, 1, T.x - 30, GY - 30); F.p[0].x = T.x - 60; });
      await p.waitForTimeout(250); await shot(p, '03_bonus_smash');
      const b3 = await p.evaluate(() => {
        const { G } = __R1F, F = G.fight, T = F.p[1], seen = [];
        while (!F.bonus.wreck) { F.truckHit(F.p[0], T, { dmg: 10, kb: 1 }, 1, T.x - 30, GY - 30); seen.push(F.bonus.state); }
        for (let k = 0; k < 12 && !F.bonus.result; k++) F.update({}); const r = Object.assign({}, F.bonus.result), banner = F.banner && F.banner.txt, score = F.score;
        for (let k = 0; k < 400 && G.fight === F && G.state === 'fight'; k++) F.update({});
        return { r, banner, seen: [...new Set(seen)], score, st: G.state, stage: G.stage };
      });
      ok('bonus: damage states 1-4 in order', JSON.stringify(b3.seen.filter(s => s >= 2)) === '[2,3,4]', b3);
      ok('bonus: wrecking it = PERFECT + time bonus', b3.r.perfect && b3.banner === 'PERFECT!' && b3.r.timeBonus > 0 && b3.score > 0, b3);
      ok('bonus: then on to fight 5', b3.st === 'vs' && b3.stage === 5, b3);
      continue;
    }
    ok(`slot ${slot + 1}: VS screen`, info.st === 'vs', info);
    if (info.fightNo === 8) {
      ok('fight 8 is the rival fight with 4 banter lines', info.opp === 'xi' && info.rival && info.lines.length === 4 && info.lines.every(l => /^banter_tramp_xi_\d$/.test(l[1])), info);
      await p.waitForFunction(() => __R1F.G.vsLine >= 1, null, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(200); await shot(p, '02_vs_banter');
    } else ok(`fight ${info.fightNo}: one trash-talk line from ${info.opp}`, info.lines.length === 1 && info.lines[0][0] === 1, info);
    const f = await p.evaluate(() => {
      const { G } = __R1F, P = __P3; P.startFight(); const F = G.fight;
      return { st: G.state, opp: F.p[1].def.id, stage: F.stage.bg, home: P.homeStage(F.p[1].def.id).bg, lvl: F.p[1].lvl, mult: F.mult };
    });
    lvls.push(f.lvl); stages.push(f.stage);
    ok(`fight ${info.fightNo}: ${f.opp} on its home stage (${f.stage})`, f.stage === f.home && f.mult === slot + 1, f);
    if (slot === 2) { await p.waitForTimeout(1500); await shot(p, '00_home_stage_fight'); }
    const r = await p.evaluate(() => { const st = __T.win(); return { st, bonus: !!(__R1F.G.fight && __R1F.G.fight.bonus) }; });
    ok(`fight ${info.fightNo}: forced win moves on`, info.fightNo === 4 ? r.st === 'fight' && r.bonus : r.st === 'vs', r);
  }
  ok('AI ramps up fight by fight', lvls.every((v, i) => i === 0 || v > lvls[i - 1]), lvls);
  ok('the new home stages appear (Mar-a-Lago / launch pad / Great Hall / Meta roof as owners show up)', stages.some(s => ['launchpad', 'greathall', 'metaroof'].includes(s)), stages);
  // ------------------------------------------------------------ THE SINGULARITY
  const s1 = await p.evaluate(() => {
    const { G } = __R1F, P = __P3, K = P.KITS;
    const vs = { opp: P.curOpp().id, fightNo: P.fightNo(), line: G.vsLines[0].s };
    P.startFight(); const F = G.fight, s = F.p[1]; __T.play(F);
    return { vs, stage: F.stage.bg, lvl: s.lvl, maxHp: s.maxHp, ph: s.sing.ph, mirror: ['S1', 'S2', 'S3', 'grab', 'super'].every(k => s.kit[k] === K.tramp[k]), armor: s.kit.armor, skin: s.skin };
  });
  ok('fight 9 / slot 10 is THE SINGULARITY in the void', s1.vs.opp === 'sing' && s1.vs.fightNo === 9 && s1.stage === 'void', s1);
  ok('boss: more HP, armor, hardest AI', s1.maxHp > 150 && s1.armor === 1 && s1.lvl >= .95, s1);
  ok('boss phase 1 mirrors the player\'s kit', s1.ph === 1 && s1.mirror && s1.skin === 'tramp', s1);
  await p.waitForTimeout(1200); await shot(p, '04_sing_phase1');
  const s2 = await p.evaluate(() => {
    const { G } = __R1F, F = G.fight, s = F.p[1]; const evs = []; F.onEvent = (f, n) => evs.push(n);
    s.hp = s.maxHp * .5 - 1; F.update({});
    return { ph: s.sing.ph, banner: F.banner && F.banner.txt, freeze: F.superFreeze, evs };
  });
  ok('at <=50% HP: PHASE 2 glitch transform', s2.ph === 2 && s2.banner === 'PHASE 2' && s2.freeze > 0 && s2.evs.includes('singPhase2'), s2);
  await p.waitForTimeout(450); await shot(p, '05_sing_phase2_glitch');
  const s3 = await p.evaluate(() => {
    const { G } = __R1F, F = G.fight, s = F.p[1]; for (let k = 0; k < 80; k++) F.update({});
    return { victim: s.sing.victim, skin: s.skin, steals: s.sing.steals, next: s.sing.next };
  });
  ok('phase 2 steals a kit right away', !!s3.victim && s3.victim !== 'tramp' && s3.skin === s3.victim && s3.steals >= 1, s3);
  await p.waitForTimeout(1500); await shot(p, '06_sing_phase2');
  const s4 = await p.evaluate(() => {
    const { G } = __R1F, F = G.fight, s = F.p[1], pl = F.p[0], fired = [], bad = [];
    const v0 = s.sing.victim; for (let k = 0; k < 420 && s.sing.victim === v0; k++) { F.update({}); s.hp = s.maxHp * .4; pl.hp = pl.maxHp; if (F.phase !== 'play') F.setPhase('play'); }
    const rotated = s.sing.victim !== v0;
    s.ctrl = 'dummy'; G.trainMode = 'stand'; const prevEnd = F.onEnd; F.onEnd = null;
    const reset = () => { for (const f of F.p) { Object.assign(f, { state: 'idle', y: GY, vx: 0, vy: 0, hijack: 0, lock: 0, stun: 0, stunned: 0, slow: 0, invul: 0, hidden: false, scripted: false }); f.hp = f.maxHp; }
      pl.x = 200; s.x = 262; pl.facing = 1; s.facing = -1; F.projs.length = 0; F.timer = 60; F.hitstop = 0; F.superFreeze = 0; F.slow = 0; F.wins = [0, 0]; if (F.phase !== 'play') F.setPhase('play'); };
    for (const d of __R1F.ROSTER) {
      if (d.id === 'tramp') continue;
      F.singSteal(s, d.id); s.sing.next = 1e9; // hold this kit while its moves are tested
      for (const slot of ['S1', 'S2', 'S3', 'S4', 'grab', 'super']) {
        if (!s.kit[slot]) continue;
        try {
          reset(); s.meter = 100; if (slot === 'super') s.hp = s.maxHp * .3;
          F.startSpecial(s, slot, 1); const mv = s.mv, st = s.state;
          for (let k = 0; k < 150; k++) { F.update({}); s.hp = Math.max(s.hp, 2); pl.hp = pl.maxHp; if (F.phase !== 'play') F.setPhase('play'); }
          if (st === 'special') fired.push(d.id + '.' + slot + ':' + mv); else bad.push(d.id + '.' + slot + ' did not fire (' + st + ')');
        } catch (e) { bad.push(d.id + '.' + slot + ' threw ' + e.message); }
      }
      for (const slot of Object.keys(s.kit.air || {})) {
        try {
          reset(); s.y = GY - 70; s.state = 'jump'; s.vy = -1; s.t = 10; s.airAct = 0;
          F.startSpecial(s, slot, 0, true); const st = s.state, mv = s.mv;
          for (let k = 0; k < 90; k++) { F.update({}); s.hp = Math.max(s.hp, 2); pl.hp = pl.maxHp; if (F.phase !== 'play') F.setPhase('play'); }
          if (st === 'special') fired.push(d.id + '.air' + slot + ':' + mv); else bad.push(d.id + '.air ' + slot + ' did not fire');
        } catch (e) { bad.push(d.id + '.air' + slot + ' threw ' + e.message); }
      }
    }
    // the AI uses the stolen kit on its own too
    reset(); s.ctrl = 'ai'; s.lvl = .96; const used = new Set(); F.singSteal(s, 'wong'); s.sing.next = 1e9;
    for (let k = 0; k < 1500; k++) { F.update({}); if (s.state === 'special') used.add(s.mv); s.hp = Math.max(s.hp, s.maxHp * .3); pl.hp = pl.maxHp; if (F.phase !== 'play') F.setPhase('play'); }
    F.onEnd = prevEnd; reset();
    return { rotated, fired, bad, aiUsed: [...used] };
  });
  ok('phase 2 rotates to a new kit every ~4 s', s4.rotated, s4);
  ok(`every stolen special fires without errors (${s4.fired.length} moves)`, s4.bad.length === 0 && s4.fired.length >= 40, s4.bad.join('; ') || s4.fired.length);
  ok('boss AI uses its stolen specials', s4.aiUsed.length >= 2, s4.aiUsed);
  // ------------------------------------------------------------ continue screen: lose, continue, the same fight again
  const c1 = await p.evaluate(() => { const { G } = __R1F, stage = G.stage, score = G.score; const st = __T.lose(); return { st, stage, score, vis: !document.getElementById('cont').hidden, n: document.getElementById('ccount').textContent }; });
  ok('a loss shows CONTINUE? with a 10 s countdown', c1.st === 'continue' && c1.vis && c1.n === '10', c1);
  await p.waitForTimeout(1300); await shot(p, '07_continue');
  const c2 = await p.evaluate(() => document.getElementById('ccount').textContent);
  ok('the countdown ticks', +c2 <= 9 && +c2 >= 7, c2);
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(150);
  const c3 = await p.evaluate(() => { const { G } = __R1F; return { st: G.state, stage: G.stage, mult: G.mult, conts: G.conts, opp: __P3.curOpp().id }; });
  ok('any key continues: same fight, multiplier reset to 1', c3.st === 'vs' && c3.stage === c1.stage && c3.mult === 1 && c3.conts === 1 && c3.opp === 'sing', c3);
  // ------------------------------------------------------------ beat the boss: ending, credits, result, unlock
  const e1 = await p.evaluate(() => { __P3.startFight(); const st = __T.win(); const S = __P3.Story; return { st, n: S.panels.length, key: S.panels[0] && S.panels[0].key, seen: __P3.seenEndings(), unlocked: __P3.singUnlocked(), run: !!__P3.loadRun() }; });
  ok('beating THE SINGULARITY plays the 3-panel ending', e1.st === 'story' && e1.n === 3 && e1.key === 'ending_tramp_1', e1);
  ok('ending marked seen + Singularity unlocked + run cleared', e1.seen.includes('tramp') && e1.unlocked && !e1.run, e1);
  await p.keyboard.press('Space'); await p.waitForTimeout(300); await shot(p, '08_ending_panel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  ok('then the credits roll', await p.evaluate(() => __R1F.G.state === 'credits' && !document.getElementById('credits').hidden), '');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const e2 = await p.evaluate(() => ({ st: __R1F.G.state, t: document.getElementById('rtitle').textContent, sub: document.getElementById('rsub').textContent, champ: __R1F.G.run && __R1F.G.run.champ }));
  ok('then the CHAMPION result screen (leaderboard entry)', e2.st === 'result' && e2.t === 'CHAMPION!' && /SINGULARITY/.test(e2.sub) && e2.champ, e2);
  await p.context().close();
  // ------------------------------------------------------------ persistence across a reload + gallery + select screen
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    const q = await ctx.newPage(); q.on('pageerror', e => errs.push('pageerror ' + e.message));
    await q.goto(URL); await q.waitForTimeout(1200);
    await q.evaluate(() => { localStorage.setItem('r1f_unlock_sing', '1'); localStorage.setItem('r1f_endings', '["tramp"]'); });
    await q.reload(); await q.waitForTimeout(1300); await q.evaluate(HELPERS);
    const g1 = await q.evaluate(() => { __R1F.act('start'); const vis = [...document.querySelectorAll('#grid .card')].filter(c => !c.hidden).map(c => c.querySelector('b').textContent); __R1F.act('menu'); return { unlocked: __P3.singUnlocked(), vis }; });
    ok('unlock persists after a reload: 10 cards, the last one ★', g1.unlocked && g1.vis.length === 10 && /★/.test(g1.vis[9]), g1);
    const g2 = await q.evaluate(() => { __R1F.act('gallery'); const c = [...document.querySelectorAll('#ggrid .gcard')]; return { st: __R1F.G.state, n: c.length, open: c.filter(x => !x.classList.contains('lock')).map(x => x.dataset.id), count: document.getElementById('gcount').textContent }; });
    ok('gallery: 9 endings, the seen one open, the rest locked', g2.st === 'gallery' && g2.n === 9 && g2.open.join() === 'tramp' && /1 \/ 9/.test(g2.count), g2);
    await q.waitForTimeout(200); await q.screenshot({ path: path.join(SHOTS, 'story_09_gallery_desk.png') });
    await q.click('.gcard[data-id=tramp]'); await q.waitForTimeout(300);
    const g3 = await q.evaluate(() => ({ st: __R1F.G.state, n: __P3.Story.panels.length, k: __P3.Story.panels[0].key }));
    ok('gallery: tapping a seen ending replays its 3 panels', g3.st === 'story' && g3.n === 3 && g3.k === 'ending_tramp_1', g3);
    await q.keyboard.press('Escape'); await q.waitForTimeout(250);
    ok('gallery: back from the ending', await q.evaluate(() => __R1F.G.state === 'gallery'), '');
    await q.evaluate(() => document.querySelector('.gcard[data-id=xi]').click()); await q.waitForTimeout(150);
    ok('gallery: a locked ending stays locked', await q.evaluate(() => __R1F.G.state === 'gallery'), '');
    // the unlocked boss is playable (training): mirrors the dummy, own move list
    const t1 = await q.evaluate(() => {
      const { G, CAST, STAGES, Fight, ROSTER } = __R1F; const sing = CAST.findIndex(d => d.id === 'sing');
      __R1F.act('menu'); __R1F.act('start'); document.querySelectorAll('#grid .card')[sing].click();
      const moves = document.getElementById('imoves').innerText;
      const F = new Fight(CAST[sing], ROSTER[3], STAGES[9], { c1: 'human', c2: 'dummy', training: true, mult: 0 }); G.fight = F; G.state = 'fight';
      document.querySelectorAll('.scr').forEach(e => e.hidden = true); __T.play(F); const s = F.p[0];
      s.hp = s.maxHp * .4; for (let k = 0; k < 120; k++) F.update({}); return { moves, mirror: s.kit.S1 === __P3.KITS.dario.S1 || s.sing.ph === 2, ph: s.sing.ph, victim: s.sing.victim };
    });
    ok('THE SINGULARITY is selectable, with its own move list, and plays both phases', /MIRROR/.test(t1.moves) && t1.ph === 2 && !!t1.victim, t1);
    await q.waitForTimeout(800); await q.screenshot({ path: path.join(SHOTS, 'story_10_sing_player.png') });
    await ctx.close();
  }
  // ------------------------------------------------------------ continue timeout -> game over; resume a saved run
  {
    const q = await page();
    const r0 = await q.evaluate(() => { localStorage.clear(); const { G, ROSTER } = __R1F; G.pick = ROSTER.findIndex(d => d.id === 'sam'); __P3.startArcade(); __P3.Story.skip(); const lad = G.ladder.slice(); __P3.startFight(); return { lad, st: __T.lose() }; });
    ok('lose fight 1 -> continue screen', r0.st === 'continue', r0);
    await q.waitForTimeout(10600);
    const r1 = await q.evaluate(() => ({ st: __R1F.G.state, t: document.getElementById('rtitle').textContent, sub: document.getElementById('rsub').textContent, run: !!__P3.loadRun() }));
    ok('no answer for 10 s = GAME OVER + leaderboard form, run cleared', r1.st === 'result' && r1.t === 'GAME OVER' && /FIGHT 1/.test(r1.sub) && !r1.run, r1);
    const r2 = await q.evaluate(() => { const { G, ROSTER } = __R1F; G.pick = ROSTER.findIndex(d => d.id === 'zuck'); __P3.startArcade(); __P3.Story.skip(); __P3.startFight(); __T.win(); return { stage: G.stage, ladder: G.ladder.slice(), st: G.state }; });
    await q.reload(); await q.waitForTimeout(1300); await q.evaluate(HELPERS);
    const r3 = await q.evaluate(() => ({ btn: !document.getElementById('resumeBtn').hidden }));
    ok('a saved run shows RESUME RUN on the title after a reload', r2.st === 'vs' && r3.btn, { r2, r3 });
    await q.click('#resumeBtn'); await q.waitForTimeout(200);
    const r4 = await q.evaluate(() => { const { G, CAST } = __R1F; return { st: G.state, stage: G.stage, ladder: G.ladder, pick: CAST[G.pick].id }; });
    ok('RESUME RUN continues the same ladder at the same fight', r4.st === 'vs' && r4.stage === r2.stage && JSON.stringify(r4.ladder) === JSON.stringify(r2.ladder) && r4.pick === 'zuck', r4);
    await q.context().close();
  }
  // ------------------------------------------------------------ phone layouts: title buttons, gallery, story, continue
  const seed = () => { try { localStorage.setItem('r1f_unlock_sing', '1'); localStorage.setItem('r1f_endings', '["tramp","xi","wong"]'); localStorage.setItem('r1f_run', JSON.stringify({ v: 1, pick: 0, ladder: [1, 2, 3, 4, -1, 5, 6, 7, 2, 9], stage: 2, score: 1000, mult: 3, fats: 0, flaws: 0, conts: 0 })); } catch (e) {} };
  for (const [tag, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }], ['desk', { width: 1280, height: 720 }]]) {
    const q = await page(vp, seed);
    const lay = await q.evaluate(() => {
      const sc = document.getElementById('screen').getBoundingClientRect();
      const bs = [...document.querySelectorAll('#title .btn')].filter(x => !x.hidden).map(x => ({ t: x.textContent, r: x.getBoundingClientRect() }));
      let overlap = null;
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i].r, c = bs[j].r; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) overlap = bs[i].t + '/' + bs[j].t; }
      const f = document.querySelector('#title .foot').getBoundingClientRect();
      return { n: bs.length, names: bs.map(x => x.t), overlap, inside: bs.every(x => x.r.left >= sc.left && x.r.right <= sc.right && x.r.top >= sc.top && x.r.bottom <= sc.bottom), foot: bs.some(x => x.r.bottom > f.top + 1 && x.r.top < f.bottom) };
    });
    ok(`${tag}: title with GALLERY + RESUME RUN fits, no overlap`, lay.names.includes('GALLERY') && lay.names.includes('RESUME RUN') && !lay.overlap && lay.inside && !lay.foot, lay);
    await q.screenshot({ path: path.join(SHOTS, `story_11_title_${tag}.png`) });
    await q.evaluate(() => __R1F.act('gallery')); await q.waitForTimeout(250);
    const gl = await q.evaluate(() => {
      const sc = document.getElementById('screen').getBoundingClientRect(), els = [...document.querySelectorAll('#gallery h2, #ggrid .gcard, #gcount, #gallery .btn')].map(e => e.getBoundingClientRect());
      return { inside: els.every(r => r.top >= sc.top - 1 && r.bottom <= sc.bottom + 1 && r.left >= sc.left - 1 && r.right <= sc.right + 1) };
    });
    ok(`${tag}: gallery fits the screen`, gl.inside, gl);
    await q.screenshot({ path: path.join(SHOTS, `story_12_gallery_${tag}.png`) });
    await q.evaluate(() => document.querySelector('.gcard[data-id=xi]').click()); await q.waitForTimeout(300);
    const sl = await q.evaluate(() => { const sc = document.getElementById('screen').getBoundingClientRect(), r = [...document.querySelectorAll('#spanel, #scap')].map(e => e.getBoundingClientRect()); return r.every(x => x.top >= sc.top - 1 && x.bottom <= sc.bottom + 1); });
    ok(`${tag}: story panel + caption fit`, sl, '');
    await q.screenshot({ path: path.join(SHOTS, `story_13_panel_${tag}.png`) });
    await q.context().close();
  }
}
