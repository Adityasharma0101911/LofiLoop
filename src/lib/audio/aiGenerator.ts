// AI Beat Generator
// Uses rule-based AI with music theory for generating patterns

import { Track, Step, createEmptySteps } from './trackEngine';
import { getAvailableNotes } from './instruments';

// ============= GENRE DEFINITIONS =============

export interface GenreTemplate {
    name: string;
    bpmRange: [number, number];
    patterns: {
        [instrumentId: string]: number[]; // Step indices where hits occur
    };
    characteristics: string[];
}

export const GENRES: { [key: string]: GenreTemplate } = {
    trap: {
        name: 'Trap',
        bpmRange: [130, 160],
        patterns: {
            '808-kick': [0, 7, 8, 14],
            'snare': [4, 12],
            'clap': [4, 12],
            'closed-hat': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // Constant
        },
        characteristics: ['rolling hats', 'sparse kicks', 'heavy 808'],
    },
    hiphop: {
        name: 'Hip-Hop',
        bpmRange: [85, 110],
        patterns: {
            '808-kick': [0, 6, 8, 10],
            'snare': [4, 12],
            'closed-hat': [0, 2, 4, 6, 8, 10, 12, 14],
        },
        characteristics: ['boom bap', 'swung hats', 'melodic 808'],
    },
    drill: {
        name: 'Drill',
        bpmRange: [140, 145],
        patterns: {
            '808-kick': [0, 3, 6, 10, 12],
            'snare': [4, 12],
            'clap': [4, 12],
            'closed-hat': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            'open-hat': [4, 12],
        },
        characteristics: ['sliding 808', 'triplet hats', 'dark melodies'],
    },
    lofi: {
        name: 'Lo-fi',
        bpmRange: [70, 90],
        patterns: {
            'trap-kick': [0, 8],
            'snare': [4, 12],
            'closed-hat': [2, 6, 10, 14],
        },
        characteristics: ['dusty drums', 'jazz chords', 'vinyl crackle'],
    },
    house: {
        name: 'House',
        bpmRange: [120, 130],
        patterns: {
            'trap-kick': [0, 4, 8, 12],
            'snare': [4, 12],
            'clap': [4, 12],
            'closed-hat': [2, 6, 10, 14],
            'open-hat': [4, 12],
        },
        characteristics: ['four on floor', 'offbeat hats', 'driving rhythm'],
    },
    rnb: {
        name: 'R&B',
        bpmRange: [65, 85],
        patterns: {
            '808-kick': [0, 7, 8],
            'snare': [4, 12],
            'closed-hat': [0, 2, 4, 6, 8, 10, 12, 14],
        },
        characteristics: ['smooth', 'syncopated', 'sensual'],
    },
};

// ============= AI PATTERN GENERATION =============

export function generateDrumPattern(
    genre: string,
    stepCount: number = 16,
    variation: number = 0.2 // 0-1, amount of randomization
): { [instrumentId: string]: Step[] } {
    const template = GENRES[genre] || GENRES.trap;
    const result: { [instrumentId: string]: Step[] } = {};

    for (const [instrumentId, basePattern] of Object.entries(template.patterns)) {
        const steps = createEmptySteps(stepCount);

        // Apply base pattern
        basePattern.forEach(stepIdx => {
            if (stepIdx < stepCount) {
                steps[stepIdx].active = true;
                steps[stepIdx].velocity = 0.7 + Math.random() * 0.3; // Humanize velocity
            }
        });

        // Add variations
        if (variation > 0) {
            for (let i = 0; i < stepCount; i++) {
                const addGhost = Math.random() < variation * 0.3;
                const removeHit = Math.random() < variation * 0.15;

                if (addGhost && !steps[i].active) {
                    steps[i].active = true;
                    steps[i].velocity = 0.3 + Math.random() * 0.2; // Ghost note
                }
                if (removeHit && steps[i].active && !basePattern.includes(i)) {
                    steps[i].active = false;
                }
            }
        }

        result[instrumentId] = steps;
    }

    return result;
}

// ============= AI MELODY GENERATION =============

