/**
 * Mixer and master chain, built identically for the live AudioContext and
 * for OfflineAudioContext exports:
 *
 *   track strips ─┬─> sum ───────────────┐
 *                 ├─> reverb send ─> IR ─┤
 *                 └─> delay send ─> ping-pong
 *                                        v
 *   drive -> bit crush -> wow/flutter -> tone (+ vinyl crackle) -> glue comp -> master -> limiter
 */
import { dbToGain } from '@/lib/utils/math';
import type { MasterFx, Project, Track } from '@/lib/project/types';
import { hasSolo, isAudible } from './sequence';
import { crushCurve, saturationCurve } from './instruments/utils';
import { crackleBuffer, delaySeconds, faderGain, impulseResponse, safetyCurve, toneFrequency } from './fx';

interface Strip {
  input: GainNode;
  volume: GainNode;
  mute: GainNode;
  pan: StereoPannerNode;
  reverb: GainNode;
  delay: GainNode;
  analyser?: AnalyserNode;
}

export interface MixerOptions {
  /** Live contexts smooth parameter changes, get meters and debounce reverb rebuilds. */
  realtime: boolean;
}

const SMOOTHING = 0.015;
/** About -5 dB of mix-bus headroom. */
const BUS_TRIM = 0.56;

export class Mixer {
  readonly ctx: BaseAudioContext;
  readonly output: GainNode;
  readonly analyser: AnalyserNode | null = null;

  private readonly realtime: boolean;
  private readonly strips = new Map<string, Strip>();
  private readonly sum: GainNode;
  private readonly convolver: ConvolverNode;
  private readonly reverbIn: GainNode;
  private readonly reverbReturn: GainNode;
  private readonly delayIn: GainNode;
  private readonly delayL: DelayNode;
  private readonly delayR: DelayNode;
  private readonly feedbackL: GainNode;
  private readonly feedbackR: GainNode;
  private readonly delayReturn: GainNode;
  private readonly drivePre: GainNode;
  private readonly driveShaper: WaveShaperNode;
  private readonly drivePost: GainNode;
  private readonly crushDry: GainNode;
  private readonly crushWet: GainNode;
  private readonly crushShaper: WaveShaperNode;
  private readonly wowDelay: DelayNode;
  private readonly wowDepth: GainNode;
  private readonly flutterDepth: GainNode;
  private readonly lfos: OscillatorNode[] = [];
  private readonly toneHp: BiquadFilterNode;
  private readonly toneLp: BiquadFilterNode;
  private readonly crackle: AudioBufferSourceNode;
  private readonly crackleGain: GainNode;
  private readonly glue: DynamicsCompressorNode;
  private readonly makeup: GainNode;
  private readonly master: GainNode;
  private readonly limiter: DynamicsCompressorNode;
  private readonly clipper: WaveShaperNode;

  private fx: MasterFx | null = null;
  private bpm = 0;
  private reverbSize = -1;
  private reverbTimer: ReturnType<typeof setTimeout> | null = null;
  private transportActive = false;
  private disposed = false;

