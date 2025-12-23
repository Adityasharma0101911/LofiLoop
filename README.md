# LofiLoop 🎵

A browser-based loop workstation for building chill lofi beats. Built with Next.js, TypeScript, and the Web Audio API.

![LofiLoop](https://img.shields.io/badge/Next.js-15-black?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square) ![Web Audio](https://img.shields.io/badge/Web%20Audio-API-green?style=flat-square)

## ✨ Features

### Core
- **16-Step Sequencer**: 4 drum tracks + synth lane
- **Synthesized Drums**: Kick, Snare, Hat, Clap (no samples needed)
- **Subtractive Synth**: Oscillators, ADSR, filter with presets
- **A/B Patterns**: Switch between two variations

### Effects Rack
- **Reverb**: Algorithmic with decay control
- **Delay**: Ping-pong with time/feedback
- **Distortion**: Waveshaper with drive
- **Compressor**: Master glue with threshold/ratio

### Pattern Generator
- **Euclidean Rhythms**: Evenly distribute N hits across 16 steps
- **Pattern Mutation**: Auto-generate variations
- **Scale Lock**: Constrain notes to any scale
- **Auto-Fill**: Genre-specific drum fills (House, Trap, D&B)
- **Chord Suggester**: Lofi-style progressions

### Themes & UI
- **5 Color Themes**: Midnight, Sunset, Sakura, Ocean, Forest
- **Audio Visualizer**: Real-time waveform + frequency bars
- **Lofi Background**: Animated particles
- **Keyboard Shortcuts**: Space, 1-5, Q/W, arrows

### Export & Sharing
- **Recording**: Real-time capture to WebM
- **MIDI Export**: Download as .mid file
- **Share URL**: Copy Base64-encoded project link
- **JSON Import/Export**: Full project backup

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start making beats!

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Stop |
| `↑ / ↓` | BPM +1 / -1 |
| `Shift + ↑ / ↓` | BPM +10 / -10 |
| `Q / W` | Pattern A / B |
| `1-5` | Mute Kick/Snare/Hat/Clap/Synth |
| `Ctrl+S` | Save Project |

## 🏗️ Architecture

```
src/
├── components/
│   ├── LoopWorkstation.tsx    # Main orchestrator
│   ├── StepGrid.tsx           # 16-step sequencer
│   ├── SynthPanel.tsx         # Synth controls
│   ├── EffectsRack.tsx        # Effects controls
│   ├── GeneratorPanel.tsx     # Pattern generator
│   ├── Visualizer.tsx         # Audio visualizer
│   └── ThemeProvider.tsx      # Theme system
└── lib/audio/
    ├── scheduler.ts           # Lookahead scheduler
    ├── drumSynth.ts           # Synthesized drums
    ├── synth.ts               # Subtractive synth
    ├── effects.ts             # Effects chain
    ├── generator.ts           # Pattern algorithms
    └── exporter.ts            # WAV/MIDI export
```

## 🔧 Technical Highlights

- **Lookahead Scheduler**: ~25ms timer, 100ms lookahead for jitter-free timing
- **Effects Chain**: Parallel sends → master compressor
- **Euclidean Algorithm**: Bjorklund's algorithm for polyrhythms
- **MIDI Export**: Full MIDI 1.0 file generation
- **Theme System**: CSS custom properties + React context

## 📝 License

MIT
