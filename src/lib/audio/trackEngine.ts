// Multi-Track Engine for Beat Maker
import { getAudioContext, getMasterGain } from './audioContext';
import { getInstrument, Instrument } from './instruments';

// ============= TRACK TYPES =============

export interface Step {
    active: boolean;
    note: string | null; // For melodic instruments
    velocity: number; // 0-1
}

export interface Track {
    id: string;
    name: string;
    instrumentId: string;
    steps: Step[];
    volume: number;
    pan: number;
    muted: boolean;
    solo: boolean;
}

export interface BeatProject {
    id: string;
    name: string;
    bpm: number;
    swing: number;
    stepsPerBar: 16 | 32;
    bars: number;
    masterVolume: number;
    key: string;
    scale: string;
    tracks: Track[];
    createdAt: number;
    updatedAt: number;
}

// ============= TRACK CREATION =============

export function createEmptyStep(): Step {
    return { active: false, note: null, velocity: 0.8 };
}

export function createEmptySteps(count: number): Step[] {
    return Array(count).fill(null).map(() => createEmptyStep());
}

export function createTrack(instrumentId: string, stepCount: number = 16): Track {
    const instrument = getInstrument(instrumentId);
    return {
        id: generateId(),
        name: instrument?.name || 'New Track',
        instrumentId,
        steps: createEmptySteps(stepCount),
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
    };
}

export function createDefaultProject(): BeatProject {
    return {
        id: generateId(),
        name: 'New Beat',
        bpm: 140,
        swing: 0,
        stepsPerBar: 16,
        bars: 1,
        masterVolume: 0.8,
        key: 'C',
        scale: 'minor',
        tracks: [
            createTrack('808-kick'),
            createTrack('closed-hat'),
            createTrack('snare'),
            createTrack('clap'),
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

// ============= PLAYBACK ENGINE =============

let schedulerInterval: number | null = null;
let currentStep = -1;
let nextStepTime = 0;
let isPlaying = false;
let stepCallback: ((step: number) => void) | null = null;

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_TIME = 0.1;

export function setOnStepCallback(callback: (step: number) => void): void {
    stepCallback = callback;
}

function scheduleStep(
    ctx: AudioContext,
    project: BeatProject,
    step: number,
    time: number
): void {
    const totalSteps = project.stepsPerBar * project.bars;
    const wrappedStep = step % totalSteps;

    // Calculate swing offset for odd steps
    const stepDuration = 60 / project.bpm / 4;
    const swingOffset = wrappedStep % 2 === 1 ? (project.swing / 100) * stepDuration * 0.5 : 0;
    const scheduledTime = time + swingOffset;

    // Check for solo tracks
    const hasSolo = project.tracks.some(t => t.solo);

    project.tracks.forEach(track => {
        // Skip muted tracks (unless solo mode overrides)
        if (track.muted) return;
        if (hasSolo && !track.solo) return;

        const stepData = track.steps[wrappedStep];
        if (!stepData?.active) return;

        const instrument = getInstrument(track.instrumentId);
        if (!instrument) return;

        // Create track gain for volume/pan
        const trackGain = ctx.createGain();
        trackGain.gain.value = track.volume * (stepData.velocity || 0.8);

        const panner = ctx.createStereoPanner();
        panner.pan.value = track.pan;

        trackGain.connect(panner);
        panner.connect(getMasterGain());

        // Calculate note duration (for melodic instruments)
        const noteDuration = stepDuration * 0.9;

        // Play the instrument
        instrument.play(
            ctx,
            trackGain,
            scheduledTime,
            stepData.note || undefined,
            stepData.velocity,
            noteDuration
        );
    });
}

export function startPlayback(project: BeatProject): void {
    if (isPlaying) return;

    const ctx = getAudioContext();
    isPlaying = true;
    currentStep = 0;
    nextStepTime = ctx.currentTime + 0.1;

    const totalSteps = project.stepsPerBar * project.bars;
    const stepDuration = 60 / project.bpm / 4;

    const scheduler = () => {
        while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
            scheduleStep(ctx, project, currentStep, nextStepTime);

            if (stepCallback) {
                // Schedule UI update slightly before audio
                const msTillStep = (nextStepTime - ctx.currentTime) * 1000;
                setTimeout(() => stepCallback?.(currentStep % totalSteps), Math.max(0, msTillStep));
            }

            nextStepTime += stepDuration;
            currentStep++;

            // Loop
            if (currentStep >= totalSteps) {
                currentStep = 0;
            }
        }
    };

    schedulerInterval = window.setInterval(scheduler, LOOKAHEAD_MS);
}

export function stopPlayback(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }
    isPlaying = false;
    currentStep = -1;
    if (stepCallback) stepCallback(-1);
}

export function isCurrentlyPlaying(): boolean {
    return isPlaying;
}

// ============= PROJECT MANIPULATION =============

export function addTrack(project: BeatProject, instrumentId: string): BeatProject {
    const totalSteps = project.stepsPerBar * project.bars;
    return {
        ...project,
        tracks: [...project.tracks, createTrack(instrumentId, totalSteps)],
        updatedAt: Date.now(),
    };
}

export function removeTrack(project: BeatProject, trackId: string): BeatProject {
    return {
        ...project,
        tracks: project.tracks.filter(t => t.id !== trackId),
        updatedAt: Date.now(),
    };
}

export function duplicateTrack(project: BeatProject, trackId: string): BeatProject {
    const sourceTrack = project.tracks.find(t => t.id === trackId);
    if (!sourceTrack) return project;

    const newTrack: Track = {
        ...sourceTrack,
        id: generateId(),
        name: `${sourceTrack.name} (Copy)`,
        steps: sourceTrack.steps.map(s => ({ ...s })),
    };

    return {
        ...project,
        tracks: [...project.tracks, newTrack],
        updatedAt: Date.now(),
    };
}

export function updateTrack(project: BeatProject, trackId: string, updates: Partial<Track>): BeatProject {
    return {
        ...project,
        tracks: project.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t),
        updatedAt: Date.now(),
    };
}

