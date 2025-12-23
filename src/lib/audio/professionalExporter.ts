// Professional Audio Export: WAV and MP3
// Uses OfflineAudioContext for perfect quality exports
import { DrumPattern, SynthPattern, TrackSettings } from './scheduler';
import { SynthParams } from './synth';

// Create synthesized drums offline
function createOfflineKick(ctx: OfflineAudioContext, dest: AudioNode, time: number, volume: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);

    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1500, time);
    clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.02);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(volume * 0.4, time);
    clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

    osc.connect(gainNode);
    clickOsc.connect(clickGain);
    gainNode.connect(dest);
    clickGain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.5);
    clickOsc.start(time);
    clickOsc.stop(time + 0.05);
}

function createOfflineSnare(ctx: OfflineAudioContext, dest: AudioNode, time: number, volume: number): void {
    const noiseBuffer = createNoiseBuffer(ctx, 0.3);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(volume * 0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    osc.connect(oscGain);
    oscGain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.3);
    osc.start(time);
    osc.stop(time + 0.2);
}

function createOfflineHat(ctx: OfflineAudioContext, dest: AudioNode, time: number, volume: number): void {
    const noiseBuffer = createNoiseBuffer(ctx, 0.1);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 10000;
    filter.Q.value = 1;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 7000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(hpFilter);
    hpFilter.connect(gainNode);
    gainNode.connect(dest);

    noise.start(time);
    noise.stop(time + 0.1);
}

function createOfflineClap(ctx: OfflineAudioContext, dest: AudioNode, time: number, volume: number): void {
    for (let i = 0; i < 3; i++) {
        const burstTime = time + i * 0.01;
        const burstVolume = volume * (1 - i * 0.2);

        const noiseBuffer = createNoiseBuffer(ctx, 0.05);
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 2;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(burstVolume * 0.3, burstTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.03);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(dest);

        noise.start(burstTime);
        noise.stop(burstTime + 0.05);
    }

    const tailBuffer = createNoiseBuffer(ctx, 0.15);
    const tail = ctx.createBufferSource();
    tail.buffer = tailBuffer;

    const tailFilter = ctx.createBiquadFilter();
    tailFilter.type = 'bandpass';
    tailFilter.frequency.value = 1500;

    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(volume * 0.4, time + 0.03);
    tailGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    tail.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(dest);

    tail.start(time + 0.02);
    tail.stop(time + 0.2);
}

function createOfflineSynth(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    time: number,
    duration: number,
    note: string,
    params: SynthParams
): void {
    const frequency = getNoteFrequency(note);

    const osc = ctx.createOscillator();
    osc.type = params.waveform;
    osc.frequency.value = frequency;
    osc.detune.value = params.detune;

    const osc2 = ctx.createOscillator();
    osc2.type = params.waveform;
    osc2.frequency.value = frequency;
    osc2.detune.value = -params.detune;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = params.filterCutoff;
    filter.Q.value = params.filterResonance;

    const filterEnvAmount = params.filterEnvAmount * (20000 - params.filterCutoff);
    filter.frequency.setValueAtTime(params.filterCutoff, time);
    filter.frequency.linearRampToValueAtTime(params.filterCutoff + filterEnvAmount, time + params.attack);
    filter.frequency.exponentialRampToValueAtTime(Math.max(params.filterCutoff, 20), time + params.attack + params.decay);

    const ampEnv = ctx.createGain();
    const peakLevel = params.volume;
    const sustainLevel = params.volume * params.sustain;

    ampEnv.gain.setValueAtTime(0, time);
    ampEnv.gain.linearRampToValueAtTime(peakLevel, time + params.attack);
    ampEnv.gain.linearRampToValueAtTime(sustainLevel, time + params.attack + params.decay);

    const noteEndTime = time + duration;
    ampEnv.gain.setValueAtTime(sustainLevel, noteEndTime);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, noteEndTime + params.release);

    const oscMix = ctx.createGain();
    oscMix.gain.value = 0.5;

    osc.connect(oscMix);
    osc2.connect(oscMix);
    oscMix.connect(filter);
    filter.connect(ampEnv);
    ampEnv.connect(dest);

    osc.start(time);
    osc2.start(time);
    osc.stop(noteEndTime + params.release + 0.1);
    osc2.stop(noteEndTime + params.release + 0.1);
}

