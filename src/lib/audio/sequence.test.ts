import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/music/rng';
import { createProject, createTrack } from '@/lib/project/factory';
import type { Project } from '@/lib/project/types';
import { collectEvents, eventsForStep, renderSlots, slotsDuration, stepDuration, swingOffset } from './sequence';

function setup(): Project {
  const tracks = [createTrack('kick'), createTrack('keys'), createTrack('808')];
  const project = createProject({ tracks, bpm: 120, swing: 50 });
  return project;
}

const rng = () => createRng(1);

describe('sequence timing', () => {
  it('computes 16th note duration and MPC-style swing', () => {
    expect(stepDuration(120)).toBeCloseTo(0.125);
    expect(swingOffset(0, 120, 66)).toBe(0);
    expect(swingOffset(1, 120, 50)).toBe(0);
    expect(swingOffset(1, 120, 75)).toBeCloseTo(0.0625);
  });
});

describe('eventsForStep', () => {
  it('emits drum hits on the drum note and applies swing to odd steps', () => {
    const project = setup();
    project.swing = 75;
    const [kick] = project.tracks;
    const pattern = project.patterns[0];
    pattern.steps[kick.id][1].on = true;
    const events = eventsForStep(project, pattern, 1, 10, { rng: rng() });
    expect(events).toHaveLength(1);
    expect(events[0].time).toBeCloseTo(10.0625);
    expect(events[0].notes).toEqual([60]);
  });

  it('expands chord tracks and scales gate length by step length', () => {
    const project = setup();
    const keys = project.tracks[1];
    keys.chord = 'triad';
    const step = project.patterns[0].steps[keys.id][0];
    Object.assign(step, { on: true, note: 60, len: 4 });
    const [event] = eventsForStep(project, project.patterns[0], 0, 0, { rng: rng() });
    expect(event.notes).toEqual([60, 63, 67]); // C minor triad in C minor
    expect(event.duration).toBeCloseTo(4 * 0.125 * 0.95);
  });

  it('splits ratchets into evenly spaced, decaying hits', () => {
    const project = setup();
    const kick = project.tracks[0];
    Object.assign(project.patterns[0].steps[kick.id][0], { on: true, ratchet: 4, vel: 1 });
    const events = eventsForStep(project, project.patterns[0], 0, 0, { rng: rng() });
    expect(events.map((e) => e.time)).toEqual([0, 0.03125, 0.0625, 0.09375]);
    expect(events[3].velocity).toBeLessThan(events[0].velocity);
  });

  it('honours probability, mute and solo', () => {
    const project = setup();
    const [kick, keys] = project.tracks;
    const steps = project.patterns[0].steps;
    steps[kick.id][0].on = true;
    steps[keys.id][0].on = true;
    steps[kick.id][0].prob = 0;
    expect(eventsForStep(project, project.patterns[0], 0, 0, { rng: rng() }).map((e) => e.trackId)).toEqual([keys.id]);

    steps[kick.id][0].prob = 1;
    keys.mute = true;
    expect(eventsForStep(project, project.patterns[0], 0, 0, { rng: rng() }).map((e) => e.trackId)).toEqual([kick.id]);

    keys.mute = false;
    keys.solo = true;
    expect(eventsForStep(project, project.patterns[0], 0, 0, { rng: rng() }).map((e) => e.trackId)).toEqual([keys.id]);
    expect(eventsForStep(project, project.patterns[0], 0, 0, { rng: rng(), includeMuted: true })).toHaveLength(2);
  });

  it('only plays the first note on monophonic tracks even with chord data', () => {
    const project = setup();
    const bass = project.tracks[2];
    bass.chord = 'triad'; // ignored: 808 isn't polyphonic
    Object.assign(project.patterns[0].steps[bass.id][0], { on: true, note: 36 });
    const [event] = eventsForStep(project, project.patterns[0], 0, 0, { rng: rng() });
    expect(event.notes).toEqual([36]);
  });
});

describe('render slots', () => {
  it('lays out song mode patterns back to back', () => {
    const project = setup();
    const a = project.patterns[0];
    const b = { ...a, id: 'b', name: 'B', length: 32, steps: a.steps };
    project.patterns.push(b);
    project.chain = [a.id, b.id, 'missing', a.id];
    const slots = renderSlots(project, 'song', 1);
    expect(slots.map((s) => s.pattern.id)).toEqual([a.id, b.id, a.id]);
    expect(slots.map((s) => s.start)).toEqual([0, 2, 6]);
    expect(slotsDuration(project, slots)).toBeCloseTo(8);
  });

  it('repeats the active pattern in pattern mode', () => {
    const project = setup();
    const kick = project.tracks[0];
    project.patterns[0].steps[kick.id][0].on = true;
    const slots = renderSlots(project, 'pattern', 3);
    expect(slots).toHaveLength(3);
    const events = collectEvents(project, slots, { rng: rng() }, 0.5);
    expect(events.map((e) => e.time)).toEqual([0.5, 2.5, 4.5]);
  });
});
