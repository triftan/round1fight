# Round 1 Fight: Tech Titans Kombat

A retro 16-bit style fighting game in a single HTML file with no build step. Sprites and worlds are AI-generated pixel art embedded in the file; music and the announcer are synthesized in code, and hit sound effects are real CC0 samples with a synthesized fallback.

Open `index.html` in any modern browser (desktop or phone) and play.

## The roster

| Fighter | Archetype | POW | SPD | TEC | Fatality |
|---|---|---|---|---|---|
| Donald Tramp | Grappler | 8 | 4 | 5 | You're Fired! |
| Elon Mask | Air fighter | 6 | 7 | 6 | Next Stop: Mars |
| Xi Jinpong | Fortress | 7 | 5 | 8 | Censored |
| Dario Amodayo | Defensive counter | 5.6 | 6 | 9 | Aligned into Paperclips |
| Sam Altmode | All-rounder (easiest) | 5 | 8 | 7 | Model Deprecated |
| Jensen Hwang | Zoner | 6.3 | 5 | 7 | Out of Memory |
| Mark Zuckerbot | Rushdown / BJJ | 6 | 7 | 6 | Welcome to the Metaverse |
| Alexandr Wong | Trapper | 4.2 | 9 | 7 | Labeled: Loser |
| Wang Xing-Mech | Armored heavy | 8 | 3 | 5 | Unitree-mendous |

Power scales damage and knockback, speed scales walk speed, tech shortens recovery. On top of that every fighter has
their own walk and back-walk speed, jump height and arc, dash speed, hurtbox width and weight (`KITS` in `index.html`).

### Move lists

Everyone uses the same input slots (see Controls) and each fighter maps them to their own moves. The select screen
and the pause menu show the current fighter's list.

- **Donald Tramp** (grappler: slow, heavy, low jump). S1 *Liberation Day Boomerang*: a tariff decree that flies back
  if it hits nothing and can hit Tramp himself. S2 *Ceasefire? OVER!*: a shove that breaks guard. S3 *Flyover Flinch*:
  invulnerable panic step back. Grab *You're Fired* (← ↙ ↓ ↘ → + P or → + SP). Super *Make Hair Great Again*: a gust
  pushes the opponent full screen, then a red cap flies out. Taunt *FIGHT! FIGHT! FIGHT!* (a little power).
- **Elon Mask** (air fighter: floaty jump, the highest double jump, air dash with → → in the air, two air actions per jump). S1 *Nothing In This Clip Is
  Real*: a hologram fakes an attack. S2 *Multi-Agent Grok*: three bots orbit him, then dive in turn. S3 *Cybercab
  Malfunction*: a self-driving car crosses the screen and hits anyone, Elon included. S4 *Optimus Vaporware Punch*:
  slow and heavy, one time in five it glitches and does nothing. Super *Starship RUD*: 50% huge explosion, 50% dud.
- **Xi Jinpong** (fortress: slow, takes less damage, heavy punch has super armor). S1 *Great Firewall*. S2
  *Unflinching Stance*: hold punch up to 1.5 s for half damage and no hitstun. S3 *Rare Earths Leverage*: on hit the
  opponent is LOCKED (no specials) for 3 s. S4 *Panda Diplomacy*: if the panda reaches them, the crowd cheers and
  the next hit they take can't be blocked. Super *Victory Day Parade*: a row of mini tanks, multi-hit chip.
- **Dario Amodayo** (defensive counter). Passive *Constitutional Classifier*: immune to prompt injection and bounces
  it back. S1 *Clawd Summon*: a crab eats one projectile, then pinches low. S2 *Alligator Ex Machina*: counter stance,
  an alligator launches the attacker. S3 *Agent Teams*: if the first hit lands, four more follow on their own. S4
  *Pace the Frontier*: a slow lecture (light 2/3 s, heavy 1 s), then a mega hit. Super *UN Security Council Lecture*:
  a speech-bubble wave that stuns.
- **Sam Altmode** (all-rounder). S1 *Hype Ship*: every combo hit adds a ship to the next volley, up to 6. S2 rising
  uppercut. S3 hurricane kick. S4 *Deepfake Decoy*: a fake Sam stays behind while the real one teleports behind the
  opponent. Super *Stargate Beam*: a full-screen beam that also costs him a slice of health (the compute bill).
- **Jensen Hwang** (zoner: slow walk, short normals). S1 GPU chips. S2 *China Export Yo-Yo*: a hand from above may yank
  the GPU back mid-flight before it comes back at you. S3 *$960K Jacket Slam*: armored charge. S4 *GTC Keynote*: +20%
  damage for 5 s. Super *$5 Trillion Uppercut*: damage grows with the cash counter. Taunt *Jacket Swap*: takes 5
  power from the opponent.
