# Round 1 Fight: Tech Titans Kombat

A retro 16-bit style fighting game in a single HTML file. No build step, no external assets: fighters, stages, music, sound effects and the announcer are all generated in code.

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

| Action | Keyboard | Mobile |
|---|---|---|
| Move | A / D or ← → | Joystick |
| Jump / crouch | W / S or ↑ ↓ | Joystick up / down |
| Punch (crouch = uppercut) | J | PUNCH |
| Kick (crouch = sweep) | K | KICK |
| Special | L | SPECIAL |
| Block (crouch-block stops sweeps) | Space or I | BLOCK |
| Pause / sound / FPS meter | Esc / M / F | II button |

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

Everything is still generated in code, styled after 16-bit arcade fighters:

- **Fighters** are drawn once per animation frame as shaded limbs (5-tone colour ramps with cool shadows and warm highlights), then crushed to real pixels: alpha threshold, every colour snapped to that fighter's palette, and a 1px dark outline. Each fighter has 81 baked frames.
- **Faces** are hand-drawn pixel grids written as text in the file, upscaled 1.5x with an AdvMAME3x pass so the caricatures stay crisp.
- **Worlds** are three parallax layers (far, mid, floor) painted once and ordered-dithered to a limited palette. The floor is drawn in 1px slices that scroll faster toward the viewer for a pseudo-3D perspective, and the camera follows the fight across an arena wider than the screen.
- The HUD and text use a separate high-resolution canvas so they stay sharp.

## Performance

The game renders to a true 480×270 pixel canvas scaled up with nearest-neighbour filtering. Sprite frames bake in the background during the VS screen (about 3 ms each), and backgrounds are painted once per world. After that, a full update and render takes under 0.5 ms in headless Chromium, far below the 16.7 ms budget for 60 fps. Press **F** in game to see the live FPS counter.

All characters are parodies with made-up names.
