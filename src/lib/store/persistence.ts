/** Local project library backed by localStorage (compact format, a few KB per project). */
import { parseProjectFile, serializeProject } from '@/lib/project/serialize';
import type { Project } from '@/lib/project/types';
import { NOTE_NAMES, SCALES } from '@/lib/music/theory';

const PREFIX = 'lofiloop:v2';
const KEYS = {
  index: `${PREFIX}:index`,
  current: `${PREFIX}:current`,
  project: (id: string) => `${PREFIX}:project:${id}`,
  prefs: `${PREFIX}:prefs`,
};

export interface ProjectMeta {
  id: string;
  name: string;
  bpm: number;
  key: string;
  tracks: number;
  patterns: number;
  updatedAt: number;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function metaFor(project: Project): ProjectMeta {
  return {
    id: project.id,
    name: project.name,
    bpm: project.bpm,
    key: `${NOTE_NAMES[project.root]} ${SCALES[project.scale].label.toLowerCase()}`,
    tracks: project.tracks.length,
    patterns: project.patterns.length,
    updatedAt: project.updatedAt,
  };
}

export function listProjects(): ProjectMeta[] {
  const index = readJson<ProjectMeta[]>(KEYS.index, []);
  return Array.isArray(index) ? [...index].sort((a, b) => b.updatedAt - a.updatedAt) : [];
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/** Persist a project and make it the one reopened next visit. Throws StorageError when full. */
export function saveProject(project: Project): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEYS.project(project.id), serializeProject(project));
    const index = listProjects().filter((m) => m.id !== project.id);
    index.unshift(metaFor(project));
    store.setItem(KEYS.index, JSON.stringify(index));
    store.setItem(KEYS.current, project.id);
  } catch (error) {
    const quota = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
    throw new StorageError(
      quota ? 'Browser storage is full. Delete old beats from the library to keep saving.' : 'Could not save to browser storage.',
    );
  }
}

export function loadProject(id: string): Project | null {
  const raw = storage()?.getItem(KEYS.project(id));
  if (!raw) return null;
  try {
    return parseProjectFile(raw);
  } catch {
    return null;
  }
}

export function loadCurrentProject(): Project | null {
  const id = storage()?.getItem(KEYS.current);
  return id ? loadProject(id) : null;
}

export function deleteProject(id: string): void {
  const store = storage();
  if (!store) return;
  store.removeItem(KEYS.project(id));
  store.setItem(KEYS.index, JSON.stringify(listProjects().filter((m) => m.id !== id)));
  if (store.getItem(KEYS.current) === id) store.removeItem(KEYS.current);
}

export function readPrefs<T extends object>(fallback: T): T {
  const prefs = readJson<Partial<T>>(KEYS.prefs, {});
  return { ...fallback, ...(prefs && typeof prefs === 'object' ? prefs : {}) };
}

export function writePrefs(prefs: object): void {
  try {
    storage()?.setItem(KEYS.prefs, JSON.stringify(prefs));
  } catch {
    // Preferences are best-effort.
  }
}
