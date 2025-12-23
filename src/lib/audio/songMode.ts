// Song Mode: Arrange patterns into a full song timeline
import { DrumPattern, SynthPattern } from './scheduler';

export interface PatternBank {
    drums: DrumPattern;
    synth: SynthPattern;
    name: string;
    color: string;
}

export interface SongBlock {
    patternId: string; // Which pattern to play
    startBar: number; // Starting position in bars
    lengthBars: number; // How many bars this block spans
    muted: boolean;
}

export interface Song {
    name: string;
    bpm: number;
    timeSignature: [number, number]; // e.g., [4, 4]
    patterns: { [id: string]: PatternBank };
    arrangement: SongBlock[];
    totalBars: number;
    loopStart: number;
    loopEnd: number;
    loopEnabled: boolean;
}

// Create an empty song
export function createEmptySong(name: string = 'New Song', bpm: number = 85): Song {
    return {
        name,
        bpm,
        timeSignature: [4, 4],
        patterns: {},
        arrangement: [],
        totalBars: 16,
        loopStart: 0,
        loopEnd: 4,
        loopEnabled: true,
    };
}

// Pattern colors for visual distinction
export const PATTERN_COLORS = [
    '#e94560', // Red
    '#ff6b6b', // Light red
    '#1dd1a1', // Green
    '#64ffda', // Cyan
    '#feca57', // Yellow
    '#ff9ff3', // Pink
    '#54a0ff', // Blue
    '#5f27cd', // Purple
];

// Create a new pattern
export function createPattern(
    id: string,
    name: string,
    drums: DrumPattern,
    synth: SynthPattern,
    colorIndex: number = 0
): PatternBank {
    return {
        drums,
        synth,
        name,
        color: PATTERN_COLORS[colorIndex % PATTERN_COLORS.length],
    };
}

// Add a block to the arrangement
export function addBlock(song: Song, patternId: string, startBar: number, lengthBars: number = 1): Song {
    const newBlock: SongBlock = {
        patternId,
        startBar,
        lengthBars,
        muted: false,
    };

    return {
        ...song,
        arrangement: [...song.arrangement, newBlock],
        totalBars: Math.max(song.totalBars, startBar + lengthBars),
    };
}

// Remove a block from the arrangement
export function removeBlock(song: Song, index: number): Song {
    return {
        ...song,
        arrangement: song.arrangement.filter((_, i) => i !== index),
    };
}

// Move a block
export function moveBlock(song: Song, index: number, newStartBar: number): Song {
    const arrangement = [...song.arrangement];
    if (arrangement[index]) {
        arrangement[index] = { ...arrangement[index], startBar: Math.max(0, newStartBar) };
    }
    return { ...song, arrangement };
}

// Resize a block
export function resizeBlock(song: Song, index: number, newLength: number): Song {
    const arrangement = [...song.arrangement];
    if (arrangement[index]) {
        arrangement[index] = { ...arrangement[index], lengthBars: Math.max(1, newLength) };
    }
    return { ...song, arrangement };
}

// Toggle block mute
export function toggleBlockMute(song: Song, index: number): Song {
    const arrangement = [...song.arrangement];
    if (arrangement[index]) {
        arrangement[index] = { ...arrangement[index], muted: !arrangement[index].muted };
    }
    return { ...song, arrangement };
}

// Get pattern at a specific bar
export function getPatternAtBar(song: Song, bar: number): PatternBank | null {
    for (const block of song.arrangement) {
        if (!block.muted && bar >= block.startBar && bar < block.startBar + block.lengthBars) {
            return song.patterns[block.patternId] || null;
        }
    }
    return null;
}

// Calculate song duration in seconds
export function getSongDuration(song: Song): number {
    const beatsPerBar = song.timeSignature[0];
    const secondsPerBeat = 60 / song.bpm;
    return song.totalBars * beatsPerBar * secondsPerBeat;
}

// Export song to JSON
export function exportSong(song: Song): string {
    return JSON.stringify(song, null, 2);
}

// Import song from JSON
export function importSong(json: string): Song | null {
    try {
        const song = JSON.parse(json);
        // Validate required fields
        if (song.name && song.bpm && song.patterns && song.arrangement) {
            return song as Song;
        }
        return null;
    } catch {
        return null;
    }
}
