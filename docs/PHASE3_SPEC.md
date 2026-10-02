# Phase 3 spec: story

Approved by the owner on 2026-10-01. Satire rules from Phase 2 still apply: mock public persona and
public actions only, no real-world violence against real victims, no slurs, nothing sexual.

## 1. AGI Summit intro
Starting ARCADE plays a short comic-panel intro (3 panels, skippable with any key or tap, narrated by
the announcer voice with on-screen captions):
1. "2026. The world's most powerful people are summoned to a secret island: the AGI SUMMIT."
2. "The prize: control of the first Artificial General Intelligence."
3. "Nine enter. One wins. The AGI is watching..." (glowing eye in the dark)

## 2. The ladder
- Arcade = beat **all 8 other fighters**, then **THE SINGULARITY**.
- Order: random, except the **rival is always fight 8** and the Singularity is fight 10.
- **Bonus stage** after fight 4: "SMASH THE CYBERTRUCK" (see 6).
- Difficulty ramps across the ladder (AI level from easy to hard; the Singularity is hardest).
- Each opponent fights on their **home stage** (see 5).
- Before each fight the VS screen shows a one-line **trash talk** from the opponent, aimed at the player's fighter
  where it makes sense (data table, one generic line per opponent plus specific lines for rivals).
- Progress is saved per run (localStorage). Score and lives work as today.

## 3. Rivals (fight 8)
| Fighter | Rival | Theme |
|---|---|---|
| Tramp | Xi | Trade war, the flyover flinch |
| Xi | Tramp | Same, from his side |
| Elon | Zuck | The cage match that never happened |
| Zuck | Elon | Finally happening |
| Sam | Dario | The OpenAI split |
| Dario | Wong | Prompt injection vs Constitutional Classifier |
| Wong | Dario | Same |
| Jensen | Xi | Chip export controls |
| Xing | Jensen | Robots need GPUs |

Pre-fight banter: a short 3-4 line exchange shown as speech bubbles over the two portraits on the VS
screen, with voice lines generated like the Phase 2 voices (Kokoro stock voices, no cloning).

## 4. Final boss: THE SINGULARITY
- A glitchy, shape-shifting AGI. Look: a tall humanoid made of glowing cyan/magenta data, wireframe
  face, floating cables, digital glitch fragments. New sprite sheets in the same arcade style.
- **Phase 1:** mirrors the player: uses the player's own fighter's moves (kit and specials).
- **Phase 2** (at 50% health): glitch transformation, then it steals random specials from the other
  fighters' kits each few seconds (e.g. Tramp's boomerang, Wong's prompt injection, Xi's parade).
- One round match? No: best of 3 like the others, but more health and armor on some moves.
- Stage: **THE VOID**, a dark data space.
- Beating it unlocks it as a playable character (it plays as phase 1 + phase 2 kit mix).
- Has its own theme music (CC0) and a distorted voice.

## 5. New stages (home turf)
Existing: Venice Beach, Silicon Valley HQ, Shenzhen Night Market, Hyperscale Data Center, Mars Colony One.
New: Mar-a-Lago ballroom (Tramp), Starship launch pad (Elon), Great Hall of the People style hall
(Xi), Meta data-center rooftop (Zuck), The Void (Singularity). Each with crowd spectators and live-backdrop
animation like the existing ones.
Home stage map: tramp=Mar-a-Lago, mask=launch pad, xi=Great Hall, dario=Silicon Valley HQ,
sam=Venice Beach (or Silicon Valley), jensen=Hyperscale Data Center, zuck=Meta rooftop,
wong=Shenzhen Night Market, xing=Mars Colony One... adjust if art suggests better fits.

## 6. Bonus stage: SMASH THE CYBERTRUCK
SF2-style car-smashing bonus: a stainless-steel angular pickup truck takes damage in stages (dents,
glass shatters, doors fly off) over 30 s. Points for speed. Reuses fighter normals and specials.

## 7. Continue screen
On a loss: "CONTINUE?" with a 10 s countdown and the fallen fighter's portrait. Continue = retry the
same fight, score multiplier resets. No = game over and leaderboard entry.

## 8. Endings
After beating the Singularity: a 3-panel comic ending for the fighter, captions + announcer
narration, then the rolling credits. Gags:
- Tramp: slaps a 1000% tariff on the AGI; AGI pays it in crypto; "The best deal ever made".
- Elon: AGI turns out to be a Grok hologram ("nothing in this clip is real"); he moves it to Mars.
- Xi: the AGI is placed behind the Great Firewall; it becomes very harmonious.
- Dario: the AGI writes a 40,000-word safety essay; everyone falls asleep; safe at last.
- Sam: announces "AGI achieved internally"; ships it in a pocket device that never ships.
- Jensen: AGI needs more GPUs; he sells it a million; leather jacket market cap hits $10T.
- Zuck: puts the AGI in the metaverse; it has no legs either.
- Wong: posts the victory 300 times; the AGI likes every post.
- Xing: the AGI downloads into a robot dog army; IPO pops another 460%.

## 9. Unlock + gallery
- Beating the game unlocks the Singularity on the select screen.
- Title screen gets a small GALLERY button (next to CREDITS): seen endings (3 panels each), locked ones
  shown as silhouettes.

## Art budget (Recraft, recraftv4_1, ~2 credits per image)
Intro 3 panels, endings 27 panels, Singularity sprite sheets (~5-6 sheets covering the frame list used
by fighters), 5 stage backdrops + 5 crowd sheets, Cybertruck damage sheet. Target ≤ 110 credits.
