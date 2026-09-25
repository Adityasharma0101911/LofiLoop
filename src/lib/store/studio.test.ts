import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject, createTrack } from '@/lib/project/factory';
import { MAX_PATTERNS, MAX_TRACKS } from '@/lib/project/types';
import { actions, getProject, selectActivePattern, useStudio } from './studio';

function fresh() {
  const project = createProject({
    tracks: [createTrack('kick'), createTrack('keys'), createTrack('bass')],
    root: 0,
    scale: 'minor',
  });
  actions.load(project);
  return project;
}

const active = () => selectActivePattern(useStudio.getState());

describe('studio store', () => {
  beforeEach(() => {
    fresh();
  });

  it('toggles steps with undo and redo', () => {
    const kick = getProject().tracks[0].id;
    actions.toggleStep(kick, 3);
    expect(active().steps[kick][3].on).toBe(true);
    actions.undo();
    expect(active().steps[kick][3].on).toBe(false);
    actions.redo();
    expect(active().steps[kick][3].on).toBe(true);
    expect(useStudio.getState().future).toHaveLength(0);
  });

  it('merges rapid edits with the same coalesce key into one undo step', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    actions.setBpm(90);
    vi.advanceTimersByTime(100);
    actions.setBpm(95);
    vi.advanceTimersByTime(100);
    actions.setBpm(100);
    expect(useStudio.getState().past).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    actions.setBpm(110);
    expect(useStudio.getState().past).toHaveLength(2);
    actions.undo();
    expect(getProject().bpm).toBe(100);
    actions.undo();
    expect(getProject().bpm).toBe(84);
    vi.useRealTimers();
  });

  it('does not record history for pattern selection', () => {
    actions.addPattern();
    const before = useStudio.getState().past.length;
    actions.selectPattern(getProject().patterns[0].id);
    expect(useStudio.getState().past.length).toBe(before);
  });

  it('clamps project settings', () => {
    actions.setBpm(1000);
    actions.setSwing(10);
    actions.setVolume(3);
    const p = getProject();
    expect(p.bpm).toBe(220);
    expect(p.swing).toBe(50);
    expect(p.volume).toBe(1);
  });

  it('adds, duplicates, moves and removes tracks across every pattern', () => {
    actions.addPattern();
    const id = actions.addTrack('snare')!;
    for (const p of getProject().patterns) expect(p.steps[id]).toHaveLength(64);
    const copy = actions.duplicateTrack(id)!;
    expect(
      getProject()
        .tracks.map((t) => t.id)
        .slice(-2),
    ).toEqual([id, copy]);
    actions.moveTrack(4, 0);
    expect(getProject().tracks[0].id).toBe(copy);
    actions.removeTrack(id);
    for (const p of getProject().patterns) expect(p.steps[id]).toBeUndefined();
  });

  it('caps tracks and patterns', () => {
    for (let i = 0; i < 20; i++) actions.addTrack('hat');
    expect(getProject().tracks).toHaveLength(MAX_TRACKS);
    for (let i = 0; i < 12; i++) actions.addPattern();
    expect(getProject().patterns).toHaveLength(MAX_PATTERNS);
    expect(getProject().patterns.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  });

  it('duplicates patterns and keeps the chain valid on delete', () => {
    const kick = getProject().tracks[0].id;
    actions.toggleStep(kick, 0);
    const a = getProject().patterns[0].id;
    const b = actions.addPattern(a)!;
    expect(active().id).toBe(b);
    expect(active().steps[kick][0].on).toBe(true);
    actions.appendToChain(b);
    expect(getProject().chain).toEqual([a, b]);
    actions.removePattern(b);
    expect(getProject().chain).toEqual([a]);
    expect(getProject().activePatternId).toBe(a);
  });

  it('extends a pattern by repeating its steps', () => {
    const kick = getProject().tracks[0].id;
    actions.toggleStep(kick, 4);
    actions.extendPattern(active().id, 32);
    expect(active().length).toBe(32);
    expect(active().steps[kick][20].on).toBe(true);
  });

  it('transposes melodic notes into the new key', () => {
    const keys = getProject().tracks[1].id;
    actions.setStep(keys, 0, { on: true, note: 63 }); // Eb in C minor
    actions.setKey(2, 'dorian'); // D dorian, +2 semitones
    expect(active().steps[keys][0].note).toBe(65); // F, in D dorian
    actions.setKey(0, 'major', false);
    expect(active().steps[keys][0].note).toBe(65);
  });

  it('keeps melodies in range when switching instruments', () => {
    const keys = getProject().tracks[1].id;
    actions.setStep(keys, 0, { on: true, note: 84 });
    actions.changeInstrument(keys, 'bass');
    const track = getProject().tracks[1];
    expect(track.instrument).toBe('bass');
    expect(track.name).toBe('Sub Bass');
    expect(track.chord).toBe('off');
    expect(active().steps[keys][0].note).toBe(48);
  });

  it('validates params and step edits', () => {
    const kick = getProject().tracks[0].id;
    actions.setParam(kick, 'tune', 10_000);
    actions.setParam(kick, 'nope', 1);
    expect(getProject().tracks[0].params.tune).toBe(90);
    expect(getProject().tracks[0].params.nope).toBeUndefined();
    actions.setStep(kick, 2, { vel: 5, prob: -1, ratchet: 9, len: 0 });
    expect(active().steps[kick][2]).toMatchObject({ vel: 1, prob: 0, ratchet: 4, len: 1 });
  });

  it('solos exclusively with the modifier', () => {
    const [a, b] = getProject().tracks.map((t) => t.id);
    actions.toggleSolo(a);
    actions.toggleSolo(b, true);
    expect(getProject().tracks.map((t) => t.solo)).toEqual([false, true, false]);
  });
});
