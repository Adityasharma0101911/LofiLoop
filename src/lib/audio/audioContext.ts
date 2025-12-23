// Audio context singleton with lookahead scheduler for tight timing
let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

export async function resumeAudioContext(): Promise<void> {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }
}

export function getCurrentTime(): number {
    return getAudioContext().currentTime;
}

export function getDestination(): AudioDestinationNode {
    return getAudioContext().destination;
}

// Create a master gain node for overall volume control
let masterGain: GainNode | null = null;

export function getMasterGain(): GainNode {
    if (!masterGain) {
        masterGain = getAudioContext().createGain();
        masterGain.connect(getDestination());
        masterGain.gain.value = 0.8;
    }
    return masterGain;
}

export function setMasterVolume(volume: number): void {
    getMasterGain().gain.value = Math.max(0, Math.min(1, volume));
}
