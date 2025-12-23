// Professional Exporter for Beat Maker's multi-track system
import { BeatProject, Track, Step } from './trackEngine';
import { getInstrument } from './instruments';

export async function exportBeatToWav(
    project: BeatProject,
    loops: number = 4,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    const totalSteps = project.stepsPerBar * project.bars;
    const stepsToRender = totalSteps * loops;
    const stepDuration = 60 / project.bpm / 4;
    const totalDuration = stepDuration * stepsToRender + 2; // +2 for reverb tail

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.floor(sampleRate * totalDuration), sampleRate);

    // Create master gain
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = project.masterVolume;
    masterGain.connect(offlineCtx.destination);

    // Check for solo tracks
    const hasSolo = project.tracks.some(t => t.solo);

    // Schedule all track events
    for (let loop = 0; loop < loops; loop++) {
        for (let step = 0; step < totalSteps; step++) {
            const globalStep = loop * totalSteps + step;
            const baseTime = globalStep * stepDuration + 0.1; // 0.1s offset

            // Calculate swing
            const swingOffset = step % 2 === 1 ? (project.swing / 100) * stepDuration * 0.5 : 0;
            const time = baseTime + swingOffset;

            // Process each track
            for (const track of project.tracks) {
                // Skip muted tracks (unless solo)
                if (track.muted) continue;
                if (hasSolo && !track.solo) continue;

                const stepData = track.steps[step];
                if (!stepData?.active) continue;

                const instrument = getInstrument(track.instrumentId);
                if (!instrument) continue;

                // Create track gain for volume/pan
                const trackGain = offlineCtx.createGain();
                trackGain.gain.value = track.volume * (stepData.velocity || 0.8);

                const panner = offlineCtx.createStereoPanner();
                panner.pan.value = track.pan;

                trackGain.connect(panner);
                panner.connect(masterGain);

                // Calculate note duration for melodic instruments
                const noteDuration = stepDuration * 0.9;

                // Play the instrument using offline context
                playInstrumentOffline(
                    offlineCtx,
                    track.instrumentId,
                    trackGain,
                    time,
                    stepData.note || undefined,
                    stepData.velocity,
                    noteDuration
                );
            }
        }

        if (onProgress) {
            onProgress((loop + 1) / loops * 0.5);
        }
    }

    // Render the audio
    const renderedBuffer = await offlineCtx.startRendering();

    if (onProgress) {
        onProgress(0.8);
    }

    // Convert to WAV
    const wavBlob = audioBufferToWav(renderedBuffer);

    if (onProgress) {
        onProgress(1);
    }

    return wavBlob;
}

// Offline instrument playback (recreating the synthesis for offline context)
function playInstrumentOffline(
    ctx: OfflineAudioContext,
    instrumentId: string,
    dest: AudioNode,
    time: number,
    note?: string,
    velocity: number = 0.8,
    duration: number = 0.5
): void {
    const noteToFreq: { [key: string]: number } = {
        'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20,
        'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00,
        'A#1': 58.27, 'B1': 61.74,
        'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41,
        'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00,
        'A#2': 116.54, 'B2': 123.47,
        'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
        'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
    };

    const freq = note ? (noteToFreq[note] || 65.41) : 65.41;

    switch (instrumentId) {
        case '808-kick':
            play808KickOffline(ctx, dest, time, velocity);
            break;
        case '808-bass':
            play808BassOffline(ctx, dest, time, freq, velocity, duration);
            break;
        case 'sub-bass':
            playSubBassOffline(ctx, dest, time, freq, velocity, duration);
            break;
        case 'trap-kick':
            playTrapKickOffline(ctx, dest, time, velocity);
            break;
        case 'snare':
            playSnareOffline(ctx, dest, time, velocity);
            break;
        case 'clap':
            playClapOffline(ctx, dest, time, velocity);
            break;
        case 'closed-hat':
            playClosedHatOffline(ctx, dest, time, velocity);
            break;
        case 'open-hat':
            playOpenHatOffline(ctx, dest, time, velocity);
            break;
        case 'rimshot':
            playRimshotOffline(ctx, dest, time, velocity);
            break;
        case 'crash':
            playCrashOffline(ctx, dest, time, velocity);
            break;
        case 'pluck':
            playPluckOffline(ctx, dest, time, freq, velocity, duration);
            break;
        case 'keys':
            playKeysOffline(ctx, dest, time, freq, velocity, duration);
            break;
        case 'pad':
            playPadOffline(ctx, dest, time, freq, velocity, duration);
            break;
        case 'lead':
            playLeadOffline(ctx, dest, time, freq, velocity, duration);
            break;
    }
}

