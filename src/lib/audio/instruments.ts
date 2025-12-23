// Professional Instrument Library for Beat Maker
// Includes 808s, drums, and synths

import { getAudioContext, getMasterGain } from './audioContext';

// ============= INSTRUMENT TYPES =============

export type InstrumentCategory = 'drums' | 'bass' | 'synth' | 'fx';

export interface Instrument {
    id: string;
    name: string;
    category: InstrumentCategory;
    color: string;
    icon: string;
    play: (ctx: AudioContext, dest: AudioNode, time: number, note?: string, velocity?: number, duration?: number) => void;
}

// ============= 808 KICK =============

function play808Kick(ctx: AudioContext, dest: AudioNode, time: number, _note?: string, velocity: number = 0.8): void {
    // Sub oscillator for deep bass
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, time);
    subOsc.frequency.exponentialRampToValueAtTime(30, time + 0.5);

    // Click for attack
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(150, time);
    clickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    // Main envelope
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(velocity, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(velocity * 0.6, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    // Soft distortion for warmth
    const distortion = ctx.createWaveShaper();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (distortion as any).curve = makeSoftCurve(50);
    distortion.oversample = '2x';

    subOsc.connect(distortion);
    distortion.connect(subGain);
    subGain.connect(dest);

    clickOsc.connect(clickGain);
    clickGain.connect(dest);

    subOsc.start(time);
    subOsc.stop(time + 1);
    clickOsc.start(time);
    clickOsc.stop(time + 0.1);
}

// ============= 808 TUNED BASS =============

const NOTE_TO_FREQ: { [key: string]: number } = {
    'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20,
    'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00,
    'A#1': 58.27, 'B1': 61.74,
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41,
    'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00,
    'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
    'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
};

function play808Bass(ctx: AudioContext, dest: AudioNode, time: number, note: string = 'C2', velocity: number = 0.8, duration: number = 0.5): void {
    const freq = NOTE_TO_FREQ[note] || 65.41;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.setValueAtTime(velocity, time + duration - 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.3);

    const distortion = ctx.createWaveShaper();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (distortion as any).curve = makeSoftCurve(20);

    osc.connect(distortion);
    osc2.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.5);
    osc2.start(time);
    osc2.stop(time + duration + 0.5);
}

// ============= TRAP KICK =============

function playTrapKick(ctx: AudioContext, dest: AudioNode, time: number, _note?: string, velocity: number = 0.8): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.08);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + 0.4);
}

// ============= SNARE =============

function playSnare(ctx: AudioContext, dest: AudioNode, time: number, _note?: string, velocity: number = 0.7): void {
    // Noise for snap
    const noiseBuffer = createNoiseBuffer(ctx, 0.2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1500;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    // Tone body
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.05);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(velocity * 0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    osc.connect(oscGain);
    oscGain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.15);
}

// ============= CLAP =============

function playClap(ctx: AudioContext, dest: AudioNode, time: number, _note?: string, velocity: number = 0.7): void {
    // Multiple bursts for clap texture
    for (let i = 0; i < 4; i++) {
        const burstTime = time + i * 0.012;
        const burstVol = velocity * (1 - i * 0.15);

        const noiseBuffer = createNoiseBuffer(ctx, 0.04);
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2500;
        filter.Q.value = 3;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(burstVol * 0.4, burstTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.03);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(dest);

        noise.start(burstTime);
        noise.stop(burstTime + 0.05);
    }

    // Tail
    const tailBuffer = createNoiseBuffer(ctx, 0.15);
    const tail = ctx.createBufferSource();
    tail.buffer = tailBuffer;

    const tailFilter = ctx.createBiquadFilter();
    tailFilter.type = 'bandpass';
    tailFilter.frequency.value = 1800;

    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(velocity * 0.35, time + 0.04);
    tailGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    tail.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(dest);

    tail.start(time + 0.04);
    tail.stop(time + 0.2);
}

// ============= HI-HATS =============

function playClosedHat(ctx: AudioContext, dest: AudioNode, time: number, _note?: string, velocity: number = 0.5): void {
    const noiseBuffer = createNoiseBuffer(ctx, 0.08);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 7000;

    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.value = 10000;
    bpFilter.Q.value = 2;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(hpFilter);
    hpFilter.connect(bpFilter);
    bpFilter.connect(gainNode);
    gainNode.connect(dest);

    noise.start(time);
    noise.stop(time + 0.1);
}

function playOpenHat(ctx: AudioContext, dest: AudioNode, time: number, _note?: string, velocity: number = 0.5): void {
    const noiseBuffer = createNoiseBuffer(ctx, 0.4);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 6000;

    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.value = 9000;
    bpFilter.Q.value = 1;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    noise.connect(hpFilter);
    hpFilter.connect(bpFilter);
    bpFilter.connect(gainNode);
    gainNode.connect(dest);

    noise.start(time);
    noise.stop(time + 0.5);
}

// ============= PERCUSSION =============

function playRimshot(ctx: AudioContext, dest: AudioNode, time: number, _note?: string, velocity: number = 0.6): void {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, time);
    osc.frequency.exponentialRampToValueAtTime(200, time + 0.02);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + 0.1);
}

