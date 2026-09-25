import { describe, expect, it } from 'vitest';
import { createProject, createTrack } from './factory';
import { ProjectParseError, parseProjectFile, serializeProject, toProjectFile } from './serialize';

function sample() {
  const project = createProject({ tracks: [createTrack('kick'), createTrack('keys', { chord: 'seventh' })] });
  const [kick, keys] = project.tracks;
  const steps = project.patterns[0].steps;
  Object.assign(steps[kick.id][0], { on: true, vel: 0.5, prob: 0.25, ratchet: 3 });
  Object.assign(steps[keys.id][4], { on: true, note: 67, len: 8 });
  Object.assign(steps[keys.id][40], { on: true, note: 70 }); // beyond the 16-step length
  return project;
}

describe('project files', () => {
  it('round-trips a project exactly', () => {
    const project = sample();
    expect(parseProjectFile(serializeProject(project))).toEqual(project);
  });

  it('only stores active steps', () => {
    const file = toProjectFile(sample());
    const hits = Object.values(file.project.patterns[0].hits).flat();
    expect(hits).toHaveLength(3);
  });

  it('rejects things that are not projects', () => {
    expect(() => parseProjectFile('not json')).toThrow(ProjectParseError);
    expect(() => parseProjectFile({ hello: 'world' })).toThrow(/Not a valid LofiLoop project/);
    expect(() => parseProjectFile({ format: 'lofiloop', version: 1, project: {} })).toThrow(ProjectParseError);
  });

  it('clamps, repairs and drops invalid data', () => {
    const file = toProjectFile(sample());
    const p = file.project;
    p.bpm = 9999;
    p.swing = 0;
    p.root = 15;
    p.scale = 'klingon';
    p.tracks[0].volume = 4;
    p.tracks[0].params = { tune: -50, bogus: 3 };
    p.tracks.push({ ...p.tracks[0], id: 'x', instrument: 'theremin' });
    p.tracks.push({ ...p.tracks[1] }); // duplicate id
    p.patterns[0].hits[p.tracks[0].id].push([99, 50, 60, 100, 1, 1], [5, 500, 60, -3, 12, 99]);
    p.chain = ['missing'];
    p.activePatternId = 'missing';

    const project = parseProjectFile(file);
    expect(project.bpm).toBe(220);
    expect(project.swing).toBe(50);
    expect(project.root).toBe(11);
    expect(project.scale).toBe('minor');
    expect(project.tracks).toHaveLength(3);
    expect(new Set(project.tracks.map((t) => t.id)).size).toBe(3);
    expect(project.tracks[0].volume).toBe(1);
    expect(project.tracks[0].params.tune).toBe(35);
    expect(project.tracks[0].params.bogus).toBeUndefined();
    const kickSteps = project.patterns[0].steps[project.tracks[0].id];
    expect(kickSteps).toHaveLength(64);
    expect(kickSteps[5]).toMatchObject({ on: true, vel: 1, prob: 0, ratchet: 4, len: 16 });
    expect(project.chain).toEqual([project.patterns[0].id]);
    expect(project.activePatternId).toBe(project.patterns[0].id);
  });
});