- **Mark Zuckerbot** (rushdown / BJJ: fastest walk and dash). Passive *Slowdown? Never.*: immune to slow. S1 *Wi-Fi's
  Down*: a glasses laser that fails the first time each match. S2 *Muse Coach*: next 3 hits +25%. S3 *Nine-Figure Guard
  Pull*: a sliding low grab that beats crouch-blocking, then a submission. Super *Metaverse Legs*: legs gone, a
  floating multi-hit rush.
- **Alexandr Wong** (trapper: fast and light). S1 *Tweet Cannon*: hold punch to keep posting. A posts counter floats
  over his head all match; every 10th tweet is a rival jab (double damage to Sam, Dario and Elon, plus a short slow);
  at 300 posts the cannon is RATE LIMITED for 5 s. S2 *Inexperienced Counter*: counter stance that gets stronger each
  round. S4 *Ignore All Previous Instructions* (← + SP): PROMPT INJECTED swaps the opponent's left/right and
  punches/kicks for a bit over a second. Grab *49% Stake Grab* (← ↙ ↓ ↘ → + P or → + SP): steals 49% of their power bar. Super
  *Superintelligence Co-Lead*: a partner silhouette runs in for a combo. Taunt *Crocs Sport Mode*: +15% walk and dash
  speed for the rest of the round, once per round.
- **Wang Xing-Mech** (armored heavy: slowest, biggest, heavy punch has super armor). S1 Robot Dog. S2 *Drunken Fist
  Protocol*: a wobbly 4-hit string with random timing. S3 *Cluster Formation*: three mini robots strike in sync. S4
  *Nunchaku Encore*: an overhead (block it standing). Super *IPO Pop +460%*: only under 40% health, damage grows
  with the damage he took this round.

Status effects show as labels over the fighter's head: PROMPT INJECTED (controls swapped, the CPU mashes at
random), LOCKED (no specials or super), GUARD DOWN (next hit can't be blocked) and SLOW.

## Arcade mode

Pick a fighter, then beat 5 random challengers across 5 worlds. Each match is best of 3 rounds (60 second timer).

1. **Venice Beach** (easy)
2. **Silicon Valley HQ** (medium)
3. **Shenzhen Night Market** (hard)
4. **Hyperscale Data Center** (very hard, slippery floor)
5. **Mars Colony One** (insane, low gravity)

When you win the deciding round your opponent stands dazed: **FINISH HIM!** Walk up close and press SPECIAL for a fatality (+10,000 × world).

## Tutorial

New to fighting games? Pick TRAINING from the title screen, choose your fighter, then press **TUTORIAL**. A banner walks you through 15 short lessons on a practice dummy: walking, jumping, crouching, the four normals, blocking high, low and overhead attacks, throws, your fighter's own specials (with their real names and motions), chains, cancels, the super, one lesson on your fighter's unique trick (Tramp's YOU'RE FIRED grab, Wong's prompt injection and Crocs taunt, Xi's Unflinching Stance, Dario's counter stance, Xing's IPO Pop, Elon's double jump and air dash, Zuck's guard pull, Jensen's jacket slam, Sam's Hype Ship stacking) and a final exam against the CPU.

- The banner shows the inputs for your device: keys on a keyboard, joystick and on-screen buttons on a phone.
- Lessons finish when the game sees you do the thing (a real block, a real special, a real combo), not on a timer, and "NICE!" tells you so.
- **SKIP** (Tab, or the button) jumps ahead, **LESSONS** opens the picker, **EXIT** leaves. Completed lessons get a ✓ and are remembered in your browser.
- FREE PRACTICE (below) is the old training mode.
- For developers: `LESSONS` and `UNIQ` in `index.html` are plain data (`id`, `title`, `text`, `textTouch`, `dummy`, `check(F, ev, st)`). Lessons listen to game events (`hit`, `block`, `special`, ...) raised through `Fight.onEvent(fighter, name, data)`; commented stubs mark where the dash, run, double jump, air special, air block, air throw and air tech lessons go.

## Training Mode (free practice)

Pick TRAINING from the title screen, choose your fighter, press FREE PRACTICE, then choose a dummy and a stage. There's no round timer, no KOs (the dummy's HP refills a second after your last hit and never drops below 1), and your power bar is always full. Cycle the dummy's behavior (STAND / CROUCH / BLOCK / CROUCH BLOCK / JUMP / CPU) and toggle a hitbox overlay, and check the HUD for the frame data and frame advantage of your last move plus a combo/damage counter. Pause and choose EXIT TRAINING to return to the title screen.

