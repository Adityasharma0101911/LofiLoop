// Synth parameter presets
import { SynthParams, defaultSynthParams } from '../audio/synth';
import { SynthPattern } from '../audio/scheduler';

export interface SynthPreset {
    name: string;
    params: SynthParams;
    pattern?: SynthPattern;
}

export const synthPresets: SynthPreset[] = [
    {
        name: 'Warm Bass',
        params: {
            waveform: 'sawtooth',
            detune: 5,
            attack: 0.01,
            decay: 0.2,
            sustain: 0.5,
            release: 0.3,
            filterCutoff: 800,
            filterResonance: 4,
            filterEnvAmount: 0.3,
            volume: 0.6,
        },
        pattern: {
            notes: ['C3', null, null, null, 'C3', null, null, 'G3', 'C3', null, null, null, 'A#2', null, 'C3', null],
        },
    },
    {
        name: 'Soft Pluck',
        params: {
            waveform: 'triangle',
            detune: 0,
            attack: 0.005,
            decay: 0.4,
            sustain: 0.1,
            release: 0.5,
            filterCutoff: 4000,
            filterResonance: 2,
            filterEnvAmount: 0.6,
            volume: 0.5,
        },
        pattern: {
            notes: ['E4', null, 'G4', null, 'A4', null, 'G4', null, 'E4', null, 'D4', null, 'C4', null, 'D4', null],
        },
    },
    {
        name: 'Lofi Pad',
        params: {
            waveform: 'sawtooth',
            detune: 15,
            attack: 0.3,
            decay: 0.5,
            sustain: 0.7,
            release: 1.0,
            filterCutoff: 1200,
            filterResonance: 1,
            filterEnvAmount: 0.2,
            volume: 0.35,
        },
        pattern: {
            notes: ['C4', null, null, null, null, null, null, null, 'G3', null, null, null, null, null, null, null],
        },
    },
    {
        name: 'Square Lead',
        params: {
            waveform: 'square',
            detune: 0,
            attack: 0.02,
            decay: 0.2,
            sustain: 0.4,
            release: 0.4,
            filterCutoff: 3000,
            filterResonance: 3,
            filterEnvAmount: 0.4,
            volume: 0.4,
        },
        pattern: {
            notes: [null, null, 'C4', null, null, null, 'E4', null, null, null, 'G4', null, 'E4', null, null, null],
        },
    },
    {
        name: 'Empty',
        params: defaultSynthParams,
        pattern: {
            notes: Array(16).fill(null),
        },
    },
];

export function getSynthPreset(name: string): SynthPreset | null {
    const preset = synthPresets.find((p) => p.name === name);
    return preset ? { ...preset } : null;
}
