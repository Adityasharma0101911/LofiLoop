// Pattern generation utilities: Euclidean rhythms, mutations, auto-fills
import { DrumPattern, SynthPattern } from './scheduler';

// Euclidean rhythm generator - evenly distributes N hits across K steps
export function generateEuclideanRhythm(hits: number, steps: number): boolean[] {
    if (hits >= steps) return Array(steps).fill(true);
    if (hits <= 0) return Array(steps).fill(false);

    // Bjorklund's algorithm
    const pattern: number[] = [];
    let counts: number[] = [];
    let remainders: number[] = [];

    let divisor = steps - hits;
    remainders.push(hits);
    let level = 0;

    while (remainders[level] > 1) {
        counts.push(Math.floor(divisor / remainders[level]));
        remainders.push(divisor % remainders[level]);
        divisor = remainders[level];
        level++;
    }

    counts.push(divisor);

    function build(level: number): void {
        if (level === -1) {
            pattern.push(0);
        } else if (level === -2) {
            pattern.push(1);
        } else {
            for (let i = 0; i < counts[level]; i++) {
                build(level - 1);
            }
            if (remainders[level] !== 0) {
                build(level - 2);
            }
        }
    }

    build(level);

    // Convert to boolean array and rotate to start on downbeat
    const result = pattern.map(p => p === 1);

    // Rotate so first hit is at position 0
    const firstHit = result.indexOf(true);
    if (firstHit > 0) {
        return [...result.slice(result.length - firstHit), ...result.slice(0, result.length - firstHit)];
    }

    return result;
}

// Pattern mutation - create variations of existing patterns
export interface MutationOptions {
    addGhostNotes?: boolean;   // Add quiet notes between hits
    shiftHits?: boolean;       // Slightly shift some hits
    addFills?: boolean;        // Add fills at bar end
    removeSome?: boolean;      // Randomly remove some hits
    density?: number;          // Target density 0-1
}

export function mutatePattern(pattern: boolean[], options: MutationOptions = {}): boolean[] {
    const result = [...pattern];
    const { addGhostNotes, shiftHits, addFills, removeSome } = options;

    if (addGhostNotes) {
        // Add notes between existing hits
        for (let i = 0; i < result.length; i++) {
            if (!result[i] && Math.random() < 0.2) {
                const prevHit = i > 0 && result[i - 1];
                const nextHit = i < result.length - 1 && result[i + 1];
                if (prevHit || nextHit) {
                    result[i] = true;
                }
            }
        }
    }

    if (shiftHits) {
        // Shift some hits by one step
        for (let i = result.length - 1; i >= 0; i--) {
            if (result[i] && Math.random() < 0.15) {
                result[i] = false;
                const newPos = i + (Math.random() < 0.5 ? 1 : -1);
                if (newPos >= 0 && newPos < result.length) {
                    result[newPos] = true;
                }
            }
        }
    }

    if (addFills) {
        // Add fills at positions 13, 14, 15 (last 3 steps)
        if (Math.random() < 0.5) result[13] = true;
        if (Math.random() < 0.6) result[14] = true;
        if (Math.random() < 0.7) result[15] = true;
    }

    if (removeSome) {
        // Remove random hits (keep at least 2)
        const hitCount = result.filter(h => h).length;
        if (hitCount > 2) {
            for (let i = 0; i < result.length; i++) {
                if (result[i] && Math.random() < 0.2) {
                    result[i] = false;
                }
            }
        }
    }

    return result;
}

// Genre-specific drum fill patterns
export interface DrumFill {
    kick: boolean[];
    snare: boolean[];
    hat: boolean[];
    clap: boolean[];
}

const FILLS: { [genre: string]: DrumFill[] } = {
    house: [
        {
            kick: [false, false, false, false, false, false, false, false, false, false, false, false, true, true, true, true],
            snare: [false, false, false, false, false, false, false, false, false, false, false, false, false, true, false, true],
            hat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
            clap: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false],
        },
    ],
    trap: [
        {
            kick: [false, false, false, false, false, false, false, false, false, false, true, false, true, false, true, true],
            snare: [false, false, false, false, false, false, false, false, false, false, false, true, false, true, false, true],
            hat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
            clap: [false, false, false, false, false, false, false, false, false, false, false, false, true, false, true, true],
        },
    ],
    dnb: [
        {
            kick: [false, false, false, false, false, false, false, false, true, false, true, false, true, true, false, true],
            snare: [false, false, false, false, false, false, false, false, false, true, false, true, false, true, true, false],
            hat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
            clap: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        },
    ],
};

