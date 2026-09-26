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
