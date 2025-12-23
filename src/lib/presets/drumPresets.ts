// Drum pattern presets for different genres
import { DrumPattern } from '../audio/scheduler';

export interface DrumPreset {
    name: string;
    pattern: DrumPattern;
}

export const drumPresets: DrumPreset[] = [
    {
        name: 'Lofi Chill',
        pattern: {
            kick: [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false],
            snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
            hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
            clap: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        },
    },
    {
        name: 'Basic House',
        pattern: {
            kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
            snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
            hat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
            clap: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        },
    },
    {
        name: 'Trap-ish',
        pattern: {
            kick: [true, false, false, false, false, false, false, true, false, false, true, false, false, false, false, false],
            snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
            hat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
            clap: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, true],
        },
    },
    {
        name: 'D&B-ish',
        pattern: {
            kick: [true, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
            snare: [false, false, false, false, true, false, false, false, false, false, true, false, false, false, false, false],
            hat: [true, false, true, true, false, true, true, false, true, false, true, true, false, true, true, false],
            clap: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        },
    },
    {
        name: 'Empty',
        pattern: {
            kick: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
            snare: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
            hat: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
            clap: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        },
    },
];

export function getDrumPreset(name: string): DrumPattern | null {
    const preset = drumPresets.find((p) => p.name === name);
    return preset ? { ...preset.pattern } : null;
}