  constructor(ctx: BaseAudioContext, destination: AudioNode, { realtime }: MixerOptions) {
    this.ctx = ctx;
    this.realtime = realtime;

    this.sum = ctx.createGain();

    // Reverb bus
    this.reverbIn = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.reverbReturn = ctx.createGain();
    const reverbHp = ctx.createBiquadFilter();
    reverbHp.type = 'highpass';
    reverbHp.frequency.value = 180;
    this.reverbIn.connect(reverbHp).connect(this.convolver).connect(this.reverbReturn);

    // Ping-pong delay bus with a darkening feedback loop
    this.delayIn = ctx.createGain();
    this.delayL = ctx.createDelay(2);
    this.delayR = ctx.createDelay(2);
    this.feedbackL = ctx.createGain();
    this.feedbackR = ctx.createGain();
    const loopToneL = ctx.createBiquadFilter();
    const loopToneR = ctx.createBiquadFilter();
    loopToneL.type = loopToneR.type = 'lowpass';
    loopToneL.frequency.value = loopToneR.frequency.value = 3200;
    const delayHp = ctx.createBiquadFilter();
    delayHp.type = 'highpass';
    delayHp.frequency.value = 250;
    const merger = ctx.createChannelMerger(2);
    this.delayReturn = ctx.createGain();
    this.delayIn.connect(delayHp).connect(this.delayL);
    this.delayL.connect(loopToneL).connect(this.feedbackL).connect(this.delayR);
    this.delayR.connect(loopToneR).connect(this.feedbackR).connect(this.delayL);
    this.delayL.connect(merger, 0, 0);
    this.delayR.connect(merger, 0, 1);
    merger.connect(this.delayReturn);

    // Tape drive
    this.drivePre = ctx.createGain();
    this.driveShaper = ctx.createWaveShaper();
    this.driveShaper.oversample = '2x';
    this.drivePost = ctx.createGain();
    // A full kit summed at unity overdrives the bus; trim it so the limiter only catches peaks.
    const busTrim = ctx.createGain();
    busTrim.gain.value = BUS_TRIM;
    this.sum.connect(busTrim);
    this.reverbReturn.connect(busTrim);
    this.delayReturn.connect(busTrim);
    busTrim.connect(this.drivePre).connect(this.driveShaper).connect(this.drivePost);

    // Bit crusher (dry/wet so it can be fully bypassed)
    this.crushDry = ctx.createGain();
    this.crushWet = ctx.createGain();
    this.crushShaper = ctx.createWaveShaper();
    this.wowDelay = ctx.createDelay(0.1);
    this.wowDelay.delayTime.value = 0.008;
    this.drivePost.connect(this.crushDry).connect(this.wowDelay);
    this.drivePost.connect(this.crushShaper).connect(this.crushWet).connect(this.wowDelay);

    // Wow & flutter: slow + fast pitch drift via a modulated delay line
    this.wowDepth = ctx.createGain();
    this.flutterDepth = ctx.createGain();
    const wow = ctx.createOscillator();
    wow.frequency.value = 0.55;
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 6.5;
    wow.connect(this.wowDepth).connect(this.wowDelay.delayTime);
    flutter.connect(this.flutterDepth).connect(this.wowDelay.delayTime);
    this.lfos.push(wow, flutter);

    // Tone
    this.toneHp = ctx.createBiquadFilter();
    this.toneHp.type = 'highpass';
    this.toneLp = ctx.createBiquadFilter();
    this.toneLp.type = 'lowpass';
    this.toneLp.Q.value = 0.6;
    this.wowDelay.connect(this.toneHp).connect(this.toneLp);

    // Vinyl crackle runs through the tone filter so dark settings muffle it too
    this.crackle = ctx.createBufferSource();
    this.crackle.buffer = crackleBuffer(ctx);
    this.crackle.loop = true;
    this.crackleGain = ctx.createGain();
    this.crackleGain.gain.value = 0;
    this.crackle.connect(this.crackleGain).connect(this.toneHp);

    // Bus glue, master volume and a safety limiter
    this.glue = ctx.createDynamicsCompressor();
    this.glue.attack.value = 0.015;
    this.glue.release.value = 0.25;
    this.glue.knee.value = 12;
    this.makeup = ctx.createGain();
    this.master = ctx.createGain();
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -2;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.08;
    // The compressor-based limiter lets fast transients through; a soft clipper catches them.
    this.clipper = ctx.createWaveShaper();
    this.clipper.curve = safetyCurve();
    this.clipper.oversample = '4x';
    this.output = ctx.createGain();
    this.toneLp
      .connect(this.glue)
      .connect(this.makeup)
      .connect(this.master)
      .connect(this.limiter)
      .connect(this.clipper)
      .connect(this.output);
    this.output.connect(destination);

    if (realtime) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.75;
      this.output.connect(this.analyser);
    }

