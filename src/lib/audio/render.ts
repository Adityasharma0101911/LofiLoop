/** Offline (faster than realtime) rendering through the exact same mixer and voices as playback. */
import { createRng } from '@/lib/music/rng';
import type { Project, Track } from '@/lib/project/types';
import { Mixer } from './mixer';
import { VoicePlayer } from './player';
import { collectEvents, renderSlots, slotsDuration, type NoteEvent } from './sequence';

export type RenderMode = 'pattern' | 'song';

export interface RenderOptions {
  mode: RenderMode;
  /** How many times to repeat the pattern / song */
  repeats: number;
  sampleRate?: 44100 | 48000;
  /** Let reverb and delay ring out after the last bar */
  tail?: boolean;
  seed?: number;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

const LEAD_IN = 0.02;
const TAIL_SECONDS = 3;
/** Schedule notes in windows so long songs don't allocate every node up front. */
const WINDOW_SECONDS = 4;

export function renderLength(project: Project, mode: RenderMode, repeats: number, tail = true): number {
  const slots = renderSlots(project, mode, repeats);
  return LEAD_IN + slotsDuration(project, slots) + (tail ? TAIL_SECONDS : 0.05);
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
}

async function renderEvents(
  project: Project,
  events: NoteEvent[],
  seconds: number,
  sampleRate: number,
  options: Pick<RenderOptions, 'onProgress' | 'signal'>,
  crackle = true,
): Promise<AudioBuffer> {
  throwIfAborted(options.signal);
  const frames = Math.ceil(seconds * sampleRate);
  const ctx = new OfflineAudioContext(2, frames, sampleRate);
  const mixProject = crackle ? project : { ...project, fx: { ...project.fx, crackle: 0 } };
  const mixer = new Mixer(ctx, ctx.destination, { realtime: false });
  mixer.sync(mixProject);
  mixer.setTransportActive(true, 0);
  const player = new VoicePlayer(ctx, mixer);
  const trackMap = new Map(project.tracks.map((t) => [t.id, t]));
  const sorted = [...events].sort((a, b) => a.time - b.time);

  let cursor = 0;
  const scheduleUntil = (limit: number) => {
    while (cursor < sorted.length && sorted[cursor].time < limit) {
      const event = sorted[cursor++];
      player.trigger(mixProject, event, trackMap.get(event.trackId));
    }
  };

  const canSuspend = typeof ctx.suspend === 'function';
  if (canSuspend && seconds > WINDOW_SECONDS * 1.5) {
    // Suspend every half window and top up the schedule, keeping ~2s of notes queued ahead.
    scheduleUntil(WINDOW_SECONDS);
    for (let t = WINDOW_SECONDS / 2; t < seconds - 0.1; t += WINDOW_SECONDS / 2) {
      const at = t;
      ctx
        .suspend(at)
        .then(() => {
          options.onProgress?.(Math.min(0.99, at / seconds));
          if (options.signal?.aborted) {
            // Stop scheduling; the render finishes quickly with silence and is discarded below.
            cursor = sorted.length;
          } else {
            scheduleUntil(at + WINDOW_SECONDS);
          }
          return ctx.resume();
        })
        .catch(() => undefined);
    }
  } else {
    scheduleUntil(Infinity);
  }

  const buffer = await ctx.startRendering();
  throwIfAborted(options.signal);
  options.onProgress?.(1);
  return buffer;
}

/** Render the full mix. */
export async function renderMix(project: Project, options: RenderOptions): Promise<AudioBuffer> {
  const sampleRate = options.sampleRate ?? 44100;
  const slots = renderSlots(project, options.mode, options.repeats);
  const events = collectEvents(project, slots, { rng: createRng(options.seed ?? 7) }, LEAD_IN);
  const seconds = renderLength(project, options.mode, options.repeats, options.tail ?? true);
  return renderEvents(project, events, seconds, sampleRate, options);
}

export interface Stem {
  track: Track;
  buffer: AudioBuffer;
}

/** Render every audible track on its own (with its sends), for mixing elsewhere. */
export async function renderStems(project: Project, options: RenderOptions): Promise<Stem[]> {
  const sampleRate = options.sampleRate ?? 44100;
  const slots = renderSlots(project, options.mode, options.repeats);
  const seconds = renderLength(project, options.mode, options.repeats, options.tail ?? true);
  const anySolo = project.tracks.some((t) => t.solo);
  const tracks = project.tracks.filter((t) => !t.mute && (!anySolo || t.solo));
  // Roll probabilities once for the whole mix so the stems sum to the same performance.
  const allEvents = collectEvents(project, slots, { rng: createRng(options.seed ?? 7) }, LEAD_IN);
  const stems: Stem[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const soloProject: Project = {
      ...project,
      tracks: project.tracks.map((t) => ({ ...t, mute: t.id !== track.id, solo: false })),
    };
    const buffer = await renderEvents(
      soloProject,
      allEvents.filter((e) => e.trackId === track.id),
      seconds,
      sampleRate,
      {
        signal: options.signal,
        onProgress: (p) => options.onProgress?.((i + p) / tracks.length),
      },
      false,
    );
    stems.push({ track, buffer });
  }
  options.onProgress?.(1);
  return stems;
}
