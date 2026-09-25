/**
 * Procedural ambience beds (no samples): looping stereo buffers generated once
 * per audio context. Every generator is seeded so renders are repeatable.
 */
import type { AmbienceType } from '@/lib/project/types';

export type AmbienceKind = Exclude<AmbienceType, 'none'>;

export const AMBIENCE_LABELS: Record<AmbienceType, string> = {
  none: 'None',
  rain: 'Rain',
  cafe: 'Café',
  city: 'City',
  night: 'Night',
  room: 'Room tone',
  vinyl: 'Vinyl',
};

const SECONDS = 12;
const cache = new WeakMap<BaseAudioContext, Map<AmbienceKind, AudioBuffer>>();

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** One-pole filters and helpers operating in place. */
function lowpass(data: Float32Array, cutoff: number, rate: number) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    y += a * (data[i] - y);
    data[i] = y;
  }
}

function highpass(data: Float32Array, cutoff: number, rate: number) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
  let low = 0;
  for (let i = 0; i < data.length; i++) {
    low += a * (data[i] - low);
    data[i] -= low;
  }
}

function noise(length: number, rand: () => number): Float32Array {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = rand() * 2 - 1;
  return data;
}

/** Crossfade the loop point so the buffer repeats without a click. */
function makeLoopable(data: Float32Array, rate: number) {
  const fade = Math.floor(rate * 0.5);
  const n = data.length;
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[i] = data[i] * t + data[n - fade + i] * (1 - t);
  }
  return data.subarray(0, n - fade);
}

function normalize(channels: Float32Array[], peak: number) {
  let max = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) max = Math.max(max, Math.abs(ch[i]));
  if (max === 0) return;
  const g = peak / max;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= g;
}

function rain(length: number, rate: number, rand: () => number, ch: number): Float32Array {
  const bed = noise(length, rand);
  lowpass(bed, 5000, rate);
  highpass(bed, 400, rate);
  for (let i = 0; i < length; i++) bed[i] *= 0.35;
  // Droplets: tiny decaying ticks at random pitches
  const drops = Math.floor((length / rate) * 55);
  for (let d = 0; d < drops; d++) {
    const at = Math.floor(rand() * length);
    const freq = 1800 + rand() * 4000;
    const amp = 0.08 + rand() * 0.25;
    const decay = rate * (0.004 + rand() * 0.01);
    const phase = rand() * Math.PI * 2;
    for (let j = 0; j < decay * 5 && at + j < length; j++) {
      bed[at + j] += Math.sin(phase + (2 * Math.PI * freq * j) / rate) * amp * Math.exp(-j / decay);
    }
  }
  // Slow gusts, different per channel
  const gustRate = 0.07 + ch * 0.02;
  for (let i = 0; i < length; i++) bed[i] *= 0.75 + 0.25 * Math.sin((2 * Math.PI * gustRate * i) / rate + ch);
  return bed;
}

function cafe(length: number, rate: number, rand: () => number): Float32Array {
  // Murmur: band-limited noise with syllable-like amplitude modulation
  const murmur = noise(length, rand);
  lowpass(murmur, 1100, rate);
  highpass(murmur, 180, rate);
  let env = 0;
  let target = 0;
  for (let i = 0; i < length; i++) {
    if (i % Math.floor(rate * 0.09) === 0) target = rand() < 0.6 ? 0.3 + rand() * 0.7 : 0.1;
    env += (target - env) * 0.0015;
    murmur[i] *= env * 1.8;
  }
  // Cups and spoons
  const clinks = Math.floor((length / rate) * 0.7);
  for (let c = 0; c < clinks; c++) {
    const at = Math.floor(rand() * length);
    const f1 = 2500 + rand() * 2500;
    const f2 = f1 * (1.5 + rand() * 0.8);
    const amp = 0.05 + rand() * 0.12;
    const decay = rate * (0.05 + rand() * 0.12);
    for (let j = 0; j < decay * 5 && at + j < length; j++) {
      const t = j / rate;
      murmur[at + j] +=
        (Math.sin(2 * Math.PI * f1 * t) + 0.5 * Math.sin(2 * Math.PI * f2 * t)) * amp * Math.exp(-j / decay);
    }
  }
  return murmur;
}

