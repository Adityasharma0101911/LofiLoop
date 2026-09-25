import type { InstrumentId } from '@/lib/project/instruments';
import * as drums from './drums';
import * as synths from './synths';
import type { VoiceFn } from './utils';

export type { Voice, VoiceFn, VoiceInput, VoiceParams } from './utils';

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
};
