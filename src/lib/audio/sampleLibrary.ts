// Sample library with free CC0 sounds from various sources
// Using free sample packs that are commonly available

export interface Sample {
    id: string;
    name: string;
    category: 'kick' | 'snare' | 'hat' | 'clap' | 'percussion' | 'bass' | 'fx' | 'vocal' | 'melody';
    url: string;
    duration?: number;
    bpm?: number;
    key?: string;
}

export interface SamplePack {
    name: string;
    author: string;
    samples: Sample[];
}

// Built-in sample library with free CC0 sounds
// These are placeholder URLs - in production you'd host these or use an API
export const SAMPLE_LIBRARY: SamplePack[] = [
    {
        name: 'Lofi Drums',
        author: 'LofiLoop',
        samples: [
            { id: 'lofi-kick-1', name: 'Dusty Kick', category: 'kick', url: '' },
            { id: 'lofi-kick-2', name: 'Vinyl Kick', category: 'kick', url: '' },
            { id: 'lofi-snare-1', name: 'Tape Snare', category: 'snare', url: '' },
            { id: 'lofi-snare-2', name: 'Rimshot', category: 'snare', url: '' },
            { id: 'lofi-hat-1', name: 'Dusty Hat', category: 'hat', url: '' },
            { id: 'lofi-hat-2', name: 'Open Hat', category: 'hat', url: '' },
            { id: 'lofi-clap-1', name: 'Soft Clap', category: 'clap', url: '' },
            { id: 'lofi-perc-1', name: 'Shaker', category: 'percussion', url: '' },
        ],
    },
    {
        name: 'Trap Drums',
        author: 'LofiLoop',
        samples: [
            { id: 'trap-kick-1', name: '808 Kick', category: 'kick', url: '' },
            { id: 'trap-kick-2', name: 'Hard Kick', category: 'kick', url: '' },
            { id: 'trap-snare-1', name: 'Trap Snare', category: 'snare', url: '' },
            { id: 'trap-hat-1', name: 'Trap Hat', category: 'hat', url: '' },
            { id: 'trap-hat-2', name: 'Fast Hats', category: 'hat', url: '' },
        ],
    },
    {
        name: 'FX & Vocals',
        author: 'LofiLoop',
        samples: [
            { id: 'fx-riser-1', name: 'Riser', category: 'fx', url: '' },
            { id: 'fx-impact-1', name: 'Impact', category: 'fx', url: '' },
            { id: 'fx-vinyl-1', name: 'Vinyl Crackle', category: 'fx', url: '' },
            { id: 'vocal-chop-1', name: 'Vocal Chop', category: 'vocal', url: '' },
            { id: 'vocal-ooh-1', name: 'Ooh', category: 'vocal', url: '' },
        ],
    },
];

// Audio buffer cache for loaded samples
const sampleCache: Map<string, AudioBuffer> = new Map();

// Load a sample from URL
export async function loadSample(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    // Check cache first
    if (sampleCache.has(url)) {
        return sampleCache.get(url)!;
    }

    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        sampleCache.set(url, audioBuffer);
        return audioBuffer;
    } catch (error) {
        console.error('Failed to load sample:', url, error);
        throw error;
    }
}

// Load sample from file
export async function loadSampleFromFile(ctx: AudioContext, file: File): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                resolve(audioBuffer);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Play a sample
export function playSample(
    ctx: AudioContext,
    buffer: AudioBuffer,
    destination: AudioNode,
    time: number = ctx.currentTime,
    volume: number = 1,
    playbackRate: number = 1
): AudioBufferSourceNode {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(destination);

    source.start(time);
    return source;
}

// User's custom samples storage
export interface UserSample {
    id: string;
    name: string;
    category: Sample['category'];
    buffer: AudioBuffer;
    file?: File;
}

// Sample slot for tracks
export interface SampleSlot {
    sampleId: string | null;
    volume: number;
    pitch: number; // semitones
    pan: number; // -1 to 1
    startOffset: number; // 0 to 1
    endOffset: number; // 0 to 1
}

// Generate unique ID
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
