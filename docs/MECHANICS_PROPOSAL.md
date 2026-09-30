# Movement and air-combat audit and proposal

Units: logic space 384x216, WORLD 512, GY 192, 60 fps. Line numbers are index.html at the time of audit. Test scripts: scratchpad/mech/d1.js (F.update harness), d2.js (real Playwright keyboard).

## 1. Findings

### Dash exists and works, but is hard to trigger, weak and barely visible
- Code: idle/walk/crouch case (L1627) detects a double tap. It sets `f.tapT` on the first press and dashes if the second press lands `frame - tapT < 13`. `startDash` is at L1787, and the `'dash'` state at L1631. The AI uses `inp.dash`, but humans only get the double-tap path.
- Window is 13 frames (217 ms) from press to press, not release to press. Harness sweep (hold h frames, release g frames, press):
  - hold 2 succeeds up to gap 10.
  - hold 4 succeeds up to gap 8.
  - hold 6 fails at gap 8.
  - A normal keyboard tap (about 5 frames down, 8 to 10 up) is right at the edge.
- Real keyboard (d2.js, headless, `e.repeat` ignored): 60 ms down + 90 ms gap dashes; 90 down + 110 gap does not; 100 + 150 does not. Anyone who taps casually or with a slightly slow rhythm fails. Holding forward never dashes, and there is no run.
- Keyboard auto-repeat is not the problem: `KB[k]` is a boolean and repeats are ignored. The joystick is a problem. `dpSet` (L2686 area) gives a 14% dead zone and one pointer. A "double tap" means lifting the thumb and landing it twice on the right half within 217 ms, or flicking through the dead zone. That is nearly impossible with a thumb, so mobile players effectively cannot dash. There is no dash button.
- Docs: HOW TO PLAY has one line ("DASH / BACK HOP: Tap forward twice / tap back twice"). It is easy to miss, there is nothing in the move lists, and no tutorial or training prompt.
- Feel: the forward dash lasts 14 frames and covers 37 to 68 units (Xing 37, Tramp 42, Sam 52, Zuck 68). That is only 2x walk speed (walk covers 58 units in 30 frames), so it reads as a fast walk. The sprite is walk0-3 with 0.14 rad lean and a hop. Feedback is one dust puff every 4 frames and a whoosh sfx. There are no afterimages and no camera cue.
- Back hop: 16 frames, vx about 4.6, `invul` 7 frames, small hop. The frameOf pose is `crouch`/`stance`. It works but is unremarkable.
- A forward dash cancels into any normal after frame 4 (good), and can jump-cancel.

### Air game: only jump normals, plus Elon's extras
- Jump arc (stage jv 10, g .55, kit multipliers): about 36 frames and 86 units for Sam/Dario/Zuck. Tramp 27 frames / 56 units and Xing 25 / 47 are very short. Elon 52 frames / 141 units (grav .78, jump 1.12) is very high. Air control is only `vx +/- .06` per frame, capped at 3.2.
- Air normals: jlp/jhp/jlk/jhk (L765-768, startup 3-6, active 6-8). They work from frame 1 of the jump (no minimum height). Landing during an attack cancels to idle with 5 frames of land lag.
- Double jump and air dash: only Elon (`dj`, `adash` in KITS). The double jump is 0.82x with `f.t > 4`. The air dash is `→→` in the air, vx 5.6, hovers 14 frames, and can cancel into a j-normal.
- Air specials: impossible for everyone. The `'jump'` case never calls `readMove`, and specials also assume the ground. Air normals start the `'attack'` state, whose special-cancel branch is `!A.air`-only.
- Air block: impossible. `guarding` (L1845) requires `def.onGround`. Jump-ins must be blocked on the ground, and a jumping fighter is a free hit.
- Air-to-air: a hit on an airborne defender always sends them into `'air'` (a launch, `def.airHits++`). Any j-normal therefore knocks down, with no light juggle stun. Juggle limit: `hurt()` returns null after 4 air hits (L1467), and damage scales -10% per combo hit, which is fine. The `'air'` state cannot be recovered from (no tech), and there is no air throw.
- Super jump, jump-cancel and air recovery: none exist.

### Sprites
No run frames exist. `walk0-3` is the only locomotion. Elon's air dash reuses `jump` with a 0.28 rot.

