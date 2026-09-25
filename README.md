# Round 1 Fight: Tech Titans Kombat

A retro 16-bit style fighting game in a single HTML file with no build step. Sprites and worlds are AI-generated pixel art embedded in the file; music, sound effects and the announcer are synthesized in code.

Open `index.html` in any modern browser (desktop or phone) and play.

## The roster

| Fighter | POW | SPD | TEC | Special | Fatality |
|---|---|---|---|---|---|
| Donald Tramp | 8 | 4 | 5 | Tariff Wall | You're Fired! |
| Elon Mask | 6 | 7 | 6 | Starship Uppercut | Next Stop: Mars |
| Xi Jinpong | 7 | 5 | 8 | Great Firewall | Censored |
| Dario Amodayo | 5 | 6 | 9 | Constitutional Shield (counters + reflects) | Aligned into Paperclips |
| Sam Altmode | 5 | 8 | 7 | AGI Blast | Model Deprecated |
| Jensen Hwang | 7 | 5 | 7 | GPU Barrage | Out of Memory |
| Mark Zuckerbot | 6 | 7 | 6 | Metaverse Warp (teleport kick) | Welcome to the Metaverse |
| Alexandr Wong | 4 | 9 | 7 | Data Label Swarm (slows) | Labeled: Loser |
| Wang Xing-Mech | 9 | 3 | 5 | Robo-Dog Charge | Unitree-mendous |

Power scales damage and knockback, speed scales walk speed, tech shortens recovery and special cooldown. Each fighter also has its own mass, which changes how far they fly.

## Arcade mode

Pick a fighter, then beat 5 random challengers across 5 worlds. Each match is best of 3 rounds (60 second timer).

1. **Venice Beach** (easy)
2. **Silicon Valley HQ** (medium)
3. **Shenzhen Night Market** (hard)
4. **Hyperscale Data Center** (very hard, slippery floor)
5. **Mars Colony One** (insane, low gravity)

When you win the deciding round your opponent stands dazed: **FINISH HIM!** Walk up close and press SPECIAL for a fatality (+10,000 × world).

## Controls

Street Fighter style: four attack buttons, motion-input specials, and hold back to block.

| Action | Keyboard | Mobile |
|---|---|---|
| Move / jump / crouch | A D W S or arrows | Joystick |
| Light / heavy punch | U / I (or Z / X) | LP / HP |
| Light / heavy kick | J / K (or C / V) | LK / HK |
| Block | Hold back (away from opponent) or Space | BLK or hold back |
| Uppercut (normal) | Crouch + heavy punch | ↓ + HP |
| Sweep | Crouch + heavy kick | ↓ + HK |
| Signature special | ↓ ↘ → + punch, or L | SP |
| Rising uppercut | → ↓ ↘ + punch, or ↓ + L | ↓ + SP |
| Hurricane kick | ↓ ↙ ← + kick, or ← + L | ← + SP |
| Super (full power bar) | ↓ ↘ → ↓ ↘ → + punch, or L | SP when the bar is full |
| Dash / back hop | Tap → → / ← ← | Double-tap the joystick |
| Pause / sound / FPS | Esc / M / F | II button |

Crouch-block to stop low attacks (crouching light kick, sweep) and stand-block to stop jump-ins. Heavy versions of specials hit harder and travel further. Only one of your projectiles can be on screen at a time.

**Combos:** when a light attack connects, you can chain straight into any other attack, and every ground hit can cancel into a special (for example crouch jab, then ↓ ↘ → + punch). Inputs typed during the hit-freeze still count.

**Power bar:** fills only when you land hits or take them (a little on blocks too), and carries over between rounds. A full bar unlocks your super: a screen-freezing, powered-up version of your signature move.

## Scoring

Damage × 10, combo bonuses, round win bonus (health + time left), flawless +3,000, fatality +10,000. Everything is multiplied by the world number.

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
- **Props:** projectiles and fatality objects (tariff wall, firewall, AGI orb, GPU chip, data label, robo-dog, rocket, giant GPU, paperclip, hit spark).

The pipeline lives in `assets/tools`:

1. `slice.py` keys out the magenta, finds each pose (splitting touching poses by erosion), defringes edges and saves clean RGBA frames.
2. `atlas.py` flips every frame to face right, scales each fighter to their in-game height, anchors frames at the feet, packs one atlas per fighter plus props and backgrounds, and writes `assets.js`.

Source sheets are kept in `assets/raw`. To swap a fighter's art, drop in new sheets with the same names and rerun both scripts, then paste `assets.js` over the `const ASSETS` script block in `index.html`.

## Performance

The game renders on a 960×540 canvas with nearest-neighbour scaling, and the HUD sits on its own sharp overlay. Drawing is just image blits from preloaded atlases: a full update and render takes about 0.15 ms in headless Chromium, far below the 16.7 ms budget for 60 fps. Press **F** in game to see the live FPS counter. The embedded art adds about 1.9 MB to `index.html`.

All characters are parodies with made-up names.
