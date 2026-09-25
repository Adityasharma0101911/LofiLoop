import { createId } from '@/lib/utils/id';
import type { ChordType, ScaleId } from '@/lib/music/theory';
import { defaultParams, getInstrument, type InstrumentId } from './instruments';
import { MAX_STEPS, PROJECT_VERSION, type MasterFx, type Pattern, type Project, type Step, type Track } from './types';

export const PATTERN_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function createStep(note = 60, overrides: Partial<Step> = {}): Step {
  return { on: false, vel: 0.8, note, prob: 1, ratchet: 1, len: 1, ...overrides };
}

export function createSteps(note = 60): Step[] {
  return Array.from({ length: MAX_STEPS }, () => createStep(note));
}

/** Default note for an instrument, transposed to the project's key. */
export function rootNoteFor(instrument: InstrumentId, root: number): number {
  const def = getInstrument(instrument);
  if (!def.melodic) return def.defaultNote;
  const base = def.defaultNote - (def.defaultNote % 12);
  const note = base + root;
  return note > def.noteRange[1] ? note - 12 : note;
}

export interface TrackOptions {
  name?: string;
  volume?: number;
  pan?: number;
  reverb?: number;
  delay?: number;
  chord?: ChordType;
  params?: Record<string, number>;
}

export function createTrack(instrument: InstrumentId, options: TrackOptions = {}): Track {
  const def = getInstrument(instrument);
  return {
    id: createId('t'),
    name: options.name ?? def.name,
    instrument,
    volume: options.volume ?? 0.8,
    pan: options.pan ?? 0,
    mute: false,
    solo: false,
    reverb: options.reverb ?? (def.category === 'drums' ? 0.08 : 0.25),
    delay: options.delay ?? 0,
    chord: options.chord ?? 'off',
    params: { ...defaultParams(instrument), ...options.params },
  };
}

export function createPattern(name: string, tracks: Track[], root: number, length = 16): Pattern {
  const steps: Record<string, Step[]> = {};
  for (const track of tracks) steps[track.id] = createSteps(rootNoteFor(track.instrument, root));
  return { id: createId('p'), name, length, steps };
}

export function nextPatternName(patterns: Pattern[]): string {
  const used = new Set(patterns.map((p) => p.name));
  return PATTERN_NAMES.find((n) => !used.has(n)) ?? `P${patterns.length + 1}`;
}

export function defaultFx(): MasterFx {
  return {
    tone: 0.7,
    crackle: 0.25,
    wow: 0.2,
    crush: 0,
    drive: 0.2,
    reverbSize: 0.5,
    reverbMix: 0.35,
    delayDivision: '1/8d',
    delayFeedback: 0.35,
    delayMix: 0.25,
    glue: 0.4,
  };
}

export interface ProjectOptions {
  name?: string;
  bpm?: number;
  swing?: number;
  root?: number;
  scale?: ScaleId;
  tracks?: Track[];
  fx?: Partial<MasterFx>;
}

export function createProject(options: ProjectOptions = {}): Project {
  const root = options.root ?? 0;
  const tracks =
    options.tracks ?? (['kick', 'snare', 'hat', 'keys', 'bass'] as InstrumentId[]).map((id) => createTrack(id));
  const pattern = createPattern('A', tracks, root);
  const now = Date.now();
  return {
    version: PROJECT_VERSION,
    id: createId('prj'),
    name: options.name ?? 'Untitled beat',
    bpm: options.bpm ?? 84,
    swing: options.swing ?? 58,
    root,
    scale: options.scale ?? 'minor',
    volume: 0.8,
    tracks,
    patterns: [pattern],
    activePatternId: pattern.id,
    playMode: 'pattern',
    chain: [pattern.id],
    fx: { ...defaultFx(), ...options.fx },
    createdAt: now,
    updatedAt: now,
  };
}
