import type { ChordType, ScaleId } from '@/lib/music/theory';
import type { InstrumentId } from './instruments';

export const PROJECT_VERSION = 2;
/** Steps are always stored at full capacity; `Pattern.length` decides how many play. */
export const MAX_STEPS = 64;
export const PATTERN_LENGTHS = [8, 12, 16, 24, 32, 48, 64] as const;
export const MAX_TRACKS = 16;
export const MAX_PATTERNS = 8;
export const MAX_CHAIN = 64;
export const BPM_MIN = 40;
export const BPM_MAX = 220;
export const SWING_MIN = 50;
export const SWING_MAX = 75;

export interface Step {
  on: boolean;
  /** Velocity 0..1 */
  vel: number;
  /** MIDI note; ignored by drum instruments. */
  note: number;
  /** Chance the step plays, 0..1 */
  prob: number;
  /** Number of evenly spaced retriggers within the step, 1..4 */
  ratchet: number;
  /** Gate length in steps for melodic instruments, 1..16 */
  len: number;
}

export interface Track {
  id: string;
  name: string;
  instrument: InstrumentId;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  /** Send levels 0..1 */
  reverb: number;
  delay: number;
  chord: ChordType;
  params: Record<string, number>;
}

export interface Pattern {
  id: string;
  name: string;
  length: number;
  /** Keyed by track id, each array is MAX_STEPS long. */
  steps: Record<string, Step[]>;
}

export const DELAY_DIVISIONS = ['1/4', '1/8d', '1/8', '1/8t', '1/16'] as const;
export type DelayDivision = (typeof DELAY_DIVISIONS)[number];

export interface MasterFx {
  /** Low-pass "tape" tone, 0 = dark, 1 = open */
  tone: number;
  crackle: number;
  wow: number;
  /** Bit crushing, 0 = off */
  crush: number;
  drive: number;
  reverbSize: number;
  reverbMix: number;
  delayDivision: DelayDivision;
  delayFeedback: number;
  delayMix: number;
  /** Bus compression amount */
  glue: number;
}

export type PlayMode = 'pattern' | 'song';

export interface Project {
  version: typeof PROJECT_VERSION;
  id: string;
  name: string;
  bpm: number;
  /** MPC-style swing percentage, 50 = straight, ~66 = triplet feel */
  swing: number;
  /** Root pitch class 0..11 */
  root: number;
  scale: ScaleId;
  volume: number;
  tracks: Track[];
  patterns: Pattern[];
  activePatternId: string;
  playMode: PlayMode;
  /** Song arrangement as a list of pattern ids */
  chain: string[];
  fx: MasterFx;
  createdAt: number;
  updatedAt: number;
}
