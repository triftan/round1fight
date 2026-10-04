# Phase 4 spec: reasons to come back

Started 2026-10-04. Everything is local (localStorage) until Phase 6 adds accounts; data shapes are
versioned so they can be uploaded later. Satire rules from Phase 2 still apply.

## 1. Daily challenge
- Title screen button **DAILY**. One challenge per UTC day, same for every player: the seed is the date
  (`YYYY-MM-DD`), fed to a seeded RNG used for everything the challenge picks.
- The seed picks: your fighter (or "any"), 3 opponents in a row, their stages, and **one modifier**:
  - BIG HEAD MODE, LOW GRAVITY (floatier jumps), TARIFF TAX (every hit you land costs 1% of your score),
    GLASS CANNON (everyone deals and takes double), SPECIALS ONLY (normals do 25% damage), HYPER SPEED (1.25x
    game speed), NO BLOCK, RATE LIMITED (specials have a 3 s cooldown), MIRROR MATCH (all opponents are your
    fighter), POWER SURGE (meter starts full and fills twice as fast).
- One run counts per day (retries allowed, best score is kept). Score = normal arcade scoring plus a time bonus.
- Results screen shows today's best, a streak of days played, and a share line ("Round 1 Fight daily 10/04:
  3/3 wins, 48,210 pts, TARIFF TAX") copied to the clipboard.
- Leaderboard: a separate "DAILY" tab on the existing board, keyed by date (local now, global in Phase 6;
  if the existing remote board supports extra keys, use it).

## 2. Costumes and palettes
- Each fighter gets **4 palettes**: default plus 3 recolours (done in code by hue-shifting the sprite
  frames once on load into cached canvases, no new art). Names are jokes per fighter (Tramp "Spray Tan Gold",
  Zuck "Sweet Baby Ray's", Jensen "Leather 2.0"...).
- Unlocks: palette 2 by winning 3 matches with the fighter, palette 3 by clearing arcade with them,
  palette 4 by clearing the daily with them (or a 7-day daily streak).
- Select screen: press up/down (or tap the swatch row under the card) to cycle unlocked palettes; locked ones
  show a padlock and the unlock condition. Mirror matches force the opponent onto a different palette.

## 3. Win streaks and ranks
- Track per player: total wins, current and best win streak (any mode except training), wins per fighter.
- Ranks by rank points (win +10, perfect +5, fatality +5, daily clear +20, loss -3, floor 0):
  **Intern** 0, **Founder** 100, **Series A** 300, **Unicorn** 700, **Decacorn** 1500, **Trillionaire** 3000.
- Rank badge on the title screen and result screen; a rank-up banner with a voice sting.
- A small **PROFILE** screen (title button) showing rank, points to next rank, streaks, wins per fighter,
  palettes unlocked, daily streak. Data stored under one versioned key so Phase 6 can sync it.

## Checks
New tests/tdaily.js, tcos.js, trank.js; all existing suites stay green; phone layouts at 390x844 and 844x390.