## 2. Proposal

### MUST

**M1. Dash input leniency (about 10 lines)**
- Time the window from release to press. Accept a press within 12 frames of the first tap's release (about 20 frames press-to-press for a fast tap). A player who holds 8 frames still passes.
- Allow the second tap while `state === 'walk'` and during crouch and land-lag (`f.land`), not just idle.
- Implementation: set `f.tapRelT = frame` when `dir` goes 0 while `f.tapDir` is set, and compare `frame - f.tapRelT <= 12`.
- Also add a dedicated dash input path so a key can trigger it: `Shift+dir` or a new key (e.g. `Q`/`E` = forward/back dash, both mapped to `inp.dash`). The AI's `inp.dash` already works.

**M2. Mobile dash**
- Add a DASH button beside the joystick. Tap = forward dash. Tap + hold left = back hop. Also add a joystick flick rule: a rapid dir change (neutral to a strong deflection above 60% travel within 6 frames) counts as a tap.
- If the joystick is not touched, DASH does nothing.

**M3. Make the dash feel like a dash (spec)**
- Forward dash: 16 frames. The speed curve starts at 6.0 and decays to 3.0 (avg about 4.3, about 70 units for a base fighter), scaled by `K.dash`. Compare walk 1.9/frame.
- After frame 4 it can cancel into a normal, a special, or a jump (existing behaviour, keep it). Recovery is 4 frames of 0.5 friction.
- Hold-to-run: if forward is still held at frame 16, continue into a `run` state at speed `walk * 2.1` (about 4/frame). The run has no attack startup penalty, cancels into normals (which then have `lunge`), and stops after 6 frames of friction when released. Zuck runs at 1.3x. Xing and Tramp run at 0.75x.
- Back dash: 18 frames, backwards 46 units at a 4.6 -> 2.0 curve, invulnerable frames 1-8, then 8 frames during which the fighter is airborne-vulnerable to throws only if they land within 4 frames. Any hit during recovery is a counter-hit (bonus damage). Limit: 1 back dash chained after the previous one (cooldown 10 frames) to stop retreat spam.
- Visuals: afterimage trail (draw the previous 3 frames of the sprite at alpha .35/.2/.1, tinted with the fighter colour, every 2 frames), dust on every 3rd frame at the feet, a horizontal speed line streak behind at head height, camera lead (+6 px in dash direction, eased). A short `land` squash on the stop.
- Pose: use the new run frames (4). Until they exist, fall back to walk frames advanced twice as fast with a lean of 0.22.

**M4. Document it**
- HOW TO PLAY rows: "DASH: → → or DASH button", "RUN: →, → and hold", "BACK DASH (invulnerable start): ← ←".
- Add a 3-step training-mode hint bar (DASH, DOUBLE JUMP, AIR SPECIAL), triggered once per browser via localStorage.
- Add dash and air info into the move-list screens (`moveList`).

### SHOULD

