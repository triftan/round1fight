# Engagement Research: How Addictive Game Loops Are Designed

Purpose: learn what makes loops "one more try" sticky, then apply it to Round 1 Fight without crossing into manipulation. Sources below are summarised only from content we actually read. Gaps are stated.

## Sources

**1. Stanford EE380, "How to Design Addictive Games" (Chuck Clanton, YouTube iVgMILETn8Q).** Read via auto transcript.
- Reframes "addictive" as "irresistibly engaging" and says the addiction research is inconclusive (~1:00 to 3:20).
- Flow conditions (~42:40 to 45:50): clear goals, personal agency (my actions matter), clear and immediate feedback, challenge matched to perceived skill, fairness ("I can learn my way through this"), survivable frustration, no distractions.
- "Simple, hot and deep" (~46:00): simple means I know my goal, how to do it, and how I am doing. Hot is a compelling core action. Deep is rising complexity.
- Forward momentum (~55:30 to 57:30): fold the tutorial into the first levels, make early levels fast with no deaths, so strong and weak players both keep moving.
- Design death and loss (~1:01:10): a loss should keep momentum, teach, or hint at what to do next time.
- Frustration as a bank account (~1:05:30): frustrate players "just to the point that they're almost ready to leave", then give a win and a big reward, then repeat higher. Follow a hard peak with easy wins. Boss levels are the peaks.
- Seniority beats skill (~36:40 to 39:00): give more power over time so players feel they are improving. Rewards and collectibles constantly.
- Playtest and tune: QA logged time per level nightly, spikes were investigated. Dynamic difficulty tried to change numbers directly "screwed something up"; natural balancing built into the game worked.
- Multiplayer and team obligation keep people longest (~1:18:00).
- Not covered by this source: monetization. It uses the word "cheat" openly for the power-feels-like-skill trick.

**2 and 6. Bloomberg Business, Facebook video and post (Vernon Silver).** Facebook is login-walled. We got only a blurb (plus a search mirror of the same text): developers use "addictive design techniques" to keep players hooked, the top-grossing mobile games are increasingly rated for kids even though the industry says they are safe, and Bloomberg built its own game to demonstrate the mechanics. We could not read the video's findings or any numbers. Treat it as the ethics framing only.

**3. VAV, "How to make an ADDICTIVE game?" (YouTube ItcH5s14q7A).** Auto transcript.
- Progression: fast early levels, slower later; talent choices add planning (1:15).
- Competition: even one leaderboard line keeps people grinding; clear goals with no score still work (Geometry Dash, 2:48).
- Worlds and stories: exploring and wanting to know the ending (3:34).
- Rewards: positive reinforcement; random reward size or timing hits harder than predictable (5:09). Vampire Survivors boss drop of a rare 5-upgrade chest as the example. Chest-opening animation adds anticipation (5:55).
- Learning and flow: mastery is enjoyable; too easy is boring, too hard is rage quit. His first game failed on this line (6:11).
- Forced breaks: energy and timers bring players back, but he cites a three-phase model (joy, tolerance, dependence) and says to make players take breaks to avoid the third (7:02). Note: this is a timer-gating approach we should not copy.

**4. goukigod, "Designing Addiction: The Twisted Psychology Of Game Design" (YouTube K0M1PuQaE8s).** Auto transcript. Mostly critical.
- Repeatable core loop as the central activity (Jaime Griesemer, former Bungie lead) (2:35).
- Arcade cabinets: short, simple, brutally hard, to pull in more coins (3:20).
- Positive reinforcement and progression/achievements give steady rewards, but players build tolerance (5:00).
- Variable ratio schedule: rewards sometimes and unpredictably; slot machines (6:00 to 6:40). "The zone" matters more than winning.
- Gambler's fallacy and "bad luck protection" (Apex: a legendary every 30 packs) feed the belief a win is due (7:35 to 9:15). Published odds do not fix this.
- Virtual currency acts like casino chips: obscures real cost, sold in bulk so leftovers force more spending (9:20 to 10:20).
- Random rewards woven into core play (looters, battle royale) (10:23 to 14:27). Strongly disapproving of loot boxes and Battlefront 2 style pay advantage aimed at kids.
- Ends: "vote with our wallets".

**5. LinkedIn, Anton Slashcev and Mykola, "How do you design an addictive game together" post.** Fetched post text and a comment summary.
- Core loop Challenge, Action, Reward with quick loot and flashy visuals.
- Progression in three horizons: quick upgrades, unlockable skills, achievements and leaderboards.
- Retention: daily rewards, time-limited events, exclusive items, guilds.
- Balance and feedback: gradual difficulty, audio and haptics, narrative.
- Social: leaderboards, PvP, clans, co-op, rivalries.
- "Gambling mechanics that guarantee a big win after multiple misses."
- Comments: one suggests tuning odds by genre; another says this is "engineering addiction" that yields hollow games; a third proposes labelling tactics as player friendly versus dark pattern.

**7. Medium, Luc Chaoui, "Understanding Game Design: The Psychology of Addiction" (18 Jul 2024).** Direct fetch gave 403; read in full through a scraper.
- Psychology: reward circuitry, dopamine, variable ratio reinforcement (loot boxes, random drops).
- Core elements: compulsion loops, progression, social interaction, escapism, personalization.
- Case studies: WoW, Fortnite, Candy Crush, League of Legends.
- Ethics: engagement versus exploitation; regulation (loot boxes, break reminders, age-appropriate content); healthy design: balanced rewards, natural stopping points, positive social play, transparency.

