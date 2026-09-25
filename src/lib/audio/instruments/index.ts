import { defaultParams, type InstrumentId } from '@/lib/project/instruments';
import * as drums from './drums';
import { sampler } from './sampler';
import * as synths from './synths';
import type { VoiceFn } from './utils';

export type { SampleVoiceData, Voice, VoiceFn, VoiceInput, VoiceParams } from './utils';

/** Borrow another instrument's voice with that instrument's default settings. */
function standIn(voice: VoiceFn, like: InstrumentId): VoiceFn {
  const defaults = defaultParams(like);
  return (ctx, out, input) => voice(ctx, out, input, defaults);
}

export const VOICES: Record<InstrumentId, VoiceFn> = {
  kick: drums.kick,
  '808': synths.bass808,
  snare: drums.snare,
  clap: drums.clap,
  hat: drums.hat,
  openhat: drums.openhat,
  rim: drums.rim,
  shaker: drums.shaker,
  tom: drums.tom,
  crash: drums.crash,
  keys: synths.keys,
  pad: synths.pad,
  pluck: synths.pluck,
  bell: synths.bell,
  lead: synths.lead,
  bass: synths.subBass,
  // Temporary stand-ins until the dedicated voices land.
  wurli: standIn(synths.keys, 'keys'),
  guitar: standIn(synths.pluck, 'pluck'),
  strings: standIn(synths.pad, 'pad'),
  flute: standIn(synths.lead, 'lead'),
  vox: standIn(synths.pad, 'pad'),
  upright: standIn(synths.subBass, 'bass'),
  riser: standIn(drums.crash, 'crash'),
  sampler,
};
