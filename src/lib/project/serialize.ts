/**
 * Compact, versioned project file format used for local storage, JSON export
 * and share links. Only active steps are stored, which keeps files small.
 */
import { z } from 'zod';
import { SCALE_IDS, type ChordType, type ScaleId } from '@/lib/music/theory';
import { clamp } from '@/lib/utils/math';
import { createId } from '@/lib/utils/id';
import { INSTRUMENTS, defaultParams, isInstrumentId } from './instruments';
import { createStep, defaultFx, nextPatternName, rootNoteFor } from './factory';
import {
  BPM_MAX,
  BPM_MIN,
  DELAY_DIVISIONS,
  MAX_CHAIN,
  MAX_PATTERNS,
  MAX_STEPS,
  MAX_TRACKS,
  PROJECT_VERSION,
  SWING_MAX,
  SWING_MIN,
  type MasterFx,
  type Pattern,
  type Project,
  type Step,
  type Track,
} from './types';

export const FILE_FORMAT = 'lofiloop';

/** [index, velocity 0-100, note, probability 0-100, ratchet, length] */
type Hit = [number, number, number, number, number, number];

const num = z.number().refine(Number.isFinite, 'must be a finite number');

const trackSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(80),
  instrument: z.string(),
  volume: num,
  pan: num,
  mute: z.boolean(),
  solo: z.boolean(),
  reverb: num.optional(),
  delay: num.optional(),
  chord: z.enum(['off', 'triad', 'seventh', 'ninth']).optional(),
  params: z.record(z.string(), num).optional(),
});

const hitSchema = z.array(num).min(1).max(6);

const patternSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(24),
  length: num,
  hits: z.record(z.string(), z.array(hitSchema).max(MAX_STEPS)),
});

const fxSchema = z
  .object({
    tone: num,
    crackle: num,
    wow: num,
    crush: num,
    drive: num,
    reverbSize: num,
    reverbMix: num,
    delayDivision: z.enum(DELAY_DIVISIONS),
    delayFeedback: num,
    delayMix: num,
    glue: num,
  })
  .partial();

const projectSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  name: z.string().max(120),
  bpm: num,
  swing: num,
  root: num,
  scale: z.string(),
  volume: num.optional(),
  tracks: z.array(trackSchema).max(MAX_TRACKS),
  patterns: z.array(patternSchema).min(1).max(MAX_PATTERNS),
  activePatternId: z.string().optional(),
  playMode: z.enum(['pattern', 'song']).optional(),
  chain: z.array(z.string()).max(MAX_CHAIN).optional(),
  fx: fxSchema.optional(),
  createdAt: num.optional(),
  updatedAt: num.optional(),
});

const fileSchema = z.object({
  format: z.literal(FILE_FORMAT),
  version: z.literal(PROJECT_VERSION),
  project: projectSchema,
});

export type ProjectFile = z.infer<typeof fileSchema>;

/** Hits past the pattern length are kept too, so shortening a pattern is reversible. */
function encodeHits(steps: Step[]): Hit[] {
  const hits: Hit[] = [];
  for (let i = 0; i < Math.min(MAX_STEPS, steps.length); i++) {
    const s = steps[i];
    if (!s.on) continue;
    hits.push([i, Math.round(s.vel * 100), s.note, Math.round(s.prob * 100), s.ratchet, s.len]);
  }
  return hits;
}

export function toProjectFile(project: Project): ProjectFile {
  return {
    format: FILE_FORMAT,
    version: PROJECT_VERSION,
    project: {
      id: project.id,
      name: project.name,
      bpm: project.bpm,
      swing: project.swing,
      root: project.root,
      scale: project.scale,
      volume: project.volume,
      tracks: project.tracks.map((t) => ({ ...t, params: { ...t.params } })),
      patterns: project.patterns.map((p) => ({
        id: p.id,
        name: p.name,
        length: p.length,
        hits: Object.fromEntries(project.tracks.map((t) => [t.id, encodeHits(p.steps[t.id] ?? [])])),
      })),
      activePatternId: project.activePatternId,
      playMode: project.playMode,
      chain: [...project.chain],
      fx: { ...project.fx },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  };
}

export function serializeProject(project: Project, pretty = false): string {
  return JSON.stringify(toProjectFile(project), null, pretty ? 2 : undefined);
}

export class ProjectParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectParseError';
  }
}

