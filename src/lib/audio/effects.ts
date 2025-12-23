// Effects Rack: Reverb, Delay, Distortion, Compressor
import { getAudioContext, getMasterGain } from './audioContext';

// Effect node references
let reverbNode: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let delayGain: GainNode | null = null;
let distortionNode: WaveShaperNode | null = null;
let distortionGain: GainNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let effectsInitialized = false;

export interface EffectsParams {
    reverb: { wet: number; decay: number };
    delay: { wet: number; time: number; feedback: number };
    distortion: { wet: number; amount: number };
    compressor: { threshold: number; ratio: number; attack: number; release: number };
}

export const defaultEffectsParams: EffectsParams = {
    reverb: { wet: 0.2, decay: 2 },
    delay: { wet: 0.15, time: 0.3, feedback: 0.3 },
    distortion: { wet: 0, amount: 0 },
    compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
};

// Create impulse response for reverb
function createReverbImpulse(duration: number, decay: number): AudioBuffer {
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }

    return impulse;
}

// Create distortion curve
function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> | null {
    if (amount === 0) return null;

    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = amount * 100;

    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }

    return curve as Float32Array<ArrayBuffer>;
}

export function initializeEffects(): void {
    if (effectsInitialized) return;

    const ctx = getAudioContext();
    const master = getMasterGain();

    // Create compressor (at the end of chain)
    compressorNode = ctx.createDynamicsCompressor();
    compressorNode.threshold.value = -24;
    compressorNode.ratio.value = 4;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;

    // Create reverb
    reverbNode = ctx.createConvolver();
    reverbNode.buffer = createReverbImpulse(2, 2);
    reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.2;

    // Create delay
    delayNode = ctx.createDelay(2);
    delayNode.delayTime.value = 0.3;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.3;
    delayGain = ctx.createGain();
    delayGain.gain.value = 0.15;

    // Delay feedback loop
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    // Create distortion
    distortionNode = ctx.createWaveShaper();
    distortionNode.oversample = '4x';
    distortionGain = ctx.createGain();
    distortionGain.gain.value = 0;

    // Routing: master -> effects -> compressor -> destination
    // Reverb send
    master.connect(reverbNode);
    reverbNode.connect(reverbGain);
    reverbGain.connect(compressorNode);

    // Delay send
    master.connect(delayNode);
    delayNode.connect(delayGain);
    delayGain.connect(compressorNode);

    // Distortion (parallel)
    master.connect(distortionNode);
    distortionNode.connect(distortionGain);
    distortionGain.connect(compressorNode);

    // Dry signal
    master.connect(compressorNode);

    // Output
    compressorNode.connect(ctx.destination);

    // Disconnect master from direct destination (now goes through effects)
    master.disconnect(ctx.destination);

    effectsInitialized = true;
}

export function updateEffects(params: EffectsParams): void {
    if (!effectsInitialized) initializeEffects();

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Reverb
    if (reverbGain) {
        reverbGain.gain.setTargetAtTime(params.reverb.wet, now, 0.1);
    }
    if (reverbNode && params.reverb.decay) {
        reverbNode.buffer = createReverbImpulse(params.reverb.decay, 2);
    }

    // Delay
    if (delayNode) {
        delayNode.delayTime.setTargetAtTime(params.delay.time, now, 0.1);
    }
    if (delayFeedback) {
        delayFeedback.gain.setTargetAtTime(params.delay.feedback, now, 0.1);
    }
    if (delayGain) {
        delayGain.gain.setTargetAtTime(params.delay.wet, now, 0.1);
    }

    // Distortion
    if (distortionNode) {
        distortionNode.curve = makeDistortionCurve(params.distortion.amount);
    }
    if (distortionGain) {
        distortionGain.gain.setTargetAtTime(params.distortion.wet, now, 0.1);
    }

    // Compressor
    if (compressorNode) {
        compressorNode.threshold.setTargetAtTime(params.compressor.threshold, now, 0.1);
        compressorNode.ratio.setTargetAtTime(params.compressor.ratio, now, 0.1);
        compressorNode.attack.setTargetAtTime(params.compressor.attack, now, 0.1);
        compressorNode.release.setTargetAtTime(params.compressor.release, now, 0.1);
    }
}
