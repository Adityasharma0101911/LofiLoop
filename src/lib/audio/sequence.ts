/**
 * Pure timing and event logic shared by the realtime engine, the offline
 * renderer and the MIDI exporter so all three always agree.
 */
import { buildChord } from '@/lib/music/theory';
import type { Rng } from '@/lib/music/rng';
import { INSTRUMENTS, type InstrumentId } from '@/lib/project/instruments';
import type { Pattern, Project, Track } from '@/lib/project/types';

export interface NoteEvent {
  trackId: string;
  instrument: InstrumentId;
  /** Absolute start time in seconds */
  time: number;
  /** MIDI notes; a chord when the track has chord mode on */
  notes: number[];
  /** Step velocity 0..1 (track volume is applied by the mixer) */
  velocity: number;
  /** Gate length in seconds */
  duration: number;
  step: number;
}

export function stepDuration(bpm: number): number {
  return 60 / bpm / 4;
}

/** Delay applied to off-beat 16ths. 50% swing is straight, 66.7% is a triplet shuffle. */
export function swingOffset(stepIndex: number, bpm: number, swing: number): number {
  if (stepIndex % 2 === 0) return 0;
  return Math.max(0, (swing / 100) * 2 - 1) * stepDuration(bpm);
}

export function hasSolo(tracks: Track[]): boolean {
  return tracks.some((t) => t.solo);
}

export function isAudible(track: Track, anySolo: boolean): boolean {
  return !track.mute && (!anySolo || track.solo);
}

export function getPattern(project: Project, id: string): Pattern | undefined {
  return project.patterns.find((p) => p.id === id);
}

/** Pattern ids in playback order for song mode (unknown ids are skipped). */
export function songOrder(project: Project): string[] {
  const ids = new Set(project.patterns.map((p) => p.id));
  const order = project.chain.filter((id) => ids.has(id));
  return order.length ? order : [project.activePatternId];
}

export interface EventOptions {
  rng: Rng;
  /** Ignore mute/solo, e.g. when rendering stems. */
  includeMuted?: boolean;
  /** Only produce events for these track ids. */
  onlyTracks?: Set<string>;
}

/** All note events that start on `stepIndex` of `pattern`, scheduled at `stepTime` (pre-swing). */
export function eventsForStep(
  project: Project,
  pattern: Pattern,
  stepIndex: number,
  stepTime: number,
  { rng, includeMuted = false, onlyTracks }: EventOptions,
): NoteEvent[] {
  const events: NoteEvent[] = [];
  const dur = stepDuration(project.bpm);
  const time = stepTime + swingOffset(stepIndex, project.bpm, project.swing);
  const anySolo = hasSolo(project.tracks);

  for (const track of project.tracks) {
    if (onlyTracks && !onlyTracks.has(track.id)) continue;
    if (!includeMuted && !isAudible(track, anySolo)) continue;
    const step = pattern.steps[track.id]?.[stepIndex];
    if (!step?.on) continue;
    if (step.prob < 1 && rng() >= step.prob) continue;

    const def = INSTRUMENTS[track.instrument];
    const notes =
      def.melodic && def.polyphonic && track.chord !== 'off'
        ? buildChord(step.note, track.chord, project.root, project.scale)
        : [def.melodic ? step.note : def.defaultNote];
    const ratchet = Math.max(1, Math.min(4, Math.round(step.ratchet)));

    if (ratchet === 1) {
      events.push({
        trackId: track.id,
        instrument: track.instrument,
        time,
        notes,
        velocity: step.vel,
        duration: def.melodic ? Math.max(1, step.len) * dur * 0.95 : dur,
        step: stepIndex,
      });
      continue;
    }

    const sub = dur / ratchet;
    for (let r = 0; r < ratchet; r++) {
      events.push({
        trackId: track.id,
        instrument: track.instrument,
        time: time + r * sub,
        notes,
        velocity: Math.max(0.05, step.vel * (1 - r * 0.1)),
        duration: sub * 0.9,
        step: stepIndex,
      });
    }
  }
  return events;
}

export interface PatternSlot {
  pattern: Pattern;
  /** Offset in seconds from the start of the render */
  start: number;
}

/** Sequence of patterns to render for export. */
export function renderSlots(project: Project, mode: 'pattern' | 'song', repeats: number): PatternSlot[] {
  const dur = stepDuration(project.bpm);
  const ids =
    mode === 'song' ? songOrder(project) : [getPattern(project, project.activePatternId)?.id ?? project.patterns[0].id];
  const slots: PatternSlot[] = [];
  let t = 0;
  for (let r = 0; r < Math.max(1, repeats); r++) {
    for (const id of ids) {
      const pattern = getPattern(project, id);
      if (!pattern) continue;
      slots.push({ pattern, start: t });
      t += pattern.length * dur;
    }
  }
  return slots;
}

export function slotsDuration(project: Project, slots: PatternSlot[]): number {
  if (!slots.length) return 0;
  const last = slots[slots.length - 1];
  return last.start + last.pattern.length * stepDuration(project.bpm);
}

/** Collect every event for a render/export pass. */
export function collectEvents(project: Project, slots: PatternSlot[], options: EventOptions, offset = 0): NoteEvent[] {
  const dur = stepDuration(project.bpm);
  const events: NoteEvent[] = [];
  for (const slot of slots) {
    for (let i = 0; i < slot.pattern.length; i++) {
      events.push(...eventsForStep(project, slot.pattern, i, offset + slot.start + i * dur, options));
    }
  }
  return events;
}
