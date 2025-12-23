// Monophonic subtractive synthesizer
import { getAudioContext, getMasterGain } from './audioContext';

export type OscillatorType = 'sine' | 'sawtooth' | 'square' | 'triangle';

export interface SynthParams {
    // Oscillator
    waveform: OscillatorType;
    detune: number; // cents, -100 to 100

    // Envelope (ADSR)
    attack: number;  // 0-2 seconds
    decay: number;   // 0-2 seconds
    sustain: number; // 0-1
    release: number; // 0-3 seconds

    // Filter
    filterCutoff: number;   // 20-20000 Hz
    filterResonance: number; // 0-25
    filterEnvAmount: number; // 0-1

    // Output
    volume: number; // 0-1
}

export const defaultSynthParams: SynthParams = {
    waveform: 'sawtooth',
    detune: 0,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.4,
    release: 0.5,
    filterCutoff: 2000,
    filterResonance: 2,
    filterEnvAmount: 0.5,
    volume: 0.5,
};

// Note frequencies (A3 = 220Hz base, up to C5)
const NOTE_FREQUENCIES: { [key: string]: number } = {
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
    'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
    'A#3': 233.08, 'B3': 246.94, 'C4': 261.63, 'C#4': 277.18, 'D4': 293.66,
    'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
    'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88, 'C5': 523.25,
};

export function getNoteFrequency(note: string): number {
    return NOTE_FREQUENCIES[note] || 220;
}

export function getAllNotes(): string[] {
    return Object.keys(NOTE_FREQUENCIES);
}

// Get notes for a specific scale
export function getScaleNotes(root: string, scaleType: 'major' | 'minor' | 'pentatonic'): string[] {
    const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootNote = root.replace(/\d/, '');
    const rootIndex = allNotes.indexOf(rootNote);

    const intervals: { [key: string]: number[] } = {
        major: [0, 2, 4, 5, 7, 9, 11],
        minor: [0, 2, 3, 5, 7, 8, 10],
        pentatonic: [0, 3, 5, 7, 10],
    };

    const scaleIntervals = intervals[scaleType];
    const notes: string[] = [];

    for (let octave = 3; octave <= 4; octave++) {
        for (const interval of scaleIntervals) {
            const noteIndex = (rootIndex + interval) % 12;
            const noteName = allNotes[noteIndex] + octave;
            if (NOTE_FREQUENCIES[noteName]) {
                notes.push(noteName);
            }
        }
    }

    return notes;
}

// Play a synth note with full envelope
export function playSynthNote(
    note: string,
    startTime: number,
    duration: number,
    params: SynthParams = defaultSynthParams
): void {
    const ctx = getAudioContext();
    const frequency = getNoteFrequency(note);

    // Create oscillator
    const osc = ctx.createOscillator();
    osc.type = params.waveform;
    osc.frequency.value = frequency;
    osc.detune.value = params.detune;

    // Optional: second detuned oscillator for thickness
    const osc2 = ctx.createOscillator();
    osc2.type = params.waveform;
    osc2.frequency.value = frequency;
    osc2.detune.value = -params.detune;

    // Low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = params.filterCutoff;
    filter.Q.value = params.filterResonance;

    // Filter envelope
    const filterEnvAmount = params.filterEnvAmount * (20000 - params.filterCutoff);
    filter.frequency.setValueAtTime(params.filterCutoff, startTime);
    filter.frequency.linearRampToValueAtTime(
        params.filterCutoff + filterEnvAmount,
        startTime + params.attack
    );
    filter.frequency.exponentialRampToValueAtTime(
        Math.max(params.filterCutoff, 20),
        startTime + params.attack + params.decay
    );

    // Amplitude envelope (ADSR)
    const ampEnv = ctx.createGain();
    const peakLevel = params.volume;
    const sustainLevel = params.volume * params.sustain;

    ampEnv.gain.setValueAtTime(0, startTime);
    ampEnv.gain.linearRampToValueAtTime(peakLevel, startTime + params.attack);
    ampEnv.gain.linearRampToValueAtTime(sustainLevel, startTime + params.attack + params.decay);

    // Hold sustain until note ends
    const noteEndTime = startTime + duration;
    ampEnv.gain.setValueAtTime(sustainLevel, noteEndTime);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, noteEndTime + params.release);

    // Connect: oscillators -> filter -> amp -> master
    const oscMix = ctx.createGain();
    oscMix.gain.value = 0.5;

    osc.connect(oscMix);
    osc2.connect(oscMix);
    oscMix.connect(filter);
    filter.connect(ampEnv);
    ampEnv.connect(getMasterGain());

    // Start and stop
    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(noteEndTime + params.release + 0.1);
    osc2.stop(noteEndTime + params.release + 0.1);
}
