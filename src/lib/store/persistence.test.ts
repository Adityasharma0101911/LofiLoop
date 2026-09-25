// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoProject } from '@/lib/project/templates';
import {
  deleteProject,
  listProjects,
  loadCurrentProject,
  loadProject,
  readPrefs,
  saveProject,
  writePrefs,
} from './persistence';

describe('local library', () => {
  beforeEach(() => localStorage.clear());

  it('saves, lists, reloads and deletes projects', () => {
    const a = { ...createDemoProject(), id: 'prj_a', name: 'Alpha', updatedAt: 1 };
    const b = { ...createDemoProject(), id: 'prj_b', name: 'Beta', updatedAt: 2 };
    saveProject(a);
    saveProject(b);
    expect(listProjects().map((m) => m.name)).toEqual(['Beta', 'Alpha']);
    expect(loadCurrentProject()?.id).toBe('prj_b');
    expect(loadProject('prj_a')).toEqual(a);
    deleteProject('prj_b');
    expect(listProjects().map((m) => m.id)).toEqual(['prj_a']);
    expect(loadCurrentProject()).toBeNull();
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('lofiloop:v2:index', '{broken');
    localStorage.setItem('lofiloop:v2:project:x', '{"nope":true}');
    expect(listProjects()).toEqual([]);
    expect(loadProject('x')).toBeNull();
  });

  it('merges stored preferences over defaults', () => {
    writePrefs({ theme: 'paper' });
    expect(readPrefs({ theme: 'midnight', metronome: false })).toEqual({ theme: 'paper', metronome: false });
  });
});
