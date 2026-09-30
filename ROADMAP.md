# Round 1 Fight roadmap

Pushing to `main` deploys the live site on Vercel automatically.

The plan for taking the game from a fun web toy to a fighter people come back to.
We build it in order, one phase at a time, and tick items off as they ship.

The loop we are building toward: a fair loss, a clear sense of what went wrong, an instant
rematch and a small reward, wrapped in a daily reason to open the game and a moment worth sharing.

## Phase 1: Feel
How the game feels in your hands. Everything else sits on top of this.

- [x] **In-between animation frames:** 4-frame walk cycle, uppercut wind-up, rise and peak,
      roundhouse chamber. (Elon's walk and the mech's new frames came out off-model and are skipped.)
- [x] More frames: punch wind-up and follow-through, hit reaction, jump rise.
- [x] **Impact:** CC0 hit sounds (light, heavy, blocked, counter), bigger hit sparks, counter hits,
      slow motion and a zoom on the round-winning KO.
- [x] **Music:** free-licensed arcade tracks for title, each world, victory and KO.
- [x] **Training mode:** pick any fighter and stage, dummy that stands, crouches, blocks or jumps,
      hitbox overlay, frame data readout (startup, active, recovery, advantage), infinite health and meter.

## Phase 2: Character identity
Each fighter plays like a different game.

- [x] Unique walk speed, jump arc, dash, hurtbox and game plan per fighter
      (grappler, rushdown, zoner, air fighter and so on), five moves and a super each (`docs/PHASE2_SPEC.md`),
      and an AI that plays each kit. Normals still share one table (Jensen's are shorter, Xi's and the mech's
      heavy punch have armor).
- [x] Command grabs, throws, overheads, super armor, counter stances, status effects and summons.
- [ ] A theme song, taunt and voice lines per fighter. (Taunts done: HP + HK, custom ones for Tramp,
      Jensen and Wong. Voice lines done: six stock-TTS lines per fighter plus the announcer, see
      audio/CREDITS.md. Songs still to do.)
- [x] Balance pass using AI v AI matches as a check. (First pass: 37-61% match win rate at equal AI level,
      target 40-60%. Second pass: all 9 fighters land in 44-58% match win rate at AI level 0.6, no
      matchup worse than 25/75, and every fighter stays within 35-65% at AI levels 0.3 and 0.9 too.)

## Phase 3: Story
- [ ] Arcade mode framed as the AGI Summit Tournament.
- [ ] A rival fight per character with pre-fight banter.
- [ ] Comic-panel endings for every fighter.

## Phase 4: Reasons to come back
- [ ] Daily challenge with a fixed seed, special rules and its own leaderboard.
- [ ] Unlockable alternate costumes and colour palettes.
- [ ] Win streaks and ranks: Intern, Founder, Unicorn, Trillionaire.

## Phase 5: Spread
- [ ] Auto-record fatalities and perfect rounds as short clips, one tap to share.
- [ ] Topical new fighters as the news cycle moves.

## Phase 6: Online multiplayer and accounts
The finale: play real people and keep your own record.

- [ ] **Local versus:** two players on one keyboard, or two gamepads.
- [ ] **Accounts:** sign in with Google or email (Supabase Auth). Guests can still play.
- [ ] **Your game data:** a profile page with match history, win rate per fighter and per stage,
      best scores, fatalities landed, current streak and rank. Guest progress carries over on sign-up.
- [ ] **Matchmaking:** quick match against someone near your rank, plus private rooms with a
      shareable invite link to fight a friend.
- [ ] **Netcode:** peer-to-peer over WebRTC with rollback, so online fights feel like local ones.
- [ ] **Ranked seasons** and a global leaderboard tied to accounts.
- [ ] **Replays** of your recent online matches.

## Notes
- Parodies of real people are fine for a free web game. Get legal advice on right of
  publicity before selling it.
