// Lookahead scheduler for tight timing
// Based on Chris Wilson's "A Tale of Two Clocks" article
import { getAudioContext, resumeAudioContext, getCurrentTime } from './audioContext';
import { playDrum, DrumType } from './drumSynth';
import { playSynthNote, SynthParams, defaultSynthParams } from './synth';

export interface SchedulerState {
    isPlaying: boolean;
    bpm: number;
    swing: number; // 0-60%
    currentStep: number;
    currentPattern: 'A' | 'B';
}

export interface DrumPattern {
    kick: boolean[];
    snare: boolean[];
    hat: boolean[];
    clap: boolean[];
}

export interface SynthPattern {
    notes: (string | null)[]; // null = no note, string = note name
}

export interface TrackSettings {
    kick: { muted: boolean; solo: boolean; volume: number };
    snare: { muted: boolean; solo: boolean; volume: number };
    hat: { muted: boolean; solo: boolean; volume: number };
    clap: { muted: boolean; solo: boolean; volume: number };
    synth: { muted: boolean; solo: boolean; volume: number };
}

// Scheduler constants
const LOOKAHEAD = 0.1; // How far ahead to schedule (seconds)
const SCHEDULE_INTERVAL = 25; // How often to call scheduler (ms)

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let nextStepTime = 0;
let currentStep = 0;
let lastScheduledStep = -1;

// Callbacks
let onStepChange: ((step: number) => void) | null = null;

export function setOnStepChange(callback: (step: number) => void): void {
    onStepChange = callback;
}

function getSwingOffset(step: number, swing: number, stepDuration: number): number {
    // Apply swing to off-beats (steps 1, 3, 5, 7, 9, 11, 13, 15)
    if (step % 2 === 1) {
        return (swing / 100) * stepDuration * 0.5;
    }
    return 0;
}

function shouldPlayTrack(
    trackName: keyof TrackSettings,
    trackSettings: TrackSettings
): boolean {
    const settings = trackSettings[trackName];

    // Check for any solo'd tracks
    const anySolo = Object.values(trackSettings).some(t => t.solo);

    if (anySolo) {
        return settings.solo;
    }

    return !settings.muted;
}

export function scheduleStep(
    step: number,
    time: number,
    drumPatterns: { A: DrumPattern; B: DrumPattern },
    synthPatterns: { A: SynthPattern; B: SynthPattern },
    currentPattern: 'A' | 'B',
    trackSettings: TrackSettings,
    synthParams: SynthParams,
    bpm: number
): void {
    const pattern = drumPatterns[currentPattern];
    const synthPattern = synthPatterns[currentPattern];
    const stepDuration = 60 / bpm / 4; // 16th notes

    // Schedule drums
    const drumTypes: DrumType[] = ['kick', 'snare', 'hat', 'clap'];

    for (const drumType of drumTypes) {
        if (pattern[drumType][step] && shouldPlayTrack(drumType, trackSettings)) {
            playDrum(drumType, time, { volume: trackSettings[drumType].volume });
        }
    }

    // Schedule synth
    const note = synthPattern.notes[step];
    if (note && shouldPlayTrack('synth', trackSettings)) {
        playSynthNote(
            note,
            time,
            stepDuration * 0.9, // Slightly shorter than full step
            { ...synthParams, volume: synthParams.volume * trackSettings.synth.volume }
        );
    }
}

export function startScheduler(
    bpm: number,
    swing: number,
    drumPatterns: { A: DrumPattern; B: DrumPattern },
    synthPatterns: { A: SynthPattern; B: SynthPattern },
    currentPattern: 'A' | 'B',
    trackSettings: TrackSettings,
    synthParams: SynthParams
): void {
    resumeAudioContext();

    nextStepTime = getCurrentTime() + 0.05;
    currentStep = 0;
    lastScheduledStep = -1;

    const stepDuration = 60 / bpm / 4; // Duration of a 16th note

    schedulerTimer = setInterval(() => {
        const currentTime = getCurrentTime();

        while (nextStepTime < currentTime + LOOKAHEAD) {
            const swingOffset = getSwingOffset(currentStep, swing, stepDuration);
            const scheduledTime = nextStepTime + swingOffset;

            // Only schedule if we haven't already
            if (currentStep !== lastScheduledStep) {
                scheduleStep(
                    currentStep,
                    scheduledTime,
                    drumPatterns,
                    synthPatterns,
                    currentPattern,
                    trackSettings,
                    synthParams,
                    bpm
                );
                lastScheduledStep = currentStep;

                // Notify UI of step change (with timing compensation)
                if (onStepChange) {
                    const delayMs = Math.max(0, (scheduledTime - currentTime) * 1000);
                    setTimeout(() => onStepChange?.(currentStep), delayMs);
                }
            }

            // Move to next step
            nextStepTime += stepDuration;
            currentStep = (currentStep + 1) % 16;
        }
    }, SCHEDULE_INTERVAL);
}

export function stopScheduler(): void {
    if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
    }
    currentStep = 0;
    lastScheduledStep = -1;
    if (onStepChange) {
        onStepChange(-1); // Reset playhead
    }
}

export function isSchedulerRunning(): boolean {
    return schedulerTimer !== null;
}

export function getCurrentStep(): number {
    return currentStep;
}

// Create empty patterns
export function createEmptyDrumPattern(): DrumPattern {
    return {
        kick: Array(16).fill(false),
        snare: Array(16).fill(false),
        hat: Array(16).fill(false),
        clap: Array(16).fill(false),
    };
}

export function createEmptySynthPattern(): SynthPattern {
    return {
        notes: Array(16).fill(null),
    };
}

export function createDefaultTrackSettings(): TrackSettings {
    return {
        kick: { muted: false, solo: false, volume: 0.8 },
        snare: { muted: false, solo: false, volume: 0.6 },
        hat: { muted: false, solo: false, volume: 0.4 },
        clap: { muted: false, solo: false, volume: 0.5 },
        synth: { muted: false, solo: false, volume: 0.5 },
    };
}