export function generateFill(genre: 'house' | 'trap' | 'dnb'): DrumFill {
    const fills = FILLS[genre] || FILLS.house;
    return fills[Math.floor(Math.random() * fills.length)];
}

// Apply fill to last 4 steps of a pattern
export function applyFillToPattern(pattern: DrumPattern, fill: DrumFill): DrumPattern {
    const result: DrumPattern = {
        kick: [...pattern.kick],
        snare: [...pattern.snare],
        hat: [...pattern.hat],
        clap: [...pattern.clap],
    };

    // Apply fill to last 4 steps
    for (let i = 12; i < 16; i++) {
        result.kick[i] = fill.kick[i];
        result.snare[i] = fill.snare[i];
        result.hat[i] = fill.hat[i];
        result.clap[i] = fill.clap[i];
    }

    return result;
}

// Scale definitions for note generation
export const SCALES: { [key: string]: number[] } = {
    'major': [0, 2, 4, 5, 7, 9, 11],
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'pentatonic_major': [0, 2, 4, 7, 9],
    'pentatonic_minor': [0, 3, 5, 7, 10],
    'blues': [0, 3, 5, 6, 7, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getScaleNotes(root: string, scale: string, octaveRange: [number, number] = [3, 4]): string[] {
    const rootIndex = NOTE_NAMES.indexOf(root);
    if (rootIndex === -1) return [];

    const intervals = SCALES[scale] || SCALES.minor;
    const notes: string[] = [];

    for (let octave = octaveRange[0]; octave <= octaveRange[1]; octave++) {
        for (const interval of intervals) {
            const noteIndex = (rootIndex + interval) % 12;
            notes.push(`${NOTE_NAMES[noteIndex]}${octave}`);
        }
    }

    return notes;
}

// Generate a bassline in a given scale
export function generateBassline(
    scale: string[],
    density: number = 0.4,
    anchorSteps: number[] = [0, 4, 8, 12]
): (string | null)[] {
    const pattern: (string | null)[] = Array(16).fill(null);

    // Place anchor notes
    for (const step of anchorSteps) {
        if (Math.random() < 0.8) {
            // Prefer lower notes for bass
            const lowerNotes = scale.slice(0, Math.ceil(scale.length / 2));
            pattern[step] = lowerNotes[Math.floor(Math.random() * lowerNotes.length)];
        }
    }

    // Fill in additional notes based on density
    for (let i = 0; i < 16; i++) {
        if (!pattern[i] && Math.random() < density) {
            pattern[i] = scale[Math.floor(Math.random() * scale.length)];
        }
    }

    return pattern;
}

// Chord progression suggester
export interface ChordSuggestion {
    name: string;
    notes: string[];
    numeral: string;
}

const CHORD_PROGRESSIONS: { [key: string]: string[][] } = {
    'pop': [['I', 'V', 'vi', 'IV'], ['I', 'IV', 'V', 'V'], ['vi', 'IV', 'I', 'V']],
    'jazz': [['ii', 'V', 'I', 'I'], ['I', 'vi', 'ii', 'V'], ['iii', 'vi', 'ii', 'V']],
    'lofi': [['ii', 'V', 'I', 'IV'], ['vi', 'ii', 'V', 'I'], ['I', 'iii', 'IV', 'iv']],
    'sad': [['i', 'VI', 'III', 'VII'], ['i', 'iv', 'v', 'i'], ['vi', 'IV', 'I', 'V']],
};

export function suggestChordProgression(style: 'pop' | 'jazz' | 'lofi' | 'sad' = 'lofi'): string[] {
    const progressions = CHORD_PROGRESSIONS[style];
    return progressions[Math.floor(Math.random() * progressions.length)];
}