function normalizeTrack(raw: z.infer<typeof trackSchema>, usedIds: Set<string>): Track | null {
  if (!isInstrumentId(raw.instrument)) return null;
  const def = INSTRUMENTS[raw.instrument];
  const params = defaultParams(raw.instrument);
  for (const p of def.params) {
    const value = raw.params?.[p.id];
    if (typeof value === 'number') params[p.id] = clamp(value, p.min, p.max);
  }
  let id = raw.id;
  if (usedIds.has(id)) id = createId('t');
  usedIds.add(id);
  const chord: ChordType = def.polyphonic ? (raw.chord ?? 'off') : 'off';
  return {
    id,
    name: raw.name.trim() || def.name,
    instrument: raw.instrument,
    volume: clamp(raw.volume, 0, 1),
    pan: clamp(raw.pan, -1, 1),
    mute: raw.mute,
    solo: raw.solo,
    reverb: clamp(raw.reverb ?? 0, 0, 1),
    delay: clamp(raw.delay ?? 0, 0, 1),
    chord,
    params,
  };
}

function normalizeFx(raw: Partial<MasterFx> | undefined): MasterFx {
  const fx = { ...defaultFx(), ...raw };
  const unit = (v: number) => clamp(v, 0, 1);
  return {
    tone: unit(fx.tone),
    crackle: unit(fx.crackle),
    wow: unit(fx.wow),
    crush: unit(fx.crush),
    drive: unit(fx.drive),
    reverbSize: unit(fx.reverbSize),
    reverbMix: unit(fx.reverbMix),
    delayDivision: fx.delayDivision,
    delayFeedback: clamp(fx.delayFeedback, 0, 0.9),
    delayMix: unit(fx.delayMix),
    glue: unit(fx.glue),
  };
}

/** Parse and validate a project file (object or JSON string). Throws ProjectParseError. */
export function parseProjectFile(input: unknown): Project {
  let data = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      throw new ProjectParseError('The file is not valid JSON.');
    }
  }
  const result = fileSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path.length ? ` at "${issue.path.join('.')}"` : '';
    throw new ProjectParseError(`Not a valid LofiLoop project${where}: ${issue?.message ?? 'unknown error'}`);
  }
  const raw = result.data.project;
  const root = Math.round(clamp(raw.root, 0, 11));
  const scale = ((SCALE_IDS as string[]).includes(raw.scale) ? raw.scale : 'minor') as ScaleId;

  const usedTrackIds = new Set<string>();
  const trackIdMap = new Map<string, string>();
  const tracks: Track[] = [];
  for (const rawTrack of raw.tracks) {
    const track = normalizeTrack(rawTrack, usedTrackIds);
    if (!track) continue;
    trackIdMap.set(rawTrack.id, track.id);
    tracks.push(track);
  }

  const usedPatternIds = new Set<string>();
  const patterns: Pattern[] = [];
  for (const rawPattern of raw.patterns) {
    let id = rawPattern.id;
    if (usedPatternIds.has(id)) id = createId('p');
    usedPatternIds.add(id);
    const steps: Record<string, Step[]> = {};
    for (const [rawTrackId, trackId] of trackIdMap) {
      const track = tracks.find((t) => t.id === trackId)!;
      const def = INSTRUMENTS[track.instrument];
      const baseNote = rootNoteFor(track.instrument, root);
      const arr = Array.from({ length: MAX_STEPS }, () => createStep(baseNote));
      for (const hit of rawPattern.hits[rawTrackId] ?? []) {
        const index = Math.round(hit[0]);
        if (index < 0 || index >= MAX_STEPS) continue;
        arr[index] = {
          on: true,
          vel: clamp((hit[1] ?? 80) / 100, 0.05, 1),
          note: def.melodic ? Math.round(clamp(hit[2] ?? baseNote, 0, 127)) : baseNote,
          prob: clamp((hit[3] ?? 100) / 100, 0, 1),
          ratchet: Math.round(clamp(hit[4] ?? 1, 1, 4)),
          len: Math.round(clamp(hit[5] ?? 1, 1, 16)),
        };
      }
      steps[trackId] = arr;
    }
    patterns.push({
      id,
      name: rawPattern.name.trim() || nextPatternName(patterns),
      length: Math.round(clamp(rawPattern.length, 1, MAX_STEPS)),
      steps,
    });
  }

  const patternIds = new Set(patterns.map((p) => p.id));
  const chain = (raw.chain ?? []).filter((id) => patternIds.has(id));
  const activePatternId =
    raw.activePatternId && patternIds.has(raw.activePatternId) ? raw.activePatternId : patterns[0].id;
  const now = Date.now();

  return {
    version: PROJECT_VERSION,
    id: raw.id ?? createId('prj'),
    name: raw.name.trim() || 'Untitled beat',
    bpm: Math.round(clamp(raw.bpm, BPM_MIN, BPM_MAX)),
    swing: clamp(raw.swing, SWING_MIN, SWING_MAX),
    root,
    scale,
    volume: clamp(raw.volume ?? 0.8, 0, 1),
    tracks,
    patterns,
    activePatternId,
    playMode: raw.playMode ?? 'pattern',
    chain: chain.length ? chain : [patterns[0].id],
    fx: normalizeFx(raw.fx),
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}
