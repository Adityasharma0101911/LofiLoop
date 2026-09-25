/**
 * Project state with undo/redo. Every mutation goes through `update`, which
 * uses immer for structural sharing so history snapshots stay cheap.
 */
import { produce, type Draft } from 'immer';
import { create } from 'zustand';
import { snapToScale, type ChordType, type ScaleId } from '@/lib/music/theory';
import { clamp } from '@/lib/utils/math';
import { createId } from '@/lib/utils/id';
import { INSTRUMENTS, defaultParams, type InstrumentId } from '@/lib/project/instruments';
import {
  createPattern,
  createSteps,
  createTrack,
  nextPatternName,
  rootNoteFor,
} from '@/lib/project/factory';
import {
  BPM_MAX,
  BPM_MIN,
  MAX_CHAIN,
  MAX_PATTERNS,
  MAX_STEPS,
  MAX_TRACKS,
  SWING_MAX,
  SWING_MIN,
  type MasterFx,
  type Pattern,
  type PlayMode,
  type Project,
  type Step,
  type Track,
} from '@/lib/project/types';

const HISTORY_LIMIT = 150;
const COALESCE_MS = 800;

export interface UpdateOptions {
  /** false: don't record (selection, view state). Default true. */
  history?: boolean;
  /** Consecutive updates with the same key merge into one undo step (knob drags). */
  coalesce?: string;
}

interface StudioState {
  project: Project;
  past: Project[];
  future: Project[];
  coalesceKey: string | null;
  coalesceAt: number;

  update: (recipe: (draft: Draft<Project>) => void, options?: UpdateOptions) => void;
  undo: () => void;
  redo: () => void;
  /** Replace the whole project (open, import, template). Clears history. */
  load: (project: Project) => void;
}

export const useStudio = create<StudioState>()((set, get) => ({
  project: null as unknown as Project,
  past: [],
  future: [],
  coalesceKey: null,
  coalesceAt: 0,

  update: (recipe, options = {}) => {
    const { project, past, coalesceKey, coalesceAt } = get();
    const next = produce(project, (draft) => {
      recipe(draft);
    });
    if (next === project) return;
    const record = options.history !== false;
    if (!record) {
      set({ project: next });
      return;
    }
    const stamped = produce(next, (draft) => {
      draft.updatedAt = Date.now();
    });
    const now = Date.now();
    const merge = options.coalesce !== undefined && options.coalesce === coalesceKey && now - coalesceAt < COALESCE_MS;
    set({
      project: stamped,
      past: merge ? past : [...past, project].slice(-HISTORY_LIMIT),
      future: [],
      coalesceKey: options.coalesce ?? null,
      coalesceAt: now,
    });
  },

  undo: () => {
    const { past, project, future } = get();
    const previous = past[past.length - 1];
    if (!previous) return;
    set({
      project: keepSelection(previous, project),
      past: past.slice(0, -1),
      future: [project, ...future].slice(0, HISTORY_LIMIT),
      coalesceKey: null,
    });
  },

  redo: () => {
    const { past, project, future } = get();
    const next = future[0];
    if (!next) return;
    set({
      project: keepSelection(next, project),
      past: [...past, project].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      coalesceKey: null,
    });
  },

  load: (project) => set({ project, past: [], future: [], coalesceKey: null }),
}));

/** Undo shouldn't yank the view to another pattern unless the pattern no longer exists. */
function keepSelection(target: Project, current: Project): Project {
  if (target.activePatternId === current.activePatternId) return target;
  if (!target.patterns.some((p) => p.id === current.activePatternId)) return target;
  return { ...target, activePatternId: current.activePatternId };
}

// ---------------------------------------------------------------------------
// Selectors

export const selectActivePattern = (s: { project: Project }): Pattern =>
  s.project.patterns.find((p) => p.id === s.project.activePatternId) ?? s.project.patterns[0];

export function getProject(): Project {
  return useStudio.getState().project;
}

// ---------------------------------------------------------------------------
// Actions

const update = (recipe: (draft: Draft<Project>) => void, options?: UpdateOptions) =>
  useStudio.getState().update(recipe, options);

function activePattern(draft: Draft<Project>): Draft<Pattern> {
  return draft.patterns.find((p) => p.id === draft.activePatternId) ?? draft.patterns[0];
}

