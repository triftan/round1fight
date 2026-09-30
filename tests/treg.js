// Regression tests for the Phase 2 review findings (#1 gust softlock, #2 winner KO in finish, #4 hijack in hitstop,
// #5 Wong second taunt, #6 taunt armor, #7 neutral SP, #8 post-KO hits / self-hit credit, #9 jam carry-over)
const { chromium } = require('playwright');
const URL = process.env.R1F_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto(URL); await p.waitForTimeout(1500);
  const res = await p.evaluate(() => {
    const { G, ROSTER, STAGES, Fight } = __R1F, out = [];
    const ok = (name, cond, info) => out.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + info));
    const ID = id => ROSTER.findIndex(d => d.id === id);
    const mk = (a, bId, d = 60, dummy = true) => {
      const F = new Fight(ROSTER[ID(a)], ROSTER[ID(bId)], STAGES[1], { c1: 'human', c2: 'ai', lvl2: 0 });
      G.fight = F; G.state = 'result';
      for (let k = 0; k < 400 && F.phase !== 'play'; k++) F.update({});
      F.p[0].x = 200; F.p[1].x = 200 + d; F.p[0].facing = 1; F.p[1].facing = -1;
      for (const f of F.p) { f.state = 'idle'; f.vx = 0; }
      if (dummy) { F.p[1].ctrl = 'dummy'; G.trainMode = 'stand'; }
      return F;
    };
    const idle = (F, n, inp = {}) => { for (let k = 0; k < n; k++) F.update(inp); };
    // match-point KO so the loser ends up dizzy in the finish phase
    const toFinish = (a, bId, d) => {
      const F = mk(a, bId, d, false); F.wins[0] = 1; F.p[1].ai = null; F.p[1].hp = 1;
      F.applyHit(F.p[0], F.p[1], { dmg: 50, kb: 2, launch: 1 }, 1);
      let k = 0; while (F.p[1].state !== 'dizzy' && k++ < 600) F.update({});
      return F;
    };
    // 1. Tramp's hair gust in FINISH HIM never breaks the dizzy state; the round still ends
    {
      const F = toFinish('tramp', 'sam', 200); F.p[0].x = F.p[1].x - 150; F.p[0].meter = 100; F.p[0].state = 'idle';
      F.update({ sp: 1 }); let bad = 0; for (let k = 0; k < 70; k++) { F.update({}); if (F.phase === 'finish' && F.p[1].state !== 'dizzy') bad++; }
      ok('1 gust keeps loser dizzy', F.p[0].mv === 'hair' && bad === 0, 'mv ' + F.p[0].mv + ' bad frames ' + bad);
      idle(F, 2000); ok('1 finish phase ends', F.phase === 'end', F.phase + ' ' + F.p[1].state);
    }
    // 1b. any outside write to the loser's state is undone
    {
      const F = toFinish('tramp', 'sam', 200); F.p[1].state = 'hit'; F.p[1].stun = 30; idle(F, 2);
      ok('1b stray hit state restored to dizzy', F.p[1].state === 'dizzy', F.p[1].state);
    }
    // 2. Cybercab (hits its owner) in FINISH HIM cannot KO the winner
    {
      const F = toFinish('mask', 'sam', 200); F.p[0].hp = 3; F.p[0].state = 'idle'; F.p[0].x = F.p[1].x - 200; F.p[0].facing = 1;
      F.update({ d: 1 }); F.update({ d: 1, l: 1 }); F.update({ l: 1, lk: 1 }); const mv = F.p[0].mv;
      idle(F, 400);
      ok('2 cybercab cast', mv === 'cybercab', mv);
      ok('2 winner not KOd in finish', F.p[0].hp >= 1 && F.p[0].state !== 'down', 'hp ' + F.p[0].hp + ' ' + F.p[0].state);
      ok('2 direct hit on winner ignored in finish', (() => { const G2 = toFinish('mask', 'sam', 100); G2.p[0].hp = 3; const r = G2.applyHit(G2.p[1], G2.p[0], { dmg: 40, kb: 1 }, -1); return r === 'none' && G2.p[0].hp === 3; })(), '');
    }
    // 2b. Cybercab while the loser is knocked down (the reviewer's r3 case)
    {
      const F = mk('mask', 'sam', 120, false); F.wins[0] = 1; F.p[1].hp = 1; F.applyHit(F.p[0], F.p[1], { dmg: 50, kb: 1, launch: 1 }, 1);
      let k = 0; while (F.p[1].state !== 'down' && k++ < 400) F.update({});
      F.p[0].hp = 3; F.p[0].state = 'idle'; F.update({ move: { slot: 'S3', heavy: 0 } }); idle(F, 750);
      ok('2b winner keeps HP after cybercab in finish', F.p[0].hp >= 1 && F.p[0].state !== 'down', F.phase + ' hp ' + F.p[0].hp + ' ' + F.p[0].state);
    }
    // 4. prompt injection swaps buttons during hitstop as well as outside it
    {
      const F = mk('sam', 'xing', 34); F.p[0].hijack = 999;
      F.hitstop = 5; F.update({ lp: 1 }); idle(F, 5);
      const G2 = mk('sam', 'xing', 34); G2.p[0].hijack = 999; G2.update({ lp: 1 }); idle(G2, 1);
      ok('4 hijack applies in hitstop', F.p[0].atkName === 'slk' && G2.p[0].atkName === 'slk', F.p[0].atkName + ' vs ' + G2.p[0].atkName);
    }
    // 5. Wong's second taunt: plain taunt, no heavy punch left running
    {
      const F = mk('wong', 'xing', 150); idle(F, 1, { hp: 1, hk: 1 }); idle(F, 70);
      ok('5 first taunt gave sport', F.p[0].sport === 1, F.p[0].sport);
      F.update({ hp: 1 }); F.update({ hk: 1 });
      ok('5 second taunt does not leave a heavy punch running', F.p[0].state !== 'attack' && F.p[0].state !== 'special', F.p[0].state + ' ' + F.p[0].mv + ' ' + F.p[0].atkName);
    }
    // 6. taunting out of a heavy punch drops Xi's armor
    {
      const F = mk('xi', 'sam', 150); F.update({ hp: 1 }); F.update({ hk: 1 });
      ok('6 taunt clears armor', F.p[0].state === 'special' && !(F.p[0].armorN > 0 && F.p[0].armorT > 0), F.p[0].state + ' ' + F.p[0].armorN + '/' + F.p[0].armorT);
    }
    // 7. neutral SP with a full bar: super if it can fire, otherwise S1; never super in training
    {
      const F = mk('xing', 'sam', 150); F.p[0].meter = 100; F.update({ sp: 1 }); idle(F, 3);
      ok('7 Xing SP (IPO gated) falls back to S1', F.p[0].state === 'special' && F.p[0].mv !== 'ipo' && F.p[0].meter === 100, F.p[0].state + ' ' + F.p[0].mv + ' m' + F.p[0].meter);
      const H = mk('sam', 'xing', 150); H.p[0].meter = 100; H.update({ sp: 1 }); idle(H, 3);
      ok('7 neutral SP with full bar = super', H.p[0].superOn === true && H.p[0].meter === 0, H.p[0].mv + ' ' + H.p[0].meter);
      const T = mk('sam', 'xing', 150); T.training = true; T.p[0].meter = 100; T.update({ sp: 1 }); idle(T, 3);
      ok('7 training neutral SP = S1', T.p[0].state === 'special' && !T.p[0].superOn, T.p[0].mv + ' super ' + T.p[0].superOn);
    }
    // 8. no hits after the KO; self-hits give the opponent nothing
    {
      const F = mk('sam', 'xing', 40); F.p[1].hp = 1; F.applyHit(F.p[0], F.p[1], { dmg: 50, kb: 2, launch: 1 }, 1);
      const ph = F.phase, hp0 = F.p[0].hp, m0 = F.p[1].meter; F.applyHit(F.p[1], F.p[0], { dmg: 20, kb: 2 }, -1);
      ok('8 no hit after KO', ph !== 'play' && F.p[0].hp === hp0 && F.p[1].meter === m0, ph + ' hp ' + F.p[0].hp);
      const S = mk('mask', 'sam', 40); const m = S.p[1].meter, hp = S.p[0].hp;
      const r = S.applyHit(S.p[1], S.p[0], { dmg: 10, kb: 1, owner: S.p[0], launch: 1 }, 1);
      ok('8 self-hit credits nobody', r === 'hit' && S.p[0].hp < hp && S.p[1].meter === m && S.p[1].combo === 0, r + ' meter ' + S.p[1].meter + ' combo ' + S.p[1].combo);
    }
    // 9. Tweet Cannon jam survives into the next round
    {
      const F = mk('wong', 'xing', 150); F.p[0].jam = 200; F.startRound();
      ok('9 jam carried across rounds', F.p[0].jam === 200, F.p[0].jam);
    }
    return out;
  });
  console.log(res.join('\n')); console.log(errs.join('\n'));
  const fails = res.filter(r => r.startsWith('FAIL')).length + errs.length;
  console.log(fails ? 'TREG FAILED ' + fails : 'TREG OK ' + res.length);
  await b.close(); process.exit(fails ? 1 : 0);
})();
