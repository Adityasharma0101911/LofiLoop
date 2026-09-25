# LofiLoop

**Make lofi beats in your browser.** A step sequencer with synthesized drums, 808s, electric piano and pads. You can add tape crackle and wobble, generate ideas in eight styles, and export WAV, MP3, stems or MIDI. There's no account and no uploads. Everything runs and saves locally.

![LofiLoop studio](docs/screenshot.jpg)

## Features

**Sequencing**

- Up to 16 tracks and 8 patterns (A–H) of up to 64 steps, plus a song chain you can arrange by drag and drop
- Per-step velocity, chance (probability), ratchets (1–4 retriggers) and note length
- Paint steps by click-dragging; right-click, long-press or Alt-click a pad for its step editor
- Piano roll for melodic tracks (in-key or chromatic) and drawable velocity / chance lanes
- Chord mode: one note on a keys, pad, pluck or bell track plays a diatonic triad, 7th or 9th in the project key
- MPC-style swing, tap tempo, metronome, key and scale changes that transpose existing notes

**Sound**

- 16 synthesized instruments, no samples: dusty kick, 808 with glide, snare, clap, 808-style metallic hats (with open/closed choke), rim, shaker, tom, crash, FM electric piano, warm pad, pluck, music box, soft lead and sub bass
- Sound design knobs for every instrument, plus volume, pan and reverb/echo sends per track
- A tape master chain: drive, bit crush, wow and flutter, tone, vinyl crackle, bus glue, a limiter and a safety clipper
- Convolution reverb and a tempo-synced ping-pong delay

**Ideas**

- Genre-aware generator for lofi, jazz hop, boom bap, chillhop, trap, R&B, deep house and ambient
- "Fill pattern" regenerates only the tracks you haven't locked; kept chords and kicks guide the new parts
- Track tools: re-roll, mutate, humanize, reverse, nudge, repeat half and Euclidean rhythms

**Workflow**

- Undo/redo (150 steps); continuous knob drags collapse into one step
- Autosave to a local library, with search, duplicate, delete, and import/export of `.lofiloop.json` files
- Share links: the whole beat is compressed into the URL, so nothing is uploaded
- Export WAV (16/24-bit or 32-bit float, 44.1/48 kHz), MP3 (192/320 kbps), per-track stems as a `.zip`, or a multi-track MIDI file
- Five themes (including a light one), keyboard shortcuts for everything common, and responsive layouts for phones and tablets

## Getting started

Requires Node.js 20.9+ (see `.nvmrc`).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Script                            | What it does                                                         |
| --------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                     | Start the dev server                                                 |
| `npm run build` / `npm start`     | Production build / serve it                                          |
| `npm run lint`                    | ESLint (Next.js + TypeScript rules)                                  |
| `npm run typecheck`               | `tsc --noEmit`                                                       |
| `npm run format` / `format:check` | Prettier with the Tailwind plugin                                    |
| `npm test`                        | Unit and component tests (Vitest)                                    |
| `npm run test:e2e`                | End-to-end tests in Chromium (Playwright; run `npm run build` first) |
| `npm run check`                   | Lint, typecheck, format check and unit tests                         |

## Keyboard shortcuts

| Keys                         | Action                             |
| ---------------------------- | ---------------------------------- |
| `Space`                      | Play / stop                        |
| `1`–`8`                      | Select pattern A–H                 |
| `↑` / `↓`                    | Select track                       |
| `M` / `S`                    | Mute / solo the selected track     |
| `K`                          | Metronome                          |
| `T`                          | Tap tempo                          |
| `Del`                        | Clear the selected track           |
| `Ctrl/⌘ Z`, `Ctrl/⌘ Shift Z` | Undo, redo                         |
| `Ctrl/⌘ C`, `Ctrl/⌘ V`       | Copy / paste a pattern             |
| `Ctrl/⌘ D`                   | Duplicate the selected track       |
| `Ctrl/⌘ S`, `E`, `O`         | Save now, export, open the library |
| `?`                          | All shortcuts and tips             |

In the grid, arrow keys move between pads, `Enter` toggles a pad and `Shift+Enter` opens its step editor.

## How it works

```
src/
├── app/                  Next.js App Router shell, metadata, manifest, error pages
├── components/
│   ├── studio/           The studio UI: top bar, sequencer, inspector, side panels
│   ├── dialogs/          Export, library, new beat, share, shortcuts
│   └── ui/               Accessible primitives: Knob, Fader, Dialog, Popover, Menu…
├── hooks/                Hotkeys, playhead subscription, level meters
└── lib/
    ├── audio/
    │   ├── engine.ts     Realtime playback: worker-timed lookahead scheduler
    │   ├── sequence.ts   Pure step → note-event logic shared by playback and export
    │   ├── player.ts     Voice triggering, chords, choke groups, mono glide
    │   ├── mixer.ts      Track strips, sends and the master tape chain
    │   ├── render.ts     Offline rendering of the mix or stems
    │   └── instruments/  The synthesized voices
    ├── export/           WAV, MP3 (lamejs), MIDI and ZIP encoders
    ├── generate/         Genres, beat/part generators, pattern transforms
    ├── music/            Scales, chords, seeded RNG
    ├── project/          Types, factories, file format (zod), share links, templates
    └── store/            Zustand + Immer project store with history, UI state, persistence
```

- **One engine for playback and export.** Live playback and offline rendering build the same mixer and trigger the same voices from the same `NoteEvent`s, so exports match what you hear.
- **Timing.** A lookahead scheduler, ticked from a Web Worker so it keeps time in background tabs, schedules notes about 120 ms ahead on the audio clock. It reads the latest project state on every tick. The playhead follows the audio clock, corrected for output latency, and is drawn with a generated stylesheet so the grid doesn't re-render on every step.
- **State.** Every edit goes through one `update()` that uses Immer. Structural sharing keeps undo snapshots cheap.
- **File format.** Projects are stored in a small, versioned, zod-validated format that keeps only the active steps. Imported files are clamped and repaired rather than trusted.
- **Privacy.** There's no backend. Projects live in `localStorage`, and share links carry the beat in the URL fragment, which is never sent to the server.

## Browser support

Recent Chrome, Edge, Firefox and Safari (desktop and mobile). Share links need `CompressionStream`, which all of these support. On iOS, turn off silent mode to hear audio.

## License

[GPL-3.0](LICENSE)