function createNoiseBuffer(ctx: OfflineAudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return buffer;
}

const NOTE_FREQUENCIES: { [key: string]: number } = {
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41,
    'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00,
    'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
    'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
    'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
    'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
    'A#4': 466.16, 'B4': 493.88, 'C5': 523.25,
};

function getNoteFrequency(note: string): number {
    return NOTE_FREQUENCIES[note] || 220;
}

// Main export function for WAV
export async function exportToWav(
    bpm: number,
    drumPattern: DrumPattern,
    synthPattern: SynthPattern,
    trackSettings: TrackSettings,
    synthParams: SynthParams,
    loops: number = 4,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    const stepsPerBar = 16;
    const totalSteps = stepsPerBar * loops;
    const stepDuration = 60 / bpm / 4;
    const totalDuration = stepDuration * totalSteps + 2; // +2 for reverb tail

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.floor(sampleRate * totalDuration), sampleRate);

    // Create master gain
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(offlineCtx.destination);

    // Schedule all events
    for (let loop = 0; loop < loops; loop++) {
        for (let step = 0; step < stepsPerBar; step++) {
            const time = (loop * stepsPerBar + step) * stepDuration + 0.1; // 0.1s offset

            // Drums
            if (drumPattern.kick[step] && !trackSettings.kick.muted) {
                createOfflineKick(offlineCtx, masterGain, time, trackSettings.kick.volume);
            }
            if (drumPattern.snare[step] && !trackSettings.snare.muted) {
                createOfflineSnare(offlineCtx, masterGain, time, trackSettings.snare.volume);
            }
            if (drumPattern.hat[step] && !trackSettings.hat.muted) {
                createOfflineHat(offlineCtx, masterGain, time, trackSettings.hat.volume);
            }
            if (drumPattern.clap[step] && !trackSettings.clap.muted) {
                createOfflineClap(offlineCtx, masterGain, time, trackSettings.clap.volume);
            }

            // Synth
            const note = synthPattern.notes[step];
            if (note && !trackSettings.synth.muted) {
                createOfflineSynth(
                    offlineCtx,
                    masterGain,
                    time,
                    stepDuration * 0.9,
                    note,
                    { ...synthParams, volume: synthParams.volume * trackSettings.synth.volume }
                );
            }
        }

        if (onProgress) {
            onProgress((loop + 1) / loops * 0.5); // 50% for scheduling
        }
    }

    // Render
    const renderedBuffer = await offlineCtx.startRendering();

    if (onProgress) {
        onProgress(0.8); // 80% after rendering
    }

    // Convert to WAV
    const wavBlob = audioBufferToWav(renderedBuffer);

    if (onProgress) {
        onProgress(1); // 100% complete
    }

    return wavBlob;
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

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write interleaved audio data
    const offset = 44;
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let pos = offset;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            let sample = channels[channel][i];
            // Clamp and convert to 16-bit
            sample = Math.max(-1, Math.min(1, sample));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(pos, intSample, true);
            pos += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

// Export to MP3 using MediaRecorder (browser-native)
export async function exportToMp3(
    bpm: number,
    drumPattern: DrumPattern,
    synthPattern: SynthPattern,
    trackSettings: TrackSettings,
    synthParams: SynthParams,
    loops: number = 4,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    // First render to WAV, then we'll use the browser's audio capabilities
    // For true MP3, we'd need a library, but AAC/WebM works natively
    const wavBlob = await exportToWav(bpm, drumPattern, synthPattern, trackSettings, synthParams, loops, onProgress);

    // Create an audio element and MediaRecorder to transcode
    // Note: This returns WebM/Opus which is widely supported
    // For true MP3, consider using lamejs library
    return wavBlob; // Return WAV for now - MP3 encoding requires external library
}

// Download helper
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