const SCALES: { [key: string]: number[] } = {
    'major': [0, 2, 4, 5, 7, 9, 11],
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'pentatonic_major': [0, 2, 4, 7, 9],
    'pentatonic_minor': [0, 3, 5, 7, 10],
    'blues': [0, 3, 5, 6, 7, 10],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNotesInScale(root: string, scale: string, octaveRange: [number, number] = [2, 4]): string[] {
    const rootIndex = NOTE_NAMES.indexOf(root);
    if (rootIndex === -1) return [];

    const intervals = SCALES[scale] || SCALES.minor;
    const notes: string[] = [];

    for (let octave = octaveRange[0]; octave <= octaveRange[1]; octave++) {
        intervals.forEach(interval => {
            const noteIndex = (rootIndex + interval) % 12;
            notes.push(`${NOTE_NAMES[noteIndex]}${octave}`);
        });
    }

    return notes;
}

export function generateBassline(
    key: string,
    scale: string,
    stepCount: number = 16,
    density: number = 0.4, // 0-1, how many notes
    style: 'simple' | 'rhythmic' | 'melodic' = 'rhythmic'
): Step[] {
    const availableNotes = getNotesInScale(key, scale, [1, 2]);
    const rootNote = `${key}2`;
    const steps = createEmptySteps(stepCount);

    // Root on beat 1
    steps[0].active = true;
    steps[0].note = rootNote;
    steps[0].velocity = 0.9;

    // Generate pattern based on style
    if (style === 'simple') {
        // Just root notes on downbeats
        [8].forEach(i => {
            if (i < stepCount) {
                steps[i].active = true;
                steps[i].note = rootNote;
                steps[i].velocity = 0.8;
            }
        });
    } else if (style === 'rhythmic') {
        // Hip-hop style rhythmic bass
        const rhythmPattern = [0, 3, 6, 7, 10, 14];
        rhythmPattern.forEach(i => {
            if (i < stepCount && Math.random() < density * 2) {
                steps[i].active = true;
                // Pick note from scale, favoring root and fifth
                const noteChoice = Math.random();
                if (noteChoice < 0.5) {
                    steps[i].note = availableNotes[0]; // Root
                } else if (noteChoice < 0.8) {
                    steps[i].note = availableNotes[4] || availableNotes[0]; // Fifth
                } else {
                    steps[i].note = availableNotes[Math.floor(Math.random() * availableNotes.length)];
                }
                steps[i].velocity = 0.7 + Math.random() * 0.25;
            }
        });
    } else {
        // Melodic walking bass
        let lastNoteIdx = 0;
        for (let i = 0; i < stepCount; i++) {
            if (Math.random() < density) {
                steps[i].active = true;
                // Move stepwise or skip
                const direction = Math.random() < 0.5 ? 1 : -1;
                const jump = Math.random() < 0.7 ? 1 : 2;
                lastNoteIdx = Math.max(0, Math.min(availableNotes.length - 1, lastNoteIdx + direction * jump));
                steps[i].note = availableNotes[lastNoteIdx];
                steps[i].velocity = 0.6 + Math.random() * 0.3;
            }
        }
    }

    return steps;
}

export function generateMelody(
    key: string,
    scale: string,
    stepCount: number = 16,
    density: number = 0.3,
    octaveRange: [number, number] = [3, 4]
): Step[] {
    const availableNotes = getNotesInScale(key, scale, octaveRange);
    const steps = createEmptySteps(stepCount);

    let currentNoteIdx = Math.floor(availableNotes.length / 2);

    // Generate melody using stepwise motion with occasional jumps
    for (let i = 0; i < stepCount; i++) {
        // More likely to have notes on strong beats
        const isStrongBeat = i % 4 === 0;
        const chance = isStrongBeat ? density * 1.5 : density;

        if (Math.random() < chance) {
            steps[i].active = true;

            // Move mostly stepwise
            const movement = Math.random();
            if (movement < 0.4) {
                currentNoteIdx = Math.min(availableNotes.length - 1, currentNoteIdx + 1);
            } else if (movement < 0.8) {
                currentNoteIdx = Math.max(0, currentNoteIdx - 1);
            } else {
                // Occasional jump
                currentNoteIdx += Math.random() < 0.5 ? 3 : -3;
                currentNoteIdx = Math.max(0, Math.min(availableNotes.length - 1, currentNoteIdx));
            }

            steps[i].note = availableNotes[currentNoteIdx];
            steps[i].velocity = isStrongBeat ? 0.8 : 0.6 + Math.random() * 0.2;
        }
    }

    return steps;
}

// ============= HI-HAT ROLL GENERATION =============

export function generateHiHatRoll(
    stepCount: number = 16,
    style: 'simple' | 'trap' | 'bounce' = 'trap'
): Step[] {
    const steps = createEmptySteps(stepCount);

    if (style === 'simple') {
        // Eighth notes
        for (let i = 0; i < stepCount; i += 2) {
            steps[i].active = true;
            steps[i].velocity = 0.6;
        }
    } else if (style === 'trap') {
        // Constant with rolls
        for (let i = 0; i < stepCount; i++) {
            steps[i].active = true;
            // Accents on main beats
            steps[i].velocity = i % 4 === 0 ? 0.7 : 0.4 + Math.random() * 0.2;
        }
        // Add rolls before snare hits (step 4 and 12)
        [2, 3, 10, 11].forEach(i => {
            if (i < stepCount) {
                steps[i].velocity = 0.5 + Math.random() * 0.2;
            }
        });
    } else {
        // Bounce pattern
        const bouncePattern = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15];
        bouncePattern.forEach(i => {
            if (i < stepCount) {
                steps[i].active = true;
                steps[i].velocity = i % 2 === 0 ? 0.6 : 0.4;
            }
        });
    }

    return steps;
}