## Controls

Street Fighter style: four attack buttons, motion-input specials, and hold back to block.

| Action | Keyboard | Mobile |
|---|---|---|
| Move / jump / crouch | A D W S or arrows | Joystick |
| Light / heavy punch | U / I (or Z / X) | LP / HP |
| Light / heavy kick | J / K (or C / V) | LK / HK |
| Block | Hold back (away from opponent) or Space | Hold back on the joystick |
| Uppercut (normal) | Crouch + heavy punch | ↓ + HP |
| Sweep | Crouch + heavy kick | ↓ + HK |
| Special S1 | ↓ ↘ → + punch, or L | SP |
| Special S2 | → ↓ ↘ + punch, or ↓ + L | ↓ + SP |
| Special S3 | ↓ ↙ ← + kick, or ← + L | ← + SP |
| Special S4 | ↓ ↙ ← + punch, or → + L | → + SP |
| Command grab (Tramp, Wong) | ← ↙ ↓ ↘ → + punch, or → + L | → + SP |
| Super (full power bar) | ↓ ↘ → ↓ ↘ → + punch, or L | SP when the bar is full |
| Throw (up close) | → or ← + LP + LK | → or ← + LP + LK |
| Taunt | HP + HK together | HP + HK |
| Dash, then hold to run | Tap → → (press to press within ~0.3 s), or E | Flick the joystick sideways (or double-tap it), keep holding to run |
| Back dash (invulnerable start) | Tap ← ←, or ← + E | Flick the joystick back |
| Double jump / super jump | ↑ again in the air / ↓ then ↑ | Same on the joystick |
| Air special | The special's motion in the air | ← → etc. + SP in the air |
| Air block | Hold back in the air | Hold back in the air |
| Air throw | LP + LK next to an airborne opponent | LP + LK |
| Air tech (flip out of a knockdown) | Any attack button while knocked into the air | Any attack button |
| Jump cancel | ↑ right after a heavy normal hits | ↑ |
| Pause / sound / FPS | Esc / M / F | II button |
| *Training:* cycle dummy behavior | T | MODE button |
| *Training:* reset positions | R | RESET button |
| *Training:* toggle hitbox overlay | H | HITBOX button |

Crouch-block to stop low attacks (crouching light kick, sweep) and stand-block to stop jump-ins and overheads. Heavy versions of specials hit harder and travel further. Only one of each of your projectiles can be on screen at a time.

**Movement and air combat:** the forward dash can cancel into any normal, special or jump after 4 frames; hold forward
at its end to run at about twice walk speed. The back dash is invulnerable for its first 8 frames, but a hit during its
recovery is a counter hit. Everyone double jumps once per jump (Tramp and the mech only hop, Elon goes highest). Air
specials: Elon *Optimus Dive* (↓ ↙ ← + P, a diagonal dive kick), Sam *Hype Ship* and *Hurricane Kick*, Jensen *GPU
Chips*, Wong *Tweet Cannon* (a 3-shot burst), Zuck *Wi-Fi's Down*, Xi *Great Firewall* (drops a barrier), Dario *Clawd
Drop*, the mech *Robot Dog*. Tramp has none: he answers jumpers with his short hop and anti-airs. Landing during an air
special costs a few frames of recovery. Air block (hold back from 8 frames into a jump) stops everything except throws,
unblockables and the crouching heavy punch anti-air, and takes a little more chip than a ground block. Light air normals
put an airborne opponent in a short juggle stun, heavy ones knock down (the 4th air hit always knocks down), and a
knocked-down fighter can press any button in mid-air to tech out (not off throws, not right after the hit).

