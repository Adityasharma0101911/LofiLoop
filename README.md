# LofiLoop 🎵

A browser-based loop workstation for building chill lofi beats. Built with Next.js, TypeScript, and the Web Audio API.

![LofiLoop](https://img.shields.io/badge/Next.js-15-black?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square) ![Web Audio](https://img.shields.io/badge/Web%20Audio-API-green?style=flat-square)

## ✨ Features

### Step Sequencer
- **4 Drum Tracks**: Kick, Snare, Hi-Hat, Clap
- **16-Step Grid**: One bar of 4/4 time
- **Click-Drag Painting**: Draw patterns quickly
- **Right-Click Clear**: Erase steps easily
- **Mute/Solo**: Per-track controls
- **A/B Patterns**: Switch between two variations

### Synthesizer
- **Subtractive Synth**: Monophonic bass/lead
- **Oscillators**: Sine, Triangle, Sawtooth, Square with detune
- **ADSR Envelope**: Attack, Decay, Sustain, Release
- **Low-Pass Filter**: Cutoff & Resonance controls
- **Step Notes**: Pick notes per step from the grid

### Audio Engine
- **Lookahead Scheduler**: Rock-solid timing (no jitter)
- **Synthesized Drums**: All sounds generated in real-time
- **BPM Control**: 60-180 BPM
- **Swing**: 0-60% for groove

### Project Management
- **Save/Load**: LocalStorage persistence
- **Export/Import**: JSON project files
- **Presets**: Lofi Chill, House, Trap, D&B drums + Warm Bass, Pluck, Pad synths

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to start making beats!

## 🎛️ How to Use

1. **Click Play** to start the sequencer
2. **Paint steps** on the drum grid (click-drag to draw)
3. **Add notes** by clicking synth steps and selecting a note
4. **Shape the sound** with the synth knobs on the right
5. **Adjust BPM & Swing** for different vibes
6. **Save your project** to keep your work

## 🏗️ Architecture

```
src/
├── app/                    # Next.js app router
├── components/             # React components
│   ├── LoopWorkstation.tsx # Main orchestrator
│   ├── StepGrid.tsx        # 16-step sequencer grid
│   ├── SynthPanel.tsx      # Synth controls
│   ├── TransportBar.tsx    # Play/Stop, BPM, etc.
│   ├── PresetBar.tsx       # Presets & save/load
│   ├── LoadModal.tsx       # Project loader
│   └── Knob.tsx            # Rotary knob component
└── lib/
    ├── audio/              # Web Audio engine
    │   ├── audioContext.ts # AudioContext singleton
    │   ├── scheduler.ts    # Lookahead scheduler
    │   ├── drumSynth.ts    # Synthesized drums
    │   └── synth.ts        # Subtractive synth
    ├── presets/            # Drum & synth presets
    └── storage/            # LocalStorage utilities
```

## 🎨 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom lofi design system
- **Audio**: Web Audio API with lookahead scheduling
- **Storage**: LocalStorage for project persistence

## 🔧 Technical Highlights

- **Tight Scheduler**: Uses lookahead scheduling (~25ms timer, 100ms lookahead) for consistent timing
- **Synth Drums**: Kick (sine pitch drop), Snare (noise + tone), Hat (filtered noise), Clap (layered bursts)
- **Subtractive Synth**: Dual detuned oscillators → Low-pass filter → ADSR envelope
- **No Samples**: All sounds synthesized in real-time

## 📝 License

MIT