// === OFFLINE INSTRUMENT IMPLEMENTATIONS ===

function play808KickOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, velocity: number): void {
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, time);
    subOsc.frequency.exponentialRampToValueAtTime(30, time + 0.5);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(velocity, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(150, time);
    clickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(velocity * 0.6, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    subOsc.connect(subGain);
    subGain.connect(dest);
    clickOsc.connect(clickGain);
    clickGain.connect(dest);

    subOsc.start(time);
    subOsc.stop(time + 1);
    clickOsc.start(time);
    clickOsc.stop(time + 0.1);
}

function play808BassOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, freq: number, velocity: number, duration: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.setValueAtTime(velocity, time + duration - 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.3);

    osc.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.5);
    osc2.start(time);
    osc2.stop(time + duration + 0.5);
}

function playSubBassOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, freq: number, velocity: number, duration: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity, time + 0.02);
    gainNode.gain.setValueAtTime(velocity, time + duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.1);

    osc.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.2);
}

function playTrapKickOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, velocity: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.08);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + 0.4);
}

function playSnareOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, velocity: number): void {
    // Noise
    const noiseBuffer = createNoiseBufferOffline(ctx, 0.2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1500;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    // Body
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.05);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(velocity * 0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);
    osc.connect(oscGain);
    oscGain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.15);
}

function playClapOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, velocity: number): void {
    for (let i = 0; i < 4; i++) {
        const burstTime = time + i * 0.012;
        const burstVol = velocity * (1 - i * 0.15);

        const noiseBuffer = createNoiseBufferOffline(ctx, 0.04);
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2500;
        filter.Q.value = 3;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(burstVol * 0.4, burstTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.03);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(dest);

        noise.start(burstTime);
        noise.stop(burstTime + 0.05);
    }
}

function playClosedHatOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, velocity: number): void {
    const noiseBuffer = createNoiseBufferOffline(ctx, 0.08);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 7000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(hpFilter);
    hpFilter.connect(gainNode);
    gainNode.connect(dest);

    noise.start(time);
    noise.stop(time + 0.1);
}

function playOpenHatOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, velocity: number): void {
    const noiseBuffer = createNoiseBufferOffline(ctx, 0.4);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 6000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    noise.connect(hpFilter);
    hpFilter.connect(gainNode);
    gainNode.connect(dest);

    noise.start(time);
    noise.stop(time + 0.5);
}

function playRimshotOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, velocity: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, time);
    osc.frequency.exponentialRampToValueAtTime(200, time + 0.02);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + 0.1);
}

function playCrashOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, velocity: number): void {
    const noiseBuffer = createNoiseBufferOffline(ctx, 2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 5000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

    noise.connect(hpFilter);
    hpFilter.connect(gainNode);
    gainNode.connect(dest);

    noise.start(time);
    noise.stop(time + 2);
}

function playPluckOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, freq: number, velocity: number, duration: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 8, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.1);
    filter.Q.value = 5;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.1);
}

function playKeysOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, freq: number, velocity: number, duration: number): void {
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(velocity * 0.6, time + 0.1);
    gainNode.gain.setValueAtTime(velocity * 0.6, time + duration);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.3);

    const mixer = ctx.createGain();
    mixer.gain.value = 0.5;

    osc1.connect(mixer);
    osc2.connect(mixer);
    mixer.connect(gainNode);
    gainNode.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.5);
    osc2.stop(time + duration + 0.5);
}

function playPadOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, freq: number, velocity: number, duration: number): void {
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc1.detune.value = -5;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq;
    osc2.detune.value = 5;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;
    filter.Q.value = 1;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity, time + 0.3);
    gainNode.gain.setValueAtTime(velocity, time + duration - 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.1);
    osc2.stop(time + duration + 0.1);
}

function playLeadOffline(ctx: OfflineAudioContext, dest: AudioNode, time: number, freq: number, velocity: number, duration: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 6, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.2);
    filter.Q.value = 8;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity, time + 0.01);
    gainNode.gain.setValueAtTime(velocity, time + duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.1);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.2);
}

// Utility: Create noise buffer
function createNoiseBufferOffline(ctx: OfflineAudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return buffer;
}

// Convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave channels and write samples
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

// Export to MP3 (returns WAV for now - needs lamejs for real MP3)
export async function exportBeatToMp3(
    project: BeatProject,
    loops: number = 4,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    // For now, return WAV (browser doesn't natively support MP3 encoding)
    // To add real MP3 support, install lamejs library
    return exportBeatToWav(project, loops, onProgress);
}
