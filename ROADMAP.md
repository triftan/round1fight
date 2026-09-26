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
- [ ] More frames: jab and cross wind-up, hit reaction, jump arc.
- [ ] **Impact:** layered hit sounds (light, heavy, blocked, counter), bigger hit sparks,
      slow motion and a zoom on the round-winning KO.
- [ ] **Training mode:** pick any fighter and stage, dummy that stands, crouches, blocks or jumps,
      hitbox overlay, frame data readout (startup, active, recovery, advantage), infinite health and meter.

## Phase 2: Character identity
Each fighter plays like a different game.

- [ ] Unique normals, walk speed, jump arc and game plan per fighter
      (grappler, rushdown, zoner, air fighter and so on).
- [ ] Command grabs, overheads and a unique special for each archetype.
- [ ] A theme song, taunt and voice lines per fighter.
- [ ] Balance pass using AI v AI matches as a check.

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