**S1. Universal double jump, archetype-limited**
- Everyone gets a double jump. Input: `↑` again in the air after 6 frames (existing `uEdge`).
- Second-jump strength (times the first jump's `vy`):
  - Elon 0.82 (existing).
  - Zuck, Wong, Sam, Dario 0.70.
  - Jensen, Xi 0.62.
  - Tramp, Xing 0.5 (a hop, not a jump).
- Rule: the air-time bonus decreases with heavier fighters, so the height stays visibly lower than Elon's. It does not reset when an air dash or air special is used.
- Air action budget: 1 double jump + 1 air special (or air dash, Elon). `f.dj`/`f.adash` become `f.airActs` counters and reset when landing or being hit.
- Flip sprite: uses new pose `djump` (see section 3), with a spin of 0.35 rad/frame while `vy < 0`.

**S2. Air specials (per fighter, one per kit, `air: 1` flag in MOVES + `M.air(F,f)` gate)**
Allow `readMove` and `startSpecial` from `'jump'`/`'adash'`, only for moves flagged `air`. Air special can be triggered at any time after frame 6 of the jump and never on the way up with 0 vertical speed; landing during startup cancels it with 8 frames of land lag; landing during active/recovery cancels to 6 frames of land lag. Air moves cost 10% less damage and gain no meter beyond normal hit gain.
- Elon: STARSHIP RUD dive is his super. Air S1 = HOLO (clone), S2 grok = ground only. Add air S4 "Optimus punch dive": 45-degree downward dive. Startup 8, vx 3.5, vy 5, 8 dmg, lands into 12 frames of recovery on hit or whiff.
- Sam: HYPE SHIP (S1) in the air fires down and forward at 30 degrees (vx 3.4, vy 1.6). Startup 9, recovery 10 (5 in the air after firing, then fall). Air HURRICANE KICK (S3): 3 hits, 35 frames of active, falls at 1.2 vy while spinning, ends with land lag 10.
- Jensen: GPU CHIPS (S1) fires 2 chips at 40 degrees downwards. Startup 9, one per air time. Zoner identity: the air chip covers the space in front of Jensen's landing.
- Wong: TWEET CANNON air version fires a 3-shot burst (not hold) at a slight downward angle. Startup 6, 3 shots at 5-frame spacing, recovery 8.
- Zuck: WI-FI'S DOWN (S1) works in the air like Sam's ship but slower (vx 3.0). No other moves.
- Xi: GREAT FIREWALL (S1) airborne places a wall in front instead of a projectile (lands as a shield for 40 frames).
- Dario: CLAWD SUMMON (S1) drops the clawd from above, 3 dmg per hit. Others none.
- Tramp: none. Air normals only. Balance note: Tramp is a Grappler, so his answer to air play is the anti-air command grab (`fired` beats jumpers with a `can` gate: works on airborne targets within 40 units) and his short jump.
- Xing: DOG (S1) works in the air (`ranged('dog')`), no other moves. His jump is low, so it is a poke.
- All air specials use the same input as on the ground (`↓↘→ + P`, etc.), and `inp.sp` assist works too.

**S3. Air blocking**
- Recommend a MvC-style air block: hold back or block in the air (`inp.b` or `holdBack`) puts the fighter in `'ablock'` (same as `jump` with a `guard` flag). It blocks projectiles and non-throw attacks, gives 8 frames of blockstun with a small pushback, and cannot be used within 8 frames of leaving the ground. Air block costs meter-free chip (25%). Ground fighters can still low-hit a jumper.
- If you want the SF feel, restrict air block to Elon plus a bar tap. My recommendation is universal: it fixes "jumping is a free hit" and enables air-to-air play.

**S4. Air-to-air hit behaviour**
- Light air hits (jlp/jlk) on an airborne defender: `hit` juggle stun (not a knockdown). The defender stays in the air with `vy = -2` and `stun 12` (they cannot act), so the attacker follows up with an air special or a landing. Heavy air hits (jhp/jhk): the hard knockdown (`state 'air'`, vy -4) as at present.
- Add an air recovery (tech): while in `'air'` with `airHits > 0` and `f.t > 20`, holding any direction plus a button = a recovery roll (invulnerable for 8 frames) that costs nothing. This limits infinite combos and follows MvC/SF6.
- Keep the 4 air-hit cap and the -10% damage scaling.
- Air throw: LP+LK while both are airborne within 26 units: throw damage 10, ends in a knockdown. Ground throws still lose to jumps.

**S5. Landing rules**
- Land lag stays 5 frames after a plain jump. After an air normal that has not hit, 4 extra frames (the fall) and the j-normal cancel at landing (existing behaviour). After an air special, 6 to 10 frames depending on the move, as above.
- Add a jump squat of 3 frames before take-off (the fighter is throwable and grounded but can attack out of it), so jump-ins are fair. Without it, a `↑` on frame 1 is instant. Optional (nice-to-have).

### NICE

- Super jump: `↓` then `↑` within 10 frames = a higher jump (`vy * 1.25`, +50% airtime) with a 4-frame prejump. Costs nothing. Good for Elon only if capped (he already has 141 units).
- Jump-cancel: on hit of a heavy normal (or launcher `chp`), `↑` cancels into a jump in the first 6 frames of recovery, then an air normal. Gives SF6/MvC-style launcher combos. The 4-hit juggle cap still applies.
- Input buffer: raise `f.buf` from 7 to 10 frames for normals, and give 12 for specials (`hist` window is 22 for motions, fine). Add 2-frame leniency for the diagonal in the quarter-circle (allow `↓ →`).
- Pushblock: block + two attack buttons in blockstun spends 25 meter to push the attacker back by 40 units (SF6 Drive Parry-lite, MvC advancing guard).
- Wall bounce: keep the existing `vx*side > 2.5` rebound (0.45). Add a wall-cling double jump for Elon only (nice, not needed).
- Drive-rush style cancel: from a hit or blocked special, a dash cancel (`→→` during `f.t > 6` of a hit-confirmed special) costs 50 meter. Keep only if S-tier balance allows.

## 3. Art needed

Per fighter, generated with the existing Recraft prompt template (same character, side view, white/transparent background, 2:1 sheet of 4 poses). Elon's `win0-3` stays.

Sheet A, "run" (all 9 fighters): 4 frames run0-run3.
- run0: contact pose, front foot planted, torso leaning forward about 15 degrees, back arm forward.
- run1: pass pose, back leg drives up, both feet near the ground, arms swing opposite.
- run2: high point, both feet off the ground, knee up, fists at the chest.
- run3: opposite contact, mirror of run0 with the other leg forward.
Keep the lean at 15 to 20 degrees and use the run cycle at 4 frames per pose (16-frame loop) at 60 fps.

Sheet B, "air" (all 9 fighters): 4 frames.
- djump: mid-air tuck / somersault, knees to the chest, one pose (rotate in code for spin).
- aspecial: air cast pose, one arm thrust down-forward at 45 degrees, the other back, legs trailing.
- adive: diagonal dive, body straight at a 45-degree angle, fists or feet first (used for Elon's Optimus dive and Sam's air hurricane start).
- ablock: air guard, both arms crossed in front, knees tucked.

Optional sheet C (later): air hit reaction (`hit2` exists), backdash pose (`bdash`, low crouching lean back) and a super jump prep.

Estimated count: run = 9 sheets of 4 poses (36 poses); air = 9 sheets (36 poses). Total 18 sheets, or 36 credits at 2 credits per sheet. If you count 2 credits per pose, that is 144. Minimum viable: sheet A only (9 sheets), because the air moves can reuse `jump`/`jkick`/`jpunch` with rotation in code.

## 4. Implementation plan (independent chunks)

1. **Dash input and docs (M1, M2, M4).** Files: stepF idle case, KEYMAP, mobile button HTML, HOW TO PLAY. Tests: extend d1.js sweep so that hold 8 + gap 8 dashes; keyboard test d2.js with 90/110 passes; `dash` key path; check the touch button via `TOUCH.dash`. No dependency.
2. **Dash feel (M3), independent of art.** Speed curve, run state, back dash frames, afterimage renderer (`drawFighter` ghost ring buffer), camera lead. Tests: dash distance per fighter table, `state` reaches `run` on held forward, invulnerable frames 1-8 on back dash, no error over 300 random frames.
3. **Run frames.** After art: add `run0-3` to ASSETS, `frameOf` uses them in `dash` and `run`. Fallback to walk until they are in.
4. **Double jump for all (S1).** KITS `dj` becomes a number (second-jump factor), `f.dj` becomes an `airActs` counter, flip pose. Tests: each fighter's second jump peak against the table, Tramp/Xing hop, no third jump, reset on land and on being hit.
5. **Air specials (S2).** Add `air` flag and `M.airUpd` per move, allow `readMove` from jump/adash states, land-cancel rules, AI hook (`ai()` picks air moves at 10% by level). Tests: for each of the 9 fighters, jump, input the motion, expect `state === 'special'` and `f.mv` set. Land during startup cancels to `idle`. No projectile spawns below GY.
6. **Air block, air tech and air throw (S3, S4).** `guarding` gets an airborne branch, light-hit juggle, tech roll. Tests: a jumping dummy with `b` blocks a projectile (state `ablock`), a jhp knocks down, a jlp juggle allows a second hit and stops at 4.
7. **Nice items (jump-cancel, super jump, buffer, pushblock).** Each is an independent flag behind a constant so it can be tuned or reverted.

Balance suggestion: land chunks 1 to 3 first (they answer the owner's two biggest complaints), then 4 and 5 together, and check win rate against the training-mode CPU at each level with the `tai.js` harness before enabling air block for everyone.
