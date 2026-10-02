# Audio Credits

All sound effects are **CC0 (Creative Commons Zero / public domain)** — free to use,
modify and redistribute with no attribution required. Sourced from Kenney.nl asset
packs (https://kenney.nl/assets) and trimmed/normalized/converted to mono MP3.

| File | Source pack | Original file | License |
|---|---|---|---|
| `hit_light.mp3` | Kenney — Impact Sounds | `impactPunch_medium_001.ogg` | CC0 |
| `hit_heavy.mp3` | Kenney — Impact Sounds | `impactPunch_heavy_002.ogg` | CC0 |
| `block.mp3` | Kenney — Impact Sounds | `impactPlate_medium_002.ogg` | CC0 |
| `counter.mp3` | Kenney — Sci-fi Sounds | `impactMetal_003.ogg` | CC0 |
| `whiff.mp3` | Kenney — RPG Audio | `knifeSlice.ogg` | CC0 |
| `jump.mp3` | Kenney — Digital Audio | `phaseJump2.ogg` | CC0 |
| `land.mp3` | Kenney — Impact Sounds | `footstep_wood_002.ogg` | CC0 |
| `ko_boom.mp3` | Kenney — Sci-fi Sounds | `explosionCrunch_002.ogg` | CC0 |
| `body_fall.mp3` | Kenney — Impact Sounds | `impactSoft_heavy_002.ogg` | CC0 |
| `select.mp3` | Kenney — Interface Sounds | `click_001.ogg` | CC0 |
| `confirm.mp3` | Kenney — Interface Sounds | `confirmation_002.ogg` | CC0 |
| `bell.mp3` | Kenney — Interface Sounds | `bong_001.ogg` | CC0 |

Pack pages (each links its own zip download and `License.txt`, all CC0):

- Impact Sounds — https://kenney.nl/assets/impact-sounds
- Interface Sounds — https://kenney.nl/assets/interface-sounds
- Digital Audio — https://kenney.nl/assets/digital-audio
- Sci-fi Sounds — https://kenney.nl/assets/sci-fi-sounds
- RPG Audio — https://kenney.nl/assets/rpg-audio

License text (identical across all packs above):

> License: (Creative Commons Zero, CC0) — http://creativecommons.org/publicdomain/zero/1.0/
> This content is free to use in personal, educational and commercial projects.
> Support us by crediting Kenney or www.kenney.nl (this is not mandatory)

## Processing

Each source `.ogg` was trimmed of leading silence, loudness-normalized, downmixed to
mono, resampled to 22.05 kHz and encoded as MP3 at ~64-96 kbps (ffmpeg). Total size
of all 12 files is under 100 KB.

## Music

Background music (`audio/music/*.mp3`) is real licensed tracks — mostly **CC0**
(public domain, no attribution required), plus one **CC-BY 4.0** track that needed
attribution, kept because nothing CC0 fit the "neon night market" mood as well.
Sourced from OpenGameArt.org and Kenney.nl, then trimmed, loudness-normalized
(`loudnorm=I=-16:TP=-1.5`) and encoded as MP3 with ffmpeg.

| File | Slot | Title | Author | Source | License |
|---|---|---|---|---|---|
| `title.mp3` | Title / menu | Chiptune Title Screen | tomcat_0 | https://opengameart.org/content/chiptune-title-screen | CC0 |
| `beach.mp3` | Venice Beach | Mad Bossa | fmateus | https://opengameart.org/content/mad-bossa | CC0 |
| `valley.mp3` | Silicon Valley HQ | Synthwave House Loop | fupi | https://opengameart.org/content/synthwave-house-loop | CC0 |
| `night.mp3` | Shenzhen Night Market | Neon Night Market | synth-thetic | https://opengameart.org/content/neon-night-market | **CC-BY 4.0** — https://creativecommons.org/licenses/by/4.0/ |
| `data.mp3` | Hyperscale Data Center | Hardwar | cinameng | https://opengameart.org/content/hardwar | CC0 |
| `mars.mp3` | Mars Colony One | Epic Boss Battle (Juhani Junkala, "400 Indie Game Music Loops") | subspaceaudio | https://opengameart.org/content/boss-battle-music | CC0 |
| `win.mp3` | Round / match win jingle | Glorious victory fanfare NES | congusbongus | https://opengameart.org/content/glorious-victory-fanfare-nes | CC0 |
| `ko.mp3` | KO / Finish Him sting | Kenney Music Jingles — Hit jingle 15 | Kenney | https://kenney.nl/assets/music-jingles | CC0 |

Attribution for the one CC-BY track, as required by its license:

> "Neon Night Market" by synth-thetic (https://opengameart.org/content/neon-night-market),
> licensed CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/). No changes beyond
> trimming/loudness-normalizing/re-encoding to MP3.

### Changes made to every music file

Downloaded original `.ogg`/`.wav`, trimmed leading silence where present, loudness-
normalized to -16 LUFS (`-14 LUFS` for the two short stings), and encoded as stereo
MP3 at 44.1 kHz / 96 kbps (mono for the two stings). `win.mp3` was additionally cut
to a ~4.2 s excerpt of the fanfare with a short fade-out; all loops are used as
downloaded (`hardwar.wav`/`data.mp3` is an 18 s seamless loop, looped by the game).
Total size of `audio/music` is about 5.3 MB.

## Fighter themes

One loopable theme per fighter (`audio/music/theme_<id>.mp3`), previewed on the character select screen and
played as the opponent's theme in arcade fights. All nine are **CC0** (public domain, no attribution required)
from OpenGameArt.org; author names are as credited on the OGA page (CC0 license: http://creativecommons.org/publicdomain/zero/1.0/).

| File | Fighter | Title | Author | Source | License |
|---|---|---|---|---|---|
| `theme_tramp.mp3` | Donald Tramp | Determined Pursuit (Epic Orchestra Loop) | Emma_MA | https://opengameart.org/content/determined-pursuit-epic-orchestra-loop | CC0 |
| `theme_mask.mp3` | Elon Mask | Space Synth Wave (Cool 80's Synth Wave) | Pro Sensory | https://opengameart.org/content/space-synth-wave | CC0 |
| `theme_xi.mp3` | Xi Jinpong | Chipnese | Spring Spring | https://opengameart.org/content/chipnese | CC0 |
| `theme_dario.mp3` | Dario Amodayo | Cyber March | iamoneabe | https://opengameart.org/content/cyber-march | CC0 |
| `theme_sam.mp3` | Sam Altmode | It Takes A Hero | Zane Little Music | https://opengameart.org/content/it-takes-a-hero | CC0 |
| `theme_jensen.mp3` | Jensen Hwang | JRPG Epic Rock Battle Theme #1 (loop) | HydroGene | https://opengameart.org/content/jrpg-epic-rock-battle-theme-1 | CC0 |
| `theme_zuck.mp3` | Mark Zuckerbot | Tech Rave (faster version) | Frenchyboy | https://opengameart.org/content/tech-rave | CC0 |
| `theme_wong.mp3` | Alexandr Wong | Neon Hyperdrive | Adiutorium | https://opengameart.org/content/neon-hyperdrive | CC0 |
| `theme_xing.mp3` | Wang Xing-Mech | The Gears of Progress | section31 | https://opengameart.org/content/the-gears-of-progress | CC0 |
| `theme_sing.mp3` | THE SINGULARITY (boss, The Void, story panels) | Lo-fi chiptune glitch D'n'B | obscure music | https://opengameart.org/content/lo-fi-chiptune-glitch-dnb | CC0 |

Changes: leading silence trimmed (except the Tramp loop, kept whole), tracks longer than 105 s cut to
105 s with a 1.5 s fade-out (Mask, Dario, Sam, Jensen, Wong, Xing; Tramp, Xi and Zuck are complete),
loudness-normalized (`loudnorm=I=-16:TP=-1.5`) and encoded as stereo MP3, 44.1 kHz, 64 kbps.
The nine themes total about 7.0 MB. `theme_sing.mp3` (Phase 3) is complete (1:46), leading silence trimmed,
`loudnorm=I=-16:TP=-1.5`, stereo MP3 44.1 kHz / 64 kbps (about 0.85 MB). The new home stages reuse their owner's theme.

## Voices

Fighter and announcer voice lines in `audio/voice/` (`<fighter>_<key>.mp3`, `ann_<key>.mp3`) are
synthetic speech from **Kokoro-82M** (https://huggingface.co/hexgrad/Kokoro-82M), an open-weights
TTS model under the **Apache-2.0** license, run locally through the `kokoro` Python package
(Apache-2.0). Only the model's stock voices were used; no real person's voice is cloned or
imitated. The humour is in the written lines. The generated audio is original to this project.

| Character | Kokoro stock voice | Processing |
|---|---|---|
| Tramp | `am_fenrir` | slightly slower, pitch -3% |
| Mask | `am_puck` | slightly faster |
| Xi | `bm_george` | slow, pitch -7% |
| Dario | `am_liam` | slightly slower |
| Sam | `am_echo` | faster, pitch +4% |
| Jensen | `am_adam` | pitch -6% |
| Zuck | `am_eric` | none |
| Wong | `am_michael` | fast, pitch +6% |
| Xing (mech) | `bm_lewis` | pitch -12%, 75 Hz ring modulation + chorus (robot) |
| Announcer | `am_onyx` | pitch -22%, slow, short echo, bass boost |

Each line was pitch/tempo-shifted with ffmpeg (`asetrate` + `atempo`), given light arcade grit
(bit-crush mix, 90 Hz-7.2 kHz band-limit, compression), silence-trimmed, loudness-normalized
and encoded as mono MP3 at 22.05 kHz / 64 kbps. Total size of `audio/voice` is about 620 KB.

### Phase 3 voices (story mode)

Generated with the same local Kokoro setup and ffmpeg chain as above:

- **Rival banter** `banter_<player>_<rival>_<n>.mp3` (36 clips, 4 per rival pair): each line in the speaker's
  voice from the table above.
- **THE SINGULARITY** `sing_<key>.mp3` (intro, sig, super, taunt, win, ko, phase2): Kokoro stock voice `af_nicole`,
  pitch -18%, then 38 Hz ring modulation, a flanger, a heavy bit-crush (7 bits, 45% mix) and a short double digital
  echo, so it sounds like a distorted machine.
- **Story narration** `story_intro_<n>.mp3`, `story_ending_<fighter>_<n>.mp3` (31 clips): the announcer voice
  `am_onyx`, pitch -14%, slightly slow, short echo, bass boost, no bit-crush (for clarity).

The 74 Phase 3 clips add about 1.9 MB.
