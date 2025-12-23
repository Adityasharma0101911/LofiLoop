// Audio Visualizer using AnalyserNode
import { getAudioContext, getMasterGain } from './audioContext';

let analyser: AnalyserNode | null = null;
let frequencyArray: Uint8Array<ArrayBuffer> | null = null;
let waveformArray: Uint8Array<ArrayBuffer> | null = null;

export function getAnalyser(): AnalyserNode {
    if (!analyser) {
        const ctx = getAudioContext();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        // Connect master gain to analyser
        getMasterGain().connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        frequencyArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
        waveformArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
    }
    return analyser;
}

export function getFrequencyData(): Uint8Array<ArrayBuffer> {
    const a = getAnalyser();
    if (!frequencyArray) {
        frequencyArray = new Uint8Array(a.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }
    a.getByteFrequencyData(frequencyArray);
    return frequencyArray;
}

export function getWaveformData(): Uint8Array<ArrayBuffer> {
    const a = getAnalyser();
    if (!waveformArray) {
        waveformArray = new Uint8Array(a.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }
    a.getByteTimeDomainData(waveformArray);
    return waveformArray;
}
