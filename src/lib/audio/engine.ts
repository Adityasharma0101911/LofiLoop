/**
 * Realtime playback engine. A worker-driven lookahead scheduler reads the
 * latest project on every tick, so edits (steps, tempo, mutes) are heard
 * immediately without restarting playback.
 */
import { INSTRUMENTS } from '@/lib/project/instruments';
import type { Project, Track } from '@/lib/project/types';
import { Mixer } from './mixer';
import { VoicePlayer } from './player';
import { eventsForStep, getPattern, songOrder, stepDuration } from './sequence';

const TICK_MS = 25;
const LOOKAHEAD = 0.12;
const START_DELAY = 0.06;

export interface Playhead {
  playing: boolean;
  patternId: string | null;
  step: number;
  /** Index into the song chain (song mode) */
  chainIndex: number;
}

const IDLE: Playhead = { playing: false, patternId: null, step: -1, chainIndex: -1 };

interface QueuedStep {
  time: number;
  patternId: string;
  step: number;
  chainIndex: number;
}

type Listener = () => void;

class Ticker {
  private worker: Worker | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly onTick: () => void) {}

  start() {
    this.stop();
    try {
      if (!this.worker) {
        const source = `let id=null;onmessage=(e)=>{clearInterval(id);id=null;if(e.data==='start'){id=setInterval(()=>postMessage(0),${TICK_MS});}};`;
        const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        this.worker = new Worker(url);
        URL.revokeObjectURL(url);
        this.worker.onmessage = () => this.onTick();
      }
      this.worker.postMessage('start');
    } catch {
      // Workers can be blocked (CSP, old browsers); fall back to a main-thread timer.
      this.worker = null;
      this.interval = setInterval(this.onTick, TICK_MS);
    }
  }

  stop() {
    this.worker?.postMessage('stop');
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private mixer: Mixer | null = null;
  private player: VoicePlayer | null = null;
  private readonly ticker = new Ticker(() => this.schedule());
  private getProject: (() => Project) | null = null;

  private playing = false;
  /** Incremented on every play/stop so a slow context resume can't start a stale session. */
  private session = 0;
  private nextStepTime = 0;
  private stepIndex = 0;
  private patternId = '';
  private chainIndex = 0;
  private metronome = false;
  private queue: QueuedStep[] = [];
  private raf = 0;

  private playhead: Playhead = IDLE;
  private readonly listeners = new Set<Listener>();

  /** Connect the engine to the app state. Safe to call more than once. */
  attach(getProject: () => Project): void {
    this.getProject = getProject;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get analyser(): AnalyserNode | null {
    return this.mixer?.analyser ?? null;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  trackAnalyser(trackId: string): AnalyserNode | undefined {
    return this.mixer?.trackAnalyser(trackId);
  }

  // --- playhead store (useSyncExternalStore) ---

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getPlayhead = (): Playhead => this.playhead;

  getServerPlayhead = (): Playhead => IDLE;

  private setPlayhead(next: Playhead) {
    const prev = this.playhead;
    if (
      prev.playing === next.playing &&
      prev.patternId === next.patternId &&
      prev.step === next.step &&
      prev.chainIndex === next.chainIndex
    ) {
      return;
    }
    this.playhead = next;
    for (const l of this.listeners) l();
  }

  // --- lifecycle ---

  /** Must be called from a user gesture the first time (autoplay policy). */
  async ensureStarted(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.mixer = new Mixer(this.ctx, this.ctx.destination, { realtime: true });
      this.player = new VoicePlayer(this.ctx, this.mixer);
      if (this.getProject) this.mixer.sync(this.getProject());
    }
    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        // Resume can reject when not triggered by a gesture; the next interaction retries.
      }
    }
    return this.ctx;
  }

  /** Push project changes (volumes, FX, new tracks) into the audio graph. */
  sync(project: Project): void {
    this.mixer?.sync(project);
  }

  setMetronome(on: boolean): void {
    this.metronome = on;
  }

  async play(): Promise<void> {
    if (this.playing || !this.getProject) return;
    const session = ++this.session;
    const ctx = await this.ensureStarted();
    if (session !== this.session || this.playing) return;
    const project = this.getProject();
    this.mixer!.sync(project);

    this.playing = true;
    this.stepIndex = 0;
    this.chainIndex = 0;
    this.patternId = project.playMode === 'song' ? songOrder(project)[0] : project.activePatternId;
    this.nextStepTime = ctx.currentTime + START_DELAY;
    this.queue = [];
    this.mixer!.setTransportActive(true, this.nextStepTime);
    this.schedule();
    this.ticker.start();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.session += 1;
    if (!this.playing) return;
    this.playing = false;
    this.ticker.stop();
    cancelAnimationFrame(this.raf);
    this.queue = [];
    if (this.ctx) {
      this.player?.stopAll(this.ctx.currentTime);
      this.mixer?.setTransportActive(false);
    }
    this.setPlayhead(IDLE);
  }

  async toggle(): Promise<void> {
    if (this.playing) this.stop();
    else await this.play();
  }

  /** Restart from the top (e.g. after switching between pattern and song mode). */
  async restart(): Promise<void> {
    this.stop();
    await this.play();
  }

  /** Audition a track's sound immediately. */
  async preview(track: Track, note?: number, velocity = 0.8): Promise<void> {
    const ctx = await this.ensureStarted();
    if (!this.getProject || !this.player) return;
    this.mixer!.sync(this.getProject());
    const def = INSTRUMENTS[track.instrument];
    const project = this.getProject();
    this.player.preview(track, {
      trackId: track.id,
      instrument: track.instrument,
      time: ctx.currentTime + 0.01,
      notes: [note ?? def.defaultNote],
      velocity,
      duration: stepDuration(project.bpm) * 2,
      step: 0,
    });
  }

  // --- scheduling ---

  private schedule = () => {
    if (!this.playing || !this.ctx || !this.getProject || !this.player) return;
    const ctx = this.ctx;
    const project = this.getProject();

    // After a long stall (sleeping laptop, frozen tab) jump forward instead of flooding notes.
    if (this.nextStepTime < ctx.currentTime - 0.25) {
      this.nextStepTime = ctx.currentTime + START_DELAY;
    }

    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD) {
      let pattern = getPattern(project, this.patternId);
      if (!pattern || this.stepIndex >= pattern.length) {
        this.advancePattern(project, !pattern);
        pattern = getPattern(project, this.patternId) ?? project.patterns[0];
        this.patternId = pattern.id;
      }

      const events = eventsForStep(project, pattern, this.stepIndex, this.nextStepTime, { rng: Math.random });
      for (const event of events) this.player.trigger(project, event);
      if (this.metronome && this.stepIndex % 4 === 0) this.click(this.nextStepTime, this.stepIndex % 16 === 0);

      this.queue.push({
        time: this.nextStepTime,
        patternId: pattern.id,
        step: this.stepIndex,
        chainIndex: project.playMode === 'song' ? this.chainIndex : -1,
      });
      this.nextStepTime += stepDuration(project.bpm);
      this.stepIndex += 1;
    }
  };

  private advancePattern(project: Project, missing: boolean) {
    this.stepIndex = 0;
    if (project.playMode === 'song') {
      const order = songOrder(project);
      this.chainIndex = missing ? 0 : (this.chainIndex + 1) % order.length;
      this.patternId = order[this.chainIndex];
    } else {
      this.chainIndex = 0;
      this.patternId = project.activePatternId;
    }
  }

  private frame = () => {
    if (!this.playing || !this.ctx) return;
    const latency = this.ctx.outputLatency || this.ctx.baseLatency || 0;
    const heard = this.ctx.currentTime - latency;
    let current: QueuedStep | undefined;
    while (this.queue.length && this.queue[0].time <= heard) current = this.queue.shift();
    if (current) {
      this.setPlayhead({
        playing: true,
        patternId: current.patternId,
        step: current.step,
        chainIndex: current.chainIndex,
      });
    } else if (!this.playhead.playing) {
      this.setPlayhead({ ...IDLE, playing: true });
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private click(time: number, accent: boolean) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = accent ? 1760 : 1320;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(accent ? 0.25 : 0.15, time + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(time);
    o.stop(time + 0.06);
    o.onended = () => g.disconnect();
  }
}

export const engine = new AudioEngine();