export function toggleStep(project: BeatProject, trackId: string, stepIndex: number): BeatProject {
    return {
        ...project,
        tracks: project.tracks.map(t => {
            if (t.id !== trackId) return t;
            return {
                ...t,
                steps: t.steps.map((s, i) => i === stepIndex ? { ...s, active: !s.active } : s),
            };
        }),
        updatedAt: Date.now(),
    };
}

export function setStepNote(project: BeatProject, trackId: string, stepIndex: number, note: string | null): BeatProject {
    return {
        ...project,
        tracks: project.tracks.map(t => {
            if (t.id !== trackId) return t;
            return {
                ...t,
                steps: t.steps.map((s, i) => i === stepIndex ? { ...s, note, active: note !== null } : s),
            };
        }),
        updatedAt: Date.now(),
    };
}

export function setStepVelocity(project: BeatProject, trackId: string, stepIndex: number, velocity: number): BeatProject {
    return {
        ...project,
        tracks: project.tracks.map(t => {
            if (t.id !== trackId) return t;
            return {
                ...t,
                steps: t.steps.map((s, i) => i === stepIndex ? { ...s, velocity } : s),
            };
        }),
        updatedAt: Date.now(),
    };
}

export function clearTrack(project: BeatProject, trackId: string): BeatProject {
    const totalSteps = project.stepsPerBar * project.bars;
    return {
        ...project,
        tracks: project.tracks.map(t => t.id === trackId ? { ...t, steps: createEmptySteps(totalSteps) } : t),
        updatedAt: Date.now(),
    };
}

// ============= UTILITY =============

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ============= EXPORT PROJECT =============

export function exportProject(project: BeatProject): string {
    return JSON.stringify(project, null, 2);
}

export function importProject(json: string): BeatProject | null {
    try {
        const parsed = JSON.parse(json);
        if (parsed.tracks && parsed.bpm) {
            return parsed as BeatProject;
        }
        return null;
    } catch {
        return null;
    }
}
