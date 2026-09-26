# Phase 2 spec: character identity

Approved by the owner on 2026-09-26. Each fighter gets an archetype, their own movement stats,
five moves built on recent (2025-2026) news and memes, and one super. Satire targets public
persona and public actions only: no real-world violence against real victims, no slurs, no
sexual content, no claims of crimes that aren't established.

## Input slots (same for everyone, so players learn one scheme)

| Slot | Motion | One-button assist (SP key) |
|---|---|---|
| S1 | ↓↘→ + punch (qcf P) | SP |
| S2 | →↓↘ + punch (dp P) | ↓ + SP |
| S3 | ↓↙← + kick (qcb K) | ← + SP |
| S4 | ↓↙← + punch (qcb P) | → + SP |
| Grab / command move | fighter specific (below) | listed per fighter |
| Super | ↓↘→ ↓↘→ + punch, needs full power bar | SP with full bar |

Light vs heavy button changes speed, distance or damage, like the current specials.
Taunt: press both heavy buttons (HP + HK) together.

## New engine features

- **Throws and command grabs:** a grab has startup, a short range box, can't be blocked, loses to
  jumps and to any attack already active. Everyone gets a normal throw (→ or ← + LP + LK, close).
- **Overheads:** attack flag `overhead`, must be blocked standing.
- **Super armor:** absorbs one hit (takes damage, no hitstun) during flagged frames.
- **Air moves:** air dash (Elon: tap → → in the air), double jump (Elon).
- **Parry / counter stance:** during active frames, a hit is nullified and triggers a counter.
- **Status effects on fighters, shown as an icon above the head:**
  - `hijack` (prompt injection): left and right swap, punches and kicks swap. The CPU picks random
    moves instead of its plan. 3 s. Big "⚠ PROMPT INJECTED" label.
  - `lock` (rare earths): cannot use specials or the super. 3 s.
  - `slow`: already exists, keep.
  - `guardDown` (panda): the next hit can't be blocked. 2 s.
- **Summons / assists:** short-lived allied entities that walk or fly and have their own hitbox
  (Grok bots, mini G1 robots, Clawd crab, panda, parade tanks, Cybercab).
- **Charge input** is not needed; the mech's charge move uses S4.
- **Per-fighter stats:** walk speed, back-walk speed, jump height and arc (gravity multiplier),
  dash speed, health, weight (knockback), hurtbox width. Keep existing pow/spd/tec meaning.
- **Meter tweaks:** Stargate Beam and 49% Stake Grab interact with the power bar as described.

## Fighters

### Donald Tramp: grappler
Slow walk, heavy, low jump, most health after the mech.
- **S1 Liberation Day Boomerang:** throws a tariff decree forward. If it doesn't hit anything by the
  edge of the screen, it flies back and can hit Tramp himself (Supreme Court struck the tariffs down,
  Feb 2026).
- **S2 Ceasefire? OVER!:** short-range shove that breaks guard: a blocking opponent is put into
  hitstun. Announcer text "CEASEFIRE OVER!".
- **S3 Flyover Flinch:** quick panic step back with invulnerability on early frames, visible wince.
- **Grab YOU'RE FIRED:** 360 motion is hard on keyboards, so use ← ↙ ↓ ↘ → + punch (half-circle
  forward) or → + SP. Close range command grab, big damage, opponent flies off, "YOU'RE FIRED!".
- **Super Make Hair Great Again:** hair poofs, a gust pushes the opponent full screen, a red cap
  flies out as a projectile.
- **Taunt:** fist raise "FIGHT! FIGHT! FIGHT!", gains a little meter.

### Elon Mask: air fighter
Floaty high jump, double jump, air dash.
- **S1 Grok "Nothing In This Clip Is Real":** spawns a hologram copy that performs a fake attack
  (no damage) to bait a block or a reaction.
- **S2 Multi-Agent Grok:** 3 small Grok bots orbit him, then fly at the opponent one after another.
- **S3 Cybercab Malfunction:** a self-driving car crosses the screen. It hits whoever it touches,
  Elon included.
- **S4 Optimus Vaporware Punch:** slow heavy punch, 1 in 3 chance it glitches and does nothing.
- **Super Starship RUD:** rocket launches from behind him and comes down on the opponent. 50% big
  explosion, 50% fizzles into a small dud.

### Xi Jinpong: fortress
Slow, highest defense, super armor on heavy punch.
- **S1 Great Firewall:** keep the existing move.
- **S2 Unflinching Stance:** hold for up to 1.5 s. Takes half damage and no hitstun while held.
- **S3 Rare Earths Leverage:** short projectile, on hit applies `lock` for 3 s.
- **S4 Panda Diplomacy:** a panda walks out. If it reaches the opponent, crowd cheers and the
  opponent gets `guardDown`.
- **Super Victory Day Parade:** a row of mini tanks marches across the full screen, multi-hit chip.

