// Synthesized drum sounds using Web Audio API
import { getAudioContext, getMasterGain } from './audioContext';

export type DrumType = 'kick' | 'snare' | 'hat' | 'clap';

interface DrumParams {
    volume: number;
    pitch?: number;
    decay?: number;
}

// Kick drum: Sine wave with pitch envelope
export function playKick(time: number, params: DrumParams = { volume: 0.8 }): void {
    const ctx = getAudioContext();
    const { volume, pitch = 1, decay = 0.5 } = params;

    // Oscillator for the body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 * pitch, time);
    osc.frequency.exponentialRampToValueAtTime(50 * pitch, time + 0.1);

    // Click transient
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1500, time);
    clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.02);

    // Gain envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3 * decay);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.4 * volume, time);
    clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

    // Soft saturation/compression via waveshaper
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeSoftClipCurve(0.8);

    osc.connect(gainNode);
    clickOsc.connect(clickGain);
    gainNode.connect(shaper);
    clickGain.connect(shaper);
    shaper.connect(getMasterGain());

    osc.start(time);
    osc.stop(time + 0.5);
    clickOsc.start(time);
    clickOsc.stop(time + 0.05);
}

// Snare drum: Noise burst + bandpass filtered tone
export function playSnare(time: number, params: DrumParams = { volume: 0.6 }): void {
    const ctx = getAudioContext();
    const { volume, decay = 0.3 } = params;

    // Noise for snap
    const noiseBuffer = createNoiseBuffer(ctx, 0.3);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Highpass filter for noise
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    // Body tone
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    // Envelopes
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2 * decay);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(volume * 0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1 * decay);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(getMasterGain());

    osc.connect(oscGain);
    oscGain.connect(getMasterGain());

    noise.start(time);
    noise.stop(time + 0.3);
    osc.start(time);
    osc.stop(time + 0.2);
}

// Hi-hat: High-passed noise with short decay
export function playHat(time: number, params: DrumParams = { volume: 0.4 }): void {
    const ctx = getAudioContext();
    const { volume, decay = 0.1 } = params;

    const noiseBuffer = createNoiseBuffer(ctx, 0.2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Bandpass filter for metallic sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 10000;
    filter.Q.value = 1;

    // Highpass to remove low end
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 7000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08 * (decay * 2 + 0.5));

    noise.connect(filter);
    filter.connect(hpFilter);
    hpFilter.connect(gainNode);
    gainNode.connect(getMasterGain());

    noise.start(time);
    noise.stop(time + 0.2);
}

// Clap: Layered noise bursts
export function playClap(time: number, params: DrumParams = { volume: 0.5 }): void {
    const ctx = getAudioContext();
    const { volume, decay = 0.3 } = params;

    // Multiple short bursts for clap texture
    const burstCount = 3;
    const burstSpacing = 0.01;

    for (let i = 0; i < burstCount; i++) {
        const burstTime = time + i * burstSpacing;
        const burstVolume = volume * (1 - i * 0.2);

        const noiseBuffer = createNoiseBuffer(ctx, 0.1);
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
        gainNode.connect(getMasterGain());

        noise.start(burstTime);
        noise.stop(burstTime + 0.1);
    }

    // Longer tail
    const tailBuffer = createNoiseBuffer(ctx, 0.3);
    const tail = ctx.createBufferSource();
    tail.buffer = tailBuffer;

    const tailFilter = ctx.createBiquadFilter();
    tailFilter.type = 'bandpass';
    tailFilter.frequency.value = 1500;
    tailFilter.Q.value = 1;

    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(volume * 0.4, time + 0.03);
    tailGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15 * decay);

    tail.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(getMasterGain());

    tail.start(time + 0.02);
    tail.stop(time + 0.3);
}

// Play any drum type
export function playDrum(type: DrumType, time: number, params?: DrumParams): void {
    switch (type) {
        case 'kick':
            playKick(time, params);
            break;
        case 'snare':
            playSnare(time, params);
            break;
        case 'hat':
            playHat(time, params);
            break;
        case 'clap':
            playClap(time, params);
            break;
    }
}

// Helper: Create white noise buffer
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return buffer;
}

// Helper: Soft clip waveshaper curve
function makeSoftClipCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }

    return curve;
}
