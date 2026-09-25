/**
 * Turns NoteEvents into voices: applies track params, chord splitting,
 * monophonic retriggering with glide and hi-hat style choke groups.
 * Used by both the live engine and the offline renderer.
 */
import { INSTRUMENTS } from '@/lib/project/instruments';
import type { Project, Track } from '@/lib/project/types';
import { VOICES, type Voice } from './instruments';
import type { Mixer } from './mixer';
import type { NoteEvent } from './sequence';

interface HeldVoice {
  voice: Voice;
  note: number;
}

export class VoicePlayer {
  private readonly mono = new Map<string, HeldVoice>();
  private readonly chokes = new Map<string, Voice>();
  private active: Voice[] = [];

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly mixer: Mixer,
  ) {}

  trigger(project: Project, event: NoteEvent, track?: Track): void {
    const t = track ?? project.tracks.find((tr) => tr.id === event.trackId);
    if (!t) return;
    const destination = this.mixer.input(t.id);
    if (!destination) return;
    this.play(t, event, destination);
  }

  /** Play a track's instrument outside the sequence, e.g. when auditioning a step. */
  preview(track: Track, event: NoteEvent, destination?: AudioNode): void {
    const target = destination ?? this.mixer.input(track.id) ?? this.mixer.previewInput;
    this.play(track, event, target);
  }

  /** Fade out everything that is still sounding (transport stop). */
  stopAll(time: number): void {
    for (const voice of this.active) voice.stop(time);
    this.active = [];
    this.mono.clear();
    this.chokes.clear();
  }

  private play(track: Track, event: NoteEvent, destination: AudioNode) {
    const def = INSTRUMENTS[track.instrument];
    const voiceFn = VOICES[track.instrument];
    const { time } = event;

    if (def.chokeGroup) {
      this.chokes.get(def.chokeGroup)?.stop(time);
    }

    let glideFrom: number | undefined;
    if (def.mono) {
      const held = this.mono.get(track.id);
      if (held && held.voice.end > time) {
        glideFrom = held.note;
        held.voice.stop(time);
      }
    }

    // Keep chords from clipping: scale by 1/sqrt(n).
    const chordScale = 1 / Math.sqrt(event.notes.length);
    const notes = def.mono ? event.notes.slice(0, 1) : event.notes;
    for (const note of notes) {
      const voice = voiceFn(
        this.ctx,
        destination,
        {
          time,
          note,
          velocity: event.velocity * (notes.length > 1 ? chordScale * 1.2 : 1),
          duration: event.duration,
          glideFrom,
        },
        track.params,
      );
      this.active.push(voice);
      if (def.mono) this.mono.set(track.id, { voice, note });
      if (def.chokeGroup) this.chokes.set(def.chokeGroup, voice);
    }
    this.prune(time);
  }

  private prune(now: number) {
    if (this.active.length < 256) return;
    this.active = this.active.filter((v) => v.end > now);
  }
}