    for (const lfo of this.lfos) lfo.start(0);
    this.crackle.start(0);
  }

  /** Where voices for a track should connect. */
  input(trackId: string): AudioNode | null {
    return this.strips.get(trackId)?.input ?? null;
  }

  /** Voices that don't belong to a track (instrument browser previews). */
  get previewInput(): AudioNode {
    return this.sum;
  }

  trackAnalyser(trackId: string): AnalyserNode | undefined {
    return this.strips.get(trackId)?.analyser;
  }

  /** Vinyl noise only runs while the transport plays. */
  setTransportActive(active: boolean, time = this.ctx.currentTime): void {
    this.transportActive = active;
    this.applyCrackle(time);
  }

  sync(project: Project): void {
    if (this.disposed) return;
    const anySolo = hasSolo(project.tracks);
    const seen = new Set<string>();
    for (const track of project.tracks) {
      seen.add(track.id);
      let strip = this.strips.get(track.id);
      if (!strip) {
        strip = this.createStrip();
        this.strips.set(track.id, strip);
        this.updateStrip(strip, track, anySolo, true);
      } else {
        this.updateStrip(strip, track, anySolo, false);
      }
    }
    for (const [id, strip] of this.strips) {
      if (!seen.has(id)) {
        this.removeStrip(strip);
        this.strips.delete(id);
      }
    }
    this.set(this.master.gain, faderGain(project.volume));
    this.syncFx(project.fx, project.bpm);
  }

  dispose(): void {
    this.disposed = true;
    if (this.reverbTimer) clearTimeout(this.reverbTimer);
    for (const lfo of this.lfos) lfo.stop();
    this.crackle.stop();
    this.output.disconnect();
    for (const strip of this.strips.values()) this.removeStrip(strip);
    this.strips.clear();
  }

  private createStrip(): Strip {
    const { ctx } = this;
    const strip: Strip = {
      input: ctx.createGain(),
      volume: ctx.createGain(),
      mute: ctx.createGain(),
      pan: ctx.createStereoPanner(),
      reverb: ctx.createGain(),
      delay: ctx.createGain(),
    };
    strip.input.connect(strip.volume).connect(strip.mute).connect(strip.pan);
    strip.pan.connect(this.sum);
    strip.pan.connect(strip.reverb).connect(this.reverbIn);
    strip.pan.connect(strip.delay).connect(this.delayIn);
    if (this.realtime) {
      strip.analyser = ctx.createAnalyser();
      strip.analyser.fftSize = 512;
      strip.pan.connect(strip.analyser);
    }
    return strip;
  }

  private updateStrip(strip: Strip, track: Track, anySolo: boolean, immediate: boolean) {
    this.set(strip.volume.gain, faderGain(track.volume), immediate);
    this.set(strip.mute.gain, isAudible(track, anySolo) ? 1 : 0, immediate);
    this.set(strip.pan.pan, track.pan, immediate);
    this.set(strip.reverb.gain, track.reverb, immediate);
    this.set(strip.delay.gain, track.delay, immediate);
  }

  private removeStrip(strip: Strip) {
    const t = this.ctx.currentTime;
    strip.mute.gain.setTargetAtTime(0, t, SMOOTHING);
    const disconnect = () => {
      for (const node of Object.values(strip)) (node as AudioNode | undefined)?.disconnect();
    };
    if (this.realtime) setTimeout(disconnect, 200);
    else disconnect();
  }

  private syncFx(fx: MasterFx, bpm: number) {
    const prev = this.fx;
    const first = prev === null;

    if (first || prev.drive !== fx.drive) {
      // Push into the curve, then undo its small-signal gain so drive adds warmth, not volume.
      const amount = fx.drive * 0.5;
      const k = 1 + amount * 12;
      const pre = 1 + fx.drive * 1.5;
      const on = fx.drive >= 0.01;
      this.driveShaper.curve = on ? saturationCurve(amount) : null;
      this.set(this.drivePre.gain, on ? pre : 1, first);
      this.set(this.drivePost.gain, on ? Math.tanh(k) / (k * pre) : 1, first);
    }
    if (first || prev.crush !== fx.crush) {
      const on = fx.crush > 0.01;
      if (on) this.crushShaper.curve = crushCurve(14 - fx.crush * 10);
      this.set(this.crushDry.gain, on ? 0 : 1, first);
      this.set(this.crushWet.gain, on ? 0.9 : 0, first);
    }
    if (first || prev.wow !== fx.wow) {
      this.set(this.wowDepth.gain, fx.wow * 0.0022, first);
      this.set(this.flutterDepth.gain, fx.wow * 0.00025, first);
    }
    if (first || prev.tone !== fx.tone) {
      const nyquist = this.ctx.sampleRate / 2 - 200;
      this.set(this.toneLp.frequency, Math.min(nyquist, toneFrequency(fx.tone)), first);
      this.set(this.toneHp.frequency, 25 + (1 - fx.tone) * 110, first);
    }
    if (first || prev.crackle !== fx.crackle) {
      this.fx = fx;
      this.applyCrackle(this.ctx.currentTime);
    }
    if (first || prev.glue !== fx.glue) {
      this.set(this.glue.threshold, -4 - fx.glue * 22, first);
      this.set(this.glue.ratio, 1.5 + fx.glue * 3, first);
      this.set(this.makeup.gain, dbToGain(fx.glue * 5), first);
    }
    if (first || prev.reverbMix !== fx.reverbMix) this.set(this.reverbReturn.gain, fx.reverbMix * 1.4, first);
    if (first || prev.reverbSize !== fx.reverbSize) this.scheduleReverb(fx.reverbSize, first);
    if (first || prev.delayMix !== fx.delayMix) this.set(this.delayReturn.gain, fx.delayMix * 0.9, first);
    if (first || prev.delayFeedback !== fx.delayFeedback) {
      this.set(this.feedbackL.gain, fx.delayFeedback, first);
      this.set(this.feedbackR.gain, fx.delayFeedback, first);
    }
    if (first || prev.delayDivision !== fx.delayDivision || this.bpm !== bpm) {
      const seconds = Math.min(1.9, delaySeconds(fx.delayDivision, bpm));
      this.set(this.delayL.delayTime, seconds, first, 0.05);
      this.set(this.delayR.delayTime, seconds, first, 0.05);
    }
    this.fx = fx;
    this.bpm = bpm;
  }

  private applyCrackle(time: number) {
    const level = this.transportActive && this.fx ? this.fx.crackle * 0.35 : 0;
    if (this.realtime) this.crackleGain.gain.setTargetAtTime(level, time, 0.08);
    else this.crackleGain.gain.setValueAtTime(level, time);
  }

  private scheduleReverb(size: number, immediate: boolean) {
    if (Math.abs(size - this.reverbSize) < 0.001) return;
    const build = () => {
      this.reverbTimer = null;
      if (this.disposed) return;
      this.reverbSize = size;
      this.convolver.buffer = impulseResponse(this.ctx, size);
    };
    if (immediate || !this.realtime) {
      build();
      return;
    }
    if (this.reverbTimer) clearTimeout(this.reverbTimer);
    this.reverbTimer = setTimeout(build, 120);
  }

  private set(param: AudioParam, value: number, immediate = false, smoothing = SMOOTHING) {
    if (!this.realtime || immediate) {
      param.cancelScheduledValues(0);
      param.value = value;
      return;
    }
    param.setTargetAtTime(value, this.ctx.currentTime, smoothing);
  }
}