**8. Reddit r/gamedesign (already read, supplied).** Fail fast and restart fast (Flappy Bird, Super Meat Boy); simple action gives clear concept; minute-to-minute feel; fail often but anticipate the next reward ("one more try"); several progressions at once (score, mastery, reveals); punish mistakes lightly, reward good choices generously; immediate satisfying feedback ("pizzazz", Nicholas Lovell); Hooked (Nir Eyal): trigger, action, variable reward, investment; Vampire Survivors creator used mobile skills to make a not-evil addictive game; prototype the core interaction and playtest; fun is not the same as addictive.

## Synthesis: recurring principles

1. **Tight core loop.** Challenge, action, reward in seconds (sources 1, 4, 5, 7, 8). For us: a round is the loop. Keep it short.
2. **Fail fast, restart instantly.** Death or loss must keep momentum (1, 8). One-key rematch, no menus.
3. **Frustration banked, then released.** Near-misses and tough peaks followed by a satisfying win (1, 8). Tune so players lose by a little and see exactly why.
4. **Variable reward, used lightly.** Random size or timing is the strongest hook (3, 4, 5, 7). Use it for free, cosmetic or flavor surprises (crits, a rare finish animation, a bonus pickup), never for anything sold.
5. **Layered progression.** Short (this round), mid (unlocks), long (rank, mastery, collection) (1, 3, 5, 7, 8). Players should always be close to something.
6. **Juice and instant feedback.** Hit-stop, screen shake, sound, announcer, chest-style reveal anticipation (1, 3, 5, 8).
7. **Fairness and learnable skill.** Losses must feel recoverable (1). Early rounds easy, no early deaths, tutorial folded into play (1).
8. **Mastery and seniority.** Visible rank and unlocks so players feel better even between skill jumps (1).
9. **Social proof and rivalry.** Leaderboards, rival ghosts, shareable results, PvP (1, 3, 5, 7).
10. **Habit hooks, carefully.** Daily rewards, streaks, limited-time events (5) work but are also where dark patterns live. Keep them forgiving.
11. **Session length.** Short sessions with natural stopping points (4, 7). Do not copy forced timers or energy gates (3).
12. **Onboarding.** Forward momentum from the first 30 seconds (1).

## The ethical line

Bloomberg's angle (kids, top-grossing games, addictive design) and sources 4 and 7 agree on the same dark patterns: paid randomness and loot boxes, bad-luck protection that exploits the gambler's fallacy, virtual currency that hides real cost, pay-for-advantage, forced waiting to sell skips, guilt-based streaks, and spending pressure on children. Clanton's own warning about flow versus compulsion fits too.

Our rules:
- No paid randomness, ever. No loot boxes, gacha, or odds-based purchases.
- No pay-to-win. Paid items never affect combat.
- No hidden or obscured pricing. Real prices, no bulk currency.
- Streaks and dailies must forgive missed days and never punish with lost progress.
- No fake scarcity or countdowns pushing a purchase; limited-time events are only for free play.
- Assume kids are playing. No purchase prompts mid-fight or at a loss screen, no social pressure on spending.
- "Engaging, not exploitative": natural stopping points, no auto-play traps.

## Applying this to Round 1 Fight (ideas, not code)

- Instant rematch after a KO; loss screen shows one concrete tip.
- Fight-flow: easy first fights, difficulty peaks at bosses, an easier fight afterward.
- Always show distance to the next unlock (rank bar, palette, costume).
- Free random surprises: rare finisher flourishes, bonus pickups, "perfect" bonuses.
- Strong hit feedback and announcer lines.
- Rivals, ghost times, and a shareable result card.
- Gentle daily challenge with no punishment for skipping.

## Monetization (later phase)

What the sources say: monetization is tied to engagement loops mainly through the tactics they criticise (4, 7, Bloomberg): paid randomness, virtual currency, pay advantage, and timers that sell skips. Source 5's retention list (dailies, events, exclusive items) is the same toolbox. So engagement and ethics are linked: the loop can be strong without the spending tricks.

Models that fit a free indie browser fighter:
- **Cosmetic-only palettes/skins and costumes**, sold at clear prices, visible to opponents so they show off (social proof).
- **Supporter pack** (cosmetics plus a name flair or credits entry).
- **Battle-pass-lite with a full free track**; paid track is cosmetics only, no expiry on owned items, no FOMO timers.
- **Rewarded ads, opt-in only**, never before or during a fight, never for kids' accounts if age is known.
- **One-time "full game" unlock** for extra modes or characters, if any are held back; no combat power from purchases.
- **Tip jar**.

Avoid: loot boxes or random packs, pay-to-win, bulk virtual currency, spending pressure or prompts aimed at kids, countdown FOMO on purchases, and any dark pattern flagged by Bloomberg.

Build now so it is easy later:
- A cosmetic slot system (palette, costume, victory pose, announcer) separate from gameplay data, so cosmetics can never touch combat stats.
- A store-ready catalog of palettes and costumes: stable IDs, names, rarity-free tiers, price placeholders, "earnable" versus "purchasable" flags.
- Entitlements stored in the profile and accounts (Phase 6), not in localStorage alone, so purchases survive devices.
- Analytics events for the funnel and retention: first fight, fights per session, rematch rate, day-1 and day-7 return, unlock reached, cosmetic equipped. These tell us whether the loop works before we add any price.
- Keep an age-aware flag in the profile so we can disable ads and prompts for kids.

## Access notes

- Read in full: sources 3, 4, 5 (post text and comment summary), 7 (scraped), Stanford transcript (1).
- Not accessible: Bloomberg Facebook video and post beyond a short blurb (login wall). Direct YouTube fetches were blocked, so transcripts came from a transcript API (auto-generated captions, so wording may be imperfect).