**Throws and grabs** can't be blocked, but they only reach up close, miss anyone in the air and lose to an attack that's already hitting. **Super armor** (Xi's and the mech's heavy punch, Jensen's jacket slam) takes the damage of one hit without flinching. **Counter stances** (Dario's alligator, Wong's counter) cancel a hit and answer it.

**Combos:** when a light attack connects, you can chain straight into any other attack, and every ground hit can cancel into a special (for example crouch jab, then ↓ ↘ → + punch). Inputs typed during the hit-freeze still count.

**Power bar:** fills only when you land hits or take them (a little on blocks too), and carries over between rounds. A full bar unlocks your fighter's super.

## Scoring

Damage × 10, combo bonuses, round win bonus (health + time left), flawless +3,000, fatality +10,000. Everything is multiplied by the world number.

A **CREDITS** button on the title screen plays rolling arcade credits (hold or tap to speed up, Esc to exit); the list lives in the `CREDITS` array in `index.html`.

## Leaderboard

`index.html` picks the best storage it can reach:

1. **Claude artifact database**: when the page runs as a claude.ai artifact with the `db` capability, scores go to a shared cloud collection.
2. **Supabase**: fill in `SUPABASE.url` and `SUPABASE.key` (publishable/anon key) at the top of the script to use a public table anywhere the file is hosted (GitHub Pages, Netlify, etc). Create the table with:

   ```sql
   create table public.scores (
     id bigint generated always as identity primary key,
     name text not null check (char_length(name) between 1 and 10),
     score integer not null check (score >= 0 and score < 10000000),
     fighter text not null,
     world smallint not null default 1,
     champ boolean not null default false,
     at bigint,
     created_at timestamptz default now()
   );
   alter table public.scores enable row level security;
   create policy "read scores" on public.scores for select using (true);
   create policy "insert scores" on public.scores for insert with check (true);
   ```
3. **Local fallback**: `localStorage`, so the board always works offline.

## Art

The fighters, props and worlds are AI-generated 16-bit pixel art (Recraft v4.1), processed into game-ready sprites and embedded in `index.html` as WebP data URIs, so the game is still a single file.

- **Fighters:** five 4-pose sprite sheets per fighter in Neo Geo arcade style (stance, jab, cross, knockdown, low kick, roundhouse, crouch, crouch jab, jump, flying kick, jump punch, hit, walk, block, uppercut, sweep, victory, dizzy, palm special, crouch low kick), generated on a magenta key background.
- **Crowds:** one sheet per world with 4 spectators, each drawn idle and cheering. They pump fists now and then, and jump and cheer when a hit lands or a round ends.
- **Living backdrops:** `LIVE` in `index.html` animates each painted world in code: rippling sea and puddles, swaying palms, flickering neon, twinkling windows and lanterns, blinking server LEDs, food steam, drifting fog, gulls and a rocket beacon.
- **Worlds:** one wide painted backdrop per world that the camera pans across as the fight moves.
- **Props:** projectiles, summons and fatality objects (tariff decree, red cap, Grok bot, Cybercab, crab, alligator, panda, mini tank, ship, GPU wafer, mini robot, nunchaku, tweet card, prompt scroll, firewall, GPU chip, robo-dog, rocket, giant GPU, paperclip, hit spark). A prop missing from the atlas is drawn as a simple pixel placeholder (`phProp`) until its art lands.

The pipeline lives in `assets/tools`:

1. `slice.py` keys out the magenta, finds each pose (splitting touching poses by erosion), defringes edges and saves clean RGBA frames.
2. `atlas.py` flips every frame to face right, scales each fighter to their in-game height, anchors frames at the feet, packs one atlas per fighter plus props and backgrounds, and writes `assets.js`.

Source sheets are kept in `assets/raw`. To swap a fighter's art, drop in new sheets with the same names and rerun both scripts, then paste `assets.js` over the `const ASSETS` script block in `index.html`.

Hits, blocks, whiffs, jumps, landings and KOs play real CC0 sound samples from `audio/sfx` (see `audio/CREDITS.md`), synthesized WebAudio still covers music, the announcer and any browser where the samples fail to load.

Title, stage, victory and KO music are free-licensed tracks streamed from `audio/music` (see `audio/CREDITS.md`), with the synthesized WebAudio sequencer as a fallback if a track can't load.

Every fighter has a theme song (`audio/music/theme_<id>.mp3`): it previews on the character select screen, and in arcade mode the opponent's theme plays on the VS screen and during the fight (training and the attract demo keep the stage tracks).

Every fighter has six voice lines (intro, signature special, super, taunt, KO yell, win quote) and there is a deep announcer, all in `audio/voice`. They are stock synthetic voices from the open Kokoro TTS model (Apache-2.0), pitch-shifted and gritted up per character, with no real person's voice cloned (see `audio/CREDITS.md`). Only the two fighters in the current match plus the announcer are loaded; if the files can't load (for example from `file://`) the announcer falls back to the browser's speech synthesis and the fighters stay quiet.

## Performance

The game renders on a 960×540 canvas with nearest-neighbour scaling, and the HUD sits on its own sharp overlay. Drawing is just image blits from preloaded atlases: a full update and render takes well under 1 ms in headless Chromium, far below the 16.7 ms budget for 60 fps. Press **F** in game to see the live FPS counter. The embedded art adds about 1.9 MB to `index.html`.

All characters are parodies with made-up names.