function city(length: number, rate: number, rand: () => number, ch: number): Float32Array {
  const rumble = noise(length, rand);
  lowpass(rumble, 220, rate);
  for (let i = 0; i < length; i++) rumble[i] *= 1.6;
  // Passing cars: swelling filtered noise that pans across channels
  const passes = 3;
  for (let p = 0; p < passes; p++) {
    const center = (p + 0.3 + rand() * 0.4) / passes;
    const width = 0.12 + rand() * 0.1;
    const car = noise(length, rand);
    lowpass(car, 700, rate);
    const side = ch === p % 2 ? 1 : 0.55;
    for (let i = 0; i < length; i++) {
      const x = (i / length - center) / width;
      car[i] *= Math.exp(-x * x) * 1.4 * side;
      rumble[i] += car[i];
    }
  }
  // Distant horn, rarely
  if (rand() < 0.8) {
    const at = Math.floor(rand() * (length - rate));
    const f = 380 + rand() * 80;
    for (let j = 0; j < rate * 0.5; j++) {
      const t = j / rate;
      const env = Math.min(1, t * 20) * Math.exp(-t * 3);
      rumble[at + j] += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t)) * 0.03 * env;
    }
  }
  return rumble;
}

function night(length: number, rate: number, rand: () => number, ch: number): Float32Array {
  const wind = noise(length, rand);
  lowpass(wind, 600, rate);
  for (let i = 0; i < length; i++) wind[i] *= 0.5 * (0.6 + 0.4 * Math.sin((2 * Math.PI * 0.05 * i) / rate + ch * 2));
  // Crickets: chirp trains around 4.5 kHz
  const crickets = 2 + Math.floor(rand() * 2);
  for (let c = 0; c < crickets; c++) {
    const f = 4200 + rand() * 900;
    const period = rate * (0.6 + rand() * 0.8);
    const amp = (0.03 + rand() * 0.03) * (ch === c % 2 ? 1 : 0.4);
    for (let start = Math.floor(rand() * period); start < length; start += period) {
      for (let pulse = 0; pulse < 3; pulse++) {
        const at = Math.floor(start + pulse * rate * 0.045);
        const dur = rate * 0.025;
        for (let j = 0; j < dur && at + j < length; j++) {
          wind[at + j] += Math.sin((2 * Math.PI * f * j) / rate) * amp * Math.sin((Math.PI * j) / dur);
        }
      }
    }
  }
  return wind;
}

function room(length: number, rate: number, rand: () => number): Float32Array {
  const air = noise(length, rand);
  lowpass(air, 2500, rate);
  highpass(air, 60, rate);
  // A faint mains hum gives the room some character
  for (let i = 0; i < length; i++) air[i] = air[i] * 0.5 + Math.sin((2 * Math.PI * 60 * i) / rate) * 0.015;
  return air;
}

function vinyl(length: number, rate: number, rand: () => number): Float32Array {
  const hiss = noise(length, rand);
  lowpass(hiss, 7000, rate);
  highpass(hiss, 1200, rate);
  for (let i = 0; i < length; i++) hiss[i] *= 0.12;
  const ticks = Math.floor((length / rate) * 22);
  for (let t = 0; t < ticks; t++) {
    const at = Math.floor(rand() * length);
    const amp = (rand() < 0.1 ? 0.8 : 0.25) * (rand() < 0.5 ? -1 : 1);
    const width = 4 + Math.floor(rand() * 12);
    for (let j = 0; j < width && at + j < length; j++) hiss[at + j] += amp * Math.exp(-j / (width / 3));
  }
  // Rotation thump at 33⅓ rpm
  const period = rate * 1.8;
  for (let i = 0; i < length; i++) {
    const phase = (i % period) / period;
    if (phase < 0.01) hiss[i] += Math.sin(phase * 100 * Math.PI) * 0.04;
  }
  return hiss;
}

const GENERATORS: Record<AmbienceKind, (length: number, rate: number, rand: () => number, ch: number) => Float32Array> =
  {
    rain,
    cafe,
    city,
    night,
    room,
    vinyl,
  };

const SEEDS: Record<AmbienceKind, number> = { rain: 11, cafe: 23, city: 37, night: 41, room: 53, vinyl: 67 };

/** Stereo looping bed for an ambience type, normalised to a consistent level. */
export function ambienceBuffer(ctx: BaseAudioContext, type: AmbienceKind): AudioBuffer {
  let byType = cache.get(ctx);
  if (!byType) {
    byType = new Map();
    cache.set(ctx, byType);
  }
  const cached = byType.get(type);
  if (cached) return cached;

  const rate = ctx.sampleRate;
  const raw = Math.floor(rate * SECONDS);
  const channels = [0, 1].map((ch) => {
    const rand = seeded(SEEDS[type] * 7919 + ch * 104729);
    return makeLoopable(GENERATORS[type](raw, rate, rand, ch), rate);
  });
  normalize(channels, 0.5);
  const buffer = ctx.createBuffer(2, channels[0].length, rate);
  channels.forEach((data, ch) => buffer.copyToChannel(data as Float32Array<ArrayBuffer>, ch));
  byType.set(type, buffer);
  return buffer;
}