function playCrash(ctx: AudioContext, dest: AudioNode, time: number, _note?: string, velocity: number = 0.5): void {
    const noiseBuffer = createNoiseBuffer(ctx, 2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 5000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

    noise.connect(hpFilter);
    hpFilter.connect(gainNode);
    gainNode.connect(dest);

    noise.start(time);
    noise.stop(time + 2);
}

// ============= SYNTHS =============

function playSubBass(ctx: AudioContext, dest: AudioNode, time: number, note: string = 'C2', velocity: number = 0.7, duration: number = 0.5): void {
    const freq = NOTE_TO_FREQ[note] || 65.41;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity, time + 0.02);
    gainNode.gain.setValueAtTime(velocity, time + duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.1);

    osc.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.2);
}

function playPluck(ctx: AudioContext, dest: AudioNode, time: number, note: string = 'C4', velocity: number = 0.5, duration: number = 0.3): void {
    const freq = NOTE_TO_FREQ[note] || 261.63;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 8, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.1);
    filter.Q.value = 5;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.1);
}

function playKeys(ctx: AudioContext, dest: AudioNode, time: number, note: string = 'C4', velocity: number = 0.5, duration: number = 0.5): void {
    const freq = NOTE_TO_FREQ[note] || 261.63;

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(velocity * 0.6, time + 0.1);
    gainNode.gain.setValueAtTime(velocity * 0.6, time + duration);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.3);

    const mixer = ctx.createGain();
    mixer.gain.value = 0.5;

    osc1.connect(mixer);
    osc2.connect(mixer);
    mixer.connect(gainNode);
    gainNode.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.5);
    osc2.stop(time + duration + 0.5);
}

function playPad(ctx: AudioContext, dest: AudioNode, time: number, note: string = 'C4', velocity: number = 0.4, duration: number = 2): void {
    const freq = NOTE_TO_FREQ[note] || 261.63;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc1.detune.value = -5;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq;
    osc2.detune.value = 5;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;
    filter.Q.value = 1;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity, time + 0.3);
    gainNode.gain.setValueAtTime(velocity, time + duration - 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.1);
    osc2.stop(time + duration + 0.1);
}

function playLead(ctx: AudioContext, dest: AudioNode, time: number, note: string = 'C4', velocity: number = 0.5, duration: number = 0.5): void {
    const freq = NOTE_TO_FREQ[note] || 261.63;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 6, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.2);
    filter.Q.value = 8;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity, time + 0.01);
    gainNode.gain.setValueAtTime(velocity, time + duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.1);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.2);
}

// ============= UTILITY FUNCTIONS =============

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return buffer;
}

function makeSoftCurve(amount: number): Float32Array | null {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }

    return curve as Float32Array;
}

// ============= INSTRUMENT REGISTRY =============

export const INSTRUMENTS: Instrument[] = [
    // 808s & Bass
    { id: '808-kick', name: '808 Kick', category: 'bass', color: '#e94560', icon: '🔊', play: play808Kick },
    { id: '808-bass', name: '808 Bass', category: 'bass', color: '#ff6b6b', icon: '🎸', play: play808Bass },
    { id: 'sub-bass', name: 'Sub Bass', category: 'bass', color: '#ff4757', icon: '〰️', play: playSubBass },

    // Drums
    { id: 'trap-kick', name: 'Trap Kick', category: 'drums', color: '#e17055', icon: '🥁', play: playTrapKick },
    { id: 'snare', name: 'Snare', category: 'drums', color: '#fdcb6e', icon: '🪘', play: playSnare },
    { id: 'clap', name: 'Clap', category: 'drums', color: '#f39c12', icon: '👏', play: playClap },
    { id: 'closed-hat', name: 'Closed Hat', category: 'drums', color: '#00cec9', icon: '🔔', play: playClosedHat },
    { id: 'open-hat', name: 'Open Hat', category: 'drums', color: '#81ecec', icon: '🔕', play: playOpenHat },
    { id: 'rimshot', name: 'Rim', category: 'drums', color: '#a29bfe', icon: '🥢', play: playRimshot },
    { id: 'crash', name: 'Crash', category: 'drums', color: '#dfe6e9', icon: '💥', play: playCrash },

    // Synths
    { id: 'pluck', name: 'Pluck', category: 'synth', color: '#00b894', icon: '🎵', play: playPluck },
    { id: 'keys', name: 'Keys', category: 'synth', color: '#55efc4', icon: '🎹', play: playKeys },
    { id: 'pad', name: 'Pad', category: 'synth', color: '#74b9ff', icon: '🌊', play: playPad },
    { id: 'lead', name: 'Lead', category: 'synth', color: '#a29bfe', icon: '✨', play: playLead },
];

export function getInstrument(id: string): Instrument | undefined {
    return INSTRUMENTS.find(i => i.id === id);
}

export function getInstrumentsByCategory(category: InstrumentCategory): Instrument[] {
    return INSTRUMENTS.filter(i => i.category === category);
}

// Get all available notes for melodic instruments
export function getAvailableNotes(): string[] {
    return Object.keys(NOTE_TO_FREQ);
}