// ============= PATTERN VARIATION =============

export function createVariation(steps: Step[], intensity: number = 0.3): Step[] {
    return steps.map(step => {
        if (!step.active) {
            // Maybe add a ghost note
            if (Math.random() < intensity * 0.3) {
                return { ...step, active: true, velocity: 0.2 + Math.random() * 0.2 };
            }
            return { ...step };
        }

        // Maybe remove or modify
        if (Math.random() < intensity * 0.2) {
            return { ...step, active: false };
        }

        // Humanize velocity
        return {
            ...step,
            velocity: Math.max(0.2, Math.min(1, step.velocity + (Math.random() - 0.5) * 0.2)),
        };
    });
}

// ============= FILL GENERATION =============

export function generateFill(
    stepCount: number = 16,
    style: 'buildup' | 'breakdown' | 'transition' = 'buildup'
): { [instrumentId: string]: Step[] } {
    const result: { [instrumentId: string]: Step[] } = {};

    if (style === 'buildup') {
        // Snare build
        const snareSteps = createEmptySteps(stepCount);
        const buildStart = Math.floor(stepCount * 0.75);
        for (let i = buildStart; i < stepCount; i++) {
            snareSteps[i].active = true;
            snareSteps[i].velocity = 0.5 + ((i - buildStart) / (stepCount - buildStart)) * 0.4;
        }
        result['snare'] = snareSteps;

        // Hat intensify
        const hatSteps = createEmptySteps(stepCount);
        for (let i = buildStart; i < stepCount; i++) {
            hatSteps[i].active = true;
            hatSteps[i].velocity = 0.7;
        }
        result['closed-hat'] = hatSteps;
    }

    return result;
}

// ============= GET AI SUGGESTIONS =============

export interface AISuggestion {
    type: 'drum' | 'bass' | 'melody' | 'fill';
    name: string;
    description: string;
    apply: () => { [instrumentId: string]: Step[] };
}

export function getAISuggestions(
    genre: string,
    key: string,
    scale: string,
    stepCount: number
): AISuggestion[] {
    return [
        {
            type: 'drum',
            name: `${GENRES[genre]?.name || 'Trap'} Beat`,
            description: `Generate a ${genre} drum pattern`,
            apply: () => generateDrumPattern(genre, stepCount),
        },
        {
            type: 'bass',
            name: 'Rhythmic Bassline',
            description: `${key} ${scale} bass in hip-hop style`,
            apply: () => ({ '808-bass': generateBassline(key, scale, stepCount, 0.4, 'rhythmic') }),
        },
        {
            type: 'bass',
            name: 'Simple Bassline',
            description: 'Root notes on downbeats',
            apply: () => ({ 'sub-bass': generateBassline(key, scale, stepCount, 0.3, 'simple') }),
        },
        {
            type: 'melody',
            name: 'Pluck Melody',
            description: `${key} ${scale} melodic phrase`,
            apply: () => ({ 'pluck': generateMelody(key, scale, stepCount, 0.3) }),
        },
        {
            type: 'drum',
            name: 'Trap Hi-Hats',
            description: 'Rolling 16th note hats with accents',
            apply: () => ({ 'closed-hat': generateHiHatRoll(stepCount, 'trap') }),
        },
        {
            type: 'fill',
            name: 'Build Up',
            description: 'Snare roll into drop',
            apply: () => generateFill(stepCount, 'buildup'),
        },
    ];
}