function findTrack(draft: Draft<Project>, trackId: string): Draft<Track> | undefined {
  return draft.tracks.find((t) => t.id === trackId);
}

export const actions = {
  undo: () => useStudio.getState().undo(),
  redo: () => useStudio.getState().redo(),
  load: (project: Project) => useStudio.getState().load(project),

  // --- project settings ---
  setName: (name: string) =>
    update((d) => {
      d.name = name.slice(0, 120);
    }, { coalesce: 'name' }),
  setBpm: (bpm: number) =>
    update((d) => {
      d.bpm = Math.round(clamp(bpm, BPM_MIN, BPM_MAX));
    }, { coalesce: 'bpm' }),
  setSwing: (swing: number) =>
    update((d) => {
      d.swing = clamp(swing, SWING_MIN, SWING_MAX);
    }, { coalesce: 'swing' }),
  setVolume: (volume: number) =>
    update((d) => {
      d.volume = clamp(volume, 0, 1);
    }, { coalesce: 'volume' }),
  /** Change key; optionally transpose every melodic note along with it. */
  setKey: (root: number, scale: ScaleId, transpose = true) =>
    update((d) => {
      const shift = ((root - d.root + 18) % 12) - 6;
      if (transpose) {
        for (const pattern of d.patterns) {
          for (const track of d.tracks) {
            const def = INSTRUMENTS[track.instrument];
            if (!def.melodic) continue;
            for (const step of pattern.steps[track.id] ?? []) {
              const moved = clamp(step.note + shift, 0, 127);
              step.note = snapToScale(moved, root, scale);
            }
          }
        }
      }
      d.root = root;
      d.scale = scale;
    }),
  setPlayMode: (mode: PlayMode) =>
    update((d) => {
      d.playMode = mode;
    }, { history: false }),
  setFx: (fx: Partial<MasterFx>, coalesce?: string) =>
    update((d) => {
      Object.assign(d.fx, fx);
    }, { coalesce: coalesce ?? `fx:${Object.keys(fx).join(',')}` }),

  // --- patterns ---
  selectPattern: (id: string) =>
    update((d) => {
      if (d.patterns.some((p) => p.id === id)) d.activePatternId = id;
    }, { history: false }),
  addPattern: (copyFrom?: string) => {
    let created: string | null = null;
    update((d) => {
      if (d.patterns.length >= MAX_PATTERNS) return;
      const source = copyFrom ? d.patterns.find((p) => p.id === copyFrom) : undefined;
      const pattern = createPattern(nextPatternName(d.patterns), d.tracks, d.root, source?.length ?? activePattern(d).length);
      if (source) {
        for (const track of d.tracks) {
          pattern.steps[track.id] = (source.steps[track.id] ?? []).map((s) => ({ ...s }));
        }
      }
      const index = d.patterns.findIndex((p) => p.id === (copyFrom ?? d.activePatternId));
      d.patterns.splice(index + 1, 0, pattern);
      d.activePatternId = pattern.id;
      created = pattern.id;
    });
    return created;
  },
  removePattern: (id: string) =>
    update((d) => {
      if (d.patterns.length <= 1) return;
      const index = d.patterns.findIndex((p) => p.id === id);
      if (index < 0) return;
      d.patterns.splice(index, 1);
      d.chain = d.chain.filter((pid) => pid !== id);
      if (!d.chain.length) d.chain.push(d.patterns[0].id);
      if (d.activePatternId === id) d.activePatternId = d.patterns[Math.max(0, index - 1)].id;
    }),
  renamePattern: (id: string, name: string) =>
    update((d) => {
      const p = d.patterns.find((x) => x.id === id);
      if (p) p.name = name.slice(0, 24) || p.name;
    }),
  setPatternLength: (id: string, length: number) =>
    update((d) => {
      const p = d.patterns.find((x) => x.id === id);
      if (p) p.length = Math.round(clamp(length, 1, MAX_STEPS));
    }),
  /** Copy the first `from` steps across the rest of the pattern, e.g. 16 → 32. */
  extendPattern: (id: string, length: number) =>
    update((d) => {
      const p = d.patterns.find((x) => x.id === id);
      if (!p) return;
      const from = p.length;
      const to = Math.round(clamp(length, 1, MAX_STEPS));
      for (const track of d.tracks) {
        const steps = p.steps[track.id];
        if (!steps) continue;
        for (let i = from; i < to; i++) steps[i] = { ...steps[i % from] };
      }
      p.length = to;
    }),
  clearPattern: (id: string) =>
    update((d) => {
      const p = d.patterns.find((x) => x.id === id);
      if (!p) return;
      for (const track of d.tracks) {
        const note = rootNoteFor(track.instrument, d.root);
        for (const step of p.steps[track.id] ?? []) {
          step.on = false;
          step.note = note;
        }
      }
    }),
  pastePattern: (id: string, data: Record<string, Step[]>) =>
    update((d) => {
      const p = d.patterns.find((x) => x.id === id);
      if (!p) return;
      for (const track of d.tracks) {
        const src = data[track.id];
        if (src) p.steps[track.id] = src.map((s) => ({ ...s }));
      }
    }),

  // --- song chain ---
  appendToChain: (patternId: string) =>
    update((d) => {
      if (d.chain.length < MAX_CHAIN) d.chain.push(patternId);
    }),
  removeFromChain: (index: number) =>
    update((d) => {
      if (d.chain.length > 1) d.chain.splice(index, 1);
    }),
  setChainItem: (index: number, patternId: string) =>
    update((d) => {
      if (index >= 0 && index < d.chain.length) d.chain[index] = patternId;
    }),
  moveChainItem: (from: number, to: number) =>
    update((d) => {
      if (from === to || from < 0 || to < 0 || from >= d.chain.length || to >= d.chain.length) return;
      const [item] = d.chain.splice(from, 1);
      d.chain.splice(to, 0, item);
    }),

  // --- tracks ---
  addTrack: (instrument: InstrumentId) => {
    let created: string | null = null;
    update((d) => {
      if (d.tracks.length >= MAX_TRACKS) return;
      const track = createTrack(instrument);
      d.tracks.push(track);
      for (const p of d.patterns) p.steps[track.id] = createSteps(rootNoteFor(instrument, d.root));
      created = track.id;
    });
    return created;
  },
  removeTrack: (trackId: string) =>
    update((d) => {
      const index = d.tracks.findIndex((t) => t.id === trackId);
      if (index < 0) return;
      d.tracks.splice(index, 1);
      for (const p of d.patterns) delete p.steps[trackId];
    }),
  duplicateTrack: (trackId: string) => {
    let created: string | null = null;
    update((d) => {
      if (d.tracks.length >= MAX_TRACKS) return;
      const index = d.tracks.findIndex((t) => t.id === trackId);
      if (index < 0) return;
      const source = d.tracks[index];
      const copy: Track = { ...source, params: { ...source.params }, id: createId('t'), name: `${source.name} 2`, solo: false };
      d.tracks.splice(index + 1, 0, copy);
      for (const p of d.patterns) p.steps[copy.id] = (p.steps[trackId] ?? []).map((s) => ({ ...s }));
      created = copy.id;
    });
    return created;
  },
  moveTrack: (from: number, to: number) =>
    update((d) => {
      if (from === to || from < 0 || to < 0 || from >= d.tracks.length || to >= d.tracks.length) return;
      const [track] = d.tracks.splice(from, 1);
      d.tracks.splice(to, 0, track);
    }),
  updateTrack: (trackId: string, patch: Partial<Pick<Track, 'name' | 'volume' | 'pan' | 'reverb' | 'delay'>>) =>
    update((d) => {
      const t = findTrack(d, trackId);
      if (!t) return;
      if (patch.name !== undefined) t.name = patch.name.slice(0, 80);
      if (patch.volume !== undefined) t.volume = clamp(patch.volume, 0, 1);
      if (patch.pan !== undefined) t.pan = clamp(patch.pan, -1, 1);
      if (patch.reverb !== undefined) t.reverb = clamp(patch.reverb, 0, 1);
      if (patch.delay !== undefined) t.delay = clamp(patch.delay, 0, 1);
    }, { coalesce: `track:${trackId}:${Object.keys(patch).join(',')}` }),
  toggleMute: (trackId: string) =>
    update((d) => {
      const t = findTrack(d, trackId);
      if (t) t.mute = !t.mute;
    }),
  toggleSolo: (trackId: string, exclusive = false) =>
    update((d) => {
      const t = findTrack(d, trackId);
      if (!t) return;
      const next = !t.solo;
      if (exclusive) for (const other of d.tracks) other.solo = false;
      t.solo = next;
    }),
  setChord: (trackId: string, chord: ChordType) =>
    update((d) => {
      const t = findTrack(d, trackId);
      if (t && INSTRUMENTS[t.instrument].polyphonic) t.chord = chord;
    }),
  setParam: (trackId: string, key: string, value: number) =>
    update((d) => {
      const t = findTrack(d, trackId);
      if (!t) return;
      const def = INSTRUMENTS[t.instrument].params.find((p) => p.id === key);
      if (def) t.params[key] = clamp(value, def.min, def.max);
    }, { coalesce: `param:${trackId}:${key}` }),
  resetParams: (trackId: string) =>
    update((d) => {
      const t = findTrack(d, trackId);
      if (t) t.params = defaultParams(t.instrument);
    }),
  changeInstrument: (trackId: string, instrument: InstrumentId) =>
    update((d) => {
      const t = findTrack(d, trackId);
      if (!t || t.instrument === instrument) return;
      const oldDef = INSTRUMENTS[t.instrument];
      const newDef = INSTRUMENTS[instrument];
      if (t.name === oldDef.name) t.name = newDef.name;
      t.instrument = instrument;
      t.params = defaultParams(instrument);
      if (!newDef.polyphonic) t.chord = 'off';
      const base = rootNoteFor(instrument, d.root);
      for (const p of d.patterns) {
        for (const step of p.steps[t.id] ?? []) {
          if (!newDef.melodic || !oldDef.melodic) {
            step.note = base;
            continue;
          }
          // Keep melodies, just move them into the new instrument's range.
          let note = step.note;
          while (note < newDef.noteRange[0]) note += 12;
          while (note > newDef.noteRange[1]) note -= 12;
          step.note = note;
        }
      }
    }),

  // --- steps (active pattern unless a pattern id is given) ---
  toggleStep: (trackId: string, index: number) =>
    update((d) => {
      const step = activePattern(d).steps[trackId]?.[index];
      if (step) step.on = !step.on;
    }),
  setStepsOn: (trackId: string, indices: number[], on: boolean) =>
    update((d) => {
      const steps = activePattern(d).steps[trackId];
      if (!steps) return;
      for (const i of indices) if (steps[i]) steps[i].on = on;
    }, { coalesce: `paint:${trackId}` }),
  setStep: (trackId: string, index: number, patch: Partial<Step>, coalesce?: string) =>
    update((d) => {
      const step = activePattern(d).steps[trackId]?.[index];
      if (!step) return;
      if (patch.on !== undefined) step.on = patch.on;
      if (patch.vel !== undefined) step.vel = clamp(patch.vel, 0.05, 1);
      if (patch.note !== undefined) step.note = Math.round(clamp(patch.note, 0, 127));
      if (patch.prob !== undefined) step.prob = clamp(patch.prob, 0, 1);
      if (patch.ratchet !== undefined) step.ratchet = Math.round(clamp(patch.ratchet, 1, 4));
      if (patch.len !== undefined) step.len = Math.round(clamp(patch.len, 1, 16));
    }, { coalesce }),
  setTrackSteps: (trackId: string, steps: Step[], patternId?: string) =>
    update((d) => {
      const p = patternId ? d.patterns.find((x) => x.id === patternId) : activePattern(d);
      if (!p || !p.steps[trackId]) return;
      p.steps[trackId] = steps.slice(0, MAX_STEPS).map((s) => ({ ...s }));
    }),
  setManySteps: (data: Record<string, Step[]>, patternId?: string) =>
    update((d) => {
      const p = patternId ? d.patterns.find((x) => x.id === patternId) : activePattern(d);
      if (!p) return;
      for (const [trackId, steps] of Object.entries(data)) {
        if (p.steps[trackId]) p.steps[trackId] = steps.slice(0, MAX_STEPS).map((s) => ({ ...s }));
      }
    }),
  clearTrack: (trackId: string) =>
    update((d) => {
      const t = findTrack(d, trackId);
      if (!t) return;
      const note = rootNoteFor(t.instrument, d.root);
      for (const step of activePattern(d).steps[trackId] ?? []) {
        step.on = false;
        step.note = note;
      }
    }),
};