### Dario Amodayo: defensive counter
Medium speed. Rival of Alexandr Wong.
- **Passive Constitutional Classifier:** immune to `hijack`. A prompt injection that hits him
  bounces back at the sender.
- **S1 Clawd Summon:** the pixel crab scuttles forward and eats one projectile, then pinches.
- **S2 Alligator Ex Machina:** counter stance. If hit during it, an alligator snaps up from the
  floor and launches the attacker.
- **S3 Agent Teams:** starts a combo that finishes itself (4 auto hits) if the first hit connects.
- **S4 Pace the Frontier:** he slows himself for 1 s while lecturing, then a delayed mega hit.
- **Super UN Security Council Lecture:** a speech bubble wave across the screen, stuns on hit.

### Sam Altmode: all-rounder (easiest to learn)
Balanced. Keeps the shared rising uppercut and hurricane kick.
- **S1 Hype Ship:** throws a 🚢 ship projectile. Each consecutive hit in a combo adds one more ship
  next time, up to 6.
- **S2 Rising uppercut:** keep.
- **S3 Hurricane kick:** keep.
- **S4 Deepfake Decoy:** a fake Sam appears where he stood while the real one teleports behind.
- **Super Stargate Beam:** full-screen beam. Also costs him a slice of health (compute bill).
- **Extra:** io Device Dash is his forward dash: a white gadget in hand, cosmetic.

### Jensen Hwang: zoner
Slow walk, short normals, strong projectiles.
- **S1 GPU chips:** keep the existing chips projectile.
- **S2 China Export Yo-Yo:** GPU projectile that a hand from above may yank back mid-flight
  (random), then it returns toward the opponent.
- **S3 $960K Jacket Slam:** armored charge, gavel sound on hit.
- **S4 GTC Keynote:** a GPU wafer hologram appears behind him, +20% damage for 5 s.
- **Super $5 Trillion Uppercut:** rising cash-counter uppercut, damage grows with the counter.
- **Taunt Jacket Swap:** swaps a small buff with the opponent (cosmetic joke, tiny effect).

### Mark Zuckerbot: rushdown / BJJ
Fastest walk and dash.
- **Passive Slowdown? Never.:** immune to `slow`.
- **S1 Wi-Fi's Down:** a Meta glasses laser. The first use each match fails with a "Wi-Fi's down"
  bubble, later uses work.
- **S2 Muse Coach:** a hologram coach, next 3 hits deal +25%.
- **S3 Nine-Figure Guard Pull:** low grab (beats crouch block), ground submission, big damage.
- **Super Metaverse Legs:** his legs vanish, he floats forward fast with a multi-hit rush.

### Alexandr Wong: trapper
Fast and light. Rival of Dario.
- **S1 Tweet Cannon:** hold the button to keep firing a stream of small tweet-card projectiles
  (Muse meme cards). A "posts: N" counter floats over his head for the match. Every 10th tweet is a
  rival jab that deals double damage to Sam, Dario and Elon. At 300 posts in a match the cannon
  jams for 5 s with a "RATE LIMITED" label. (He posted 300+ times on X after Meta launched Muse on
  Sept 8, 2026.)
- **S2 Inexperienced Counter:** counter stance that gets stronger each round (round 1 weak,
  round 3 strong).
- **S4 IGNORE ALL PREVIOUS INSTRUCTIONS (prompt injection):** glowing text projectile, on hit
  applies `hijack` for 3 s. Dario reflects it.
- **Grab 49% Stake Grab:** → + SP or half-circle forward + punch. Steals 49% of the opponent's
  power bar.
- **Super Superintelligence Co-Lead:** a partner assist silhouette runs in for a combo.

### Wang Xing-Mech: armored heavy
Slowest, biggest, most health, super armor on heavy punch.
- **S1 Robot Dog:** keep.
- **S2 Drunken Fist Protocol:** wobbly 4-hit string with random timing.
- **S3 Cluster Formation:** 3 mini G1 robots run in and attack in sync.
- **S4 Servo Charge / Nunchaku Encore:** overhead nunchaku strike (must be blocked standing).
- **Super IPO Pop +460%:** only when his health is under 40%: a stock chart shoots up,
  then a big hit whose damage scales with damage he has taken this round.

## Props needed (sprite names in the props atlas)

`tariff` (decree scroll), `cap` (red cap), `grokbot`, `cybercab`, `crab` (8-bit crab),
`gator` (alligator head/jaws), `panda`, `tank` (mini tank), `ship` (cartoon ship icon),
`wafer` (GPU wafer hologram), `minibot` (mini humanoid robot), `nunchaku`, `tweet` (small tweet card),
`prompt` (glowing text scroll; can be drawn procedurally). Existing: wall, fire, orb, chip, tag,
dog, rocket, gpu, clip, spark. Until art lands, the engine draws a simple procedural placeholder
when a prop name is missing from the atlas.

## Balance target
No fighter above 60% or below 40% win rate across AI v AI matchups at the same AI level.
