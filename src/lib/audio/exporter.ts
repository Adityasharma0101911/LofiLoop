// Audio export utilities: WAV bounce, recording, MIDI export
import { getAudioContext, getMasterGain } from './audioContext';
import { DrumPattern, SynthPattern, TrackSettings, scheduleStep } from './scheduler';
import { SynthParams } from './synth';

// Export loop to WAV file using OfflineAudioContext
export async function exportToWav(
    bpm: number,
    drumPatterns: DrumPattern,
    synthPattern: SynthPattern,
    trackSettings: TrackSettings,
    synthParams: SynthParams,
    bars: number = 1
): Promise<Blob> {
    const stepsPerBar = 16;
    const totalSteps = stepsPerBar * bars;
    const stepDuration = 60 / bpm / 4;
    const totalDuration = stepDuration * totalSteps + 1; // +1 for tail

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * totalDuration, sampleRate);

    // Create master gain for offline context
    const offlineMaster = offlineCtx.createGain();
    offlineMaster.gain.value = 0.8;
    offlineMaster.connect(offlineCtx.destination);

    // Schedule all steps
    for (let bar = 0; bar < bars; bar++) {
        for (let step = 0; step < stepsPerBar; step++) {
            const time = (bar * stepsPerBar + step) * stepDuration;

            // Schedule drums and synth (simplified version for offline)
            // This is a placeholder - full implementation would recreate the synth nodes
        }
    }

    // Render
    const renderedBuffer = await offlineCtx.startRendering();

    // Convert to WAV
    return audioBufferToWav(renderedBuffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const offset = 44;
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(offset + (i * numChannels + channel) * bytesPerSample, intSample, true);
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

// Real-time recording using MediaRecorder
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

export function startRecording(): Promise<void> {
    return new Promise((resolve, reject) => {
        const ctx = getAudioContext();
        const dest = ctx.createMediaStreamDestination();
        getMasterGain().connect(dest);

        recordedChunks = [];

        try {
            mediaRecorder = new MediaRecorder(dest.stream, {
                mimeType: 'audio/webm;codecs=opus',
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            mediaRecorder.start(100); // Collect chunks every 100ms
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

export function stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
        if (!mediaRecorder) {
            reject(new Error('No recording in progress'));
            return;
        }

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            recordedChunks = [];
            resolve(blob);
        };

        mediaRecorder.stop();
        mediaRecorder = null;
    });
}

export function isRecording(): boolean {
    return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

// MIDI export
export function exportToMidi(
    drumPattern: DrumPattern,
    synthPattern: SynthPattern,
    bpm: number
): Blob {
    // MIDI file structure
    const ticksPerBeat = 480;
    const ticksPerStep = ticksPerBeat / 4; // 16th notes

    const tracks: Uint8Array[] = [];

    // Header chunk
    const header = createMidiHeader(1, 5, ticksPerBeat); // 5 tracks

    // Tempo track
    const tempoTrack = createTempoTrack(bpm);
    tracks.push(tempoTrack);

    // Drum tracks (on channel 10)
    const drumMapping: { [key: string]: number } = {
        kick: 36,   // Bass Drum 1
        snare: 38,  // Acoustic Snare
        hat: 42,    // Closed Hi-Hat
        clap: 39,   // Hand Clap
    };

    for (const [name, pattern] of Object.entries(drumPattern)) {
        const noteNumber = drumMapping[name] || 36;
        const track = createDrumTrack(pattern, noteNumber, ticksPerStep);
        tracks.push(track);
    }

    // Combine all chunks
    const totalLength = header.length + tracks.reduce((sum, t) => sum + t.length, 0);
    const midiFile = new Uint8Array(totalLength);

    let offset = 0;
    midiFile.set(header, offset);
    offset += header.length;

    for (const track of tracks) {
        midiFile.set(track, offset);
        offset += track.length;
    }

    return new Blob([midiFile], { type: 'audio/midi' });
}

function createMidiHeader(format: number, numTracks: number, ticksPerBeat: number): Uint8Array {
    const header = new Uint8Array(14);

    // MThd
    header[0] = 0x4d; header[1] = 0x54; header[2] = 0x68; header[3] = 0x64;
    // Chunk length (6)
    header[4] = 0; header[5] = 0; header[6] = 0; header[7] = 6;
    // Format
    header[8] = 0; header[9] = format;
    // Number of tracks
    header[10] = (numTracks >> 8) & 0xff; header[11] = numTracks & 0xff;
    // Ticks per beat
    header[12] = (ticksPerBeat >> 8) & 0xff; header[13] = ticksPerBeat & 0xff;

    return header;
}

function createTempoTrack(bpm: number): Uint8Array {
    const microsecondsPerBeat = Math.round(60000000 / bpm);

    const events = [
        0x00, // Delta time
        0xff, 0x51, 0x03, // Tempo meta event
        (microsecondsPerBeat >> 16) & 0xff,
        (microsecondsPerBeat >> 8) & 0xff,
        microsecondsPerBeat & 0xff,
        0x00, // Delta time
        0xff, 0x2f, 0x00, // End of track
    ];

    return createTrackChunk(new Uint8Array(events));
}

function createDrumTrack(pattern: boolean[], noteNumber: number, ticksPerStep: number): Uint8Array {
    const events: number[] = [];
    let lastTick = 0;

    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i]) {
            const tick = i * ticksPerStep;
            const delta = tick - lastTick;

            // Variable length delta time
            events.push(...encodeVariableLength(delta));
            // Note on (channel 10 = 0x99)
            events.push(0x99, noteNumber, 100);

            // Note off after short duration
            events.push(...encodeVariableLength(ticksPerStep / 2));
            events.push(0x89, noteNumber, 0);

            lastTick = tick + ticksPerStep / 2;
        }
    }

    // End of track
    events.push(0x00, 0xff, 0x2f, 0x00);

    return createTrackChunk(new Uint8Array(events));
}

function createTrackChunk(events: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(8 + events.length);

    // MTrk
    chunk[0] = 0x4d; chunk[1] = 0x54; chunk[2] = 0x72; chunk[3] = 0x6b;
    // Chunk length
    const len = events.length;
    chunk[4] = (len >> 24) & 0xff;
    chunk[5] = (len >> 16) & 0xff;
    chunk[6] = (len >> 8) & 0xff;
    chunk[7] = len & 0xff;
    // Events
    chunk.set(events, 8);

    return chunk;
}

function encodeVariableLength(value: number): number[] {
    const bytes: number[] = [];
    bytes.push(value & 0x7f);
    value >>= 7;

    while (value > 0) {
        bytes.unshift((value & 0x7f) | 0x80);
        value >>= 7;
    }

    return bytes;
}

// Shareable URL encoding
export function encodeProjectToUrl(project: object): string {
    const json = JSON.stringify(project);
    const compressed = btoa(json);
    return compressed;
}

export function decodeProjectFromUrl(encoded: string): object | null {
    try {
        const json = atob(encoded);
        return JSON.parse(json);
    } catch {
        return null;
    }
}
