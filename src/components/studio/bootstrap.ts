/**
 * Client-only initialisation: restores the last project, wires the audio
 * engine to the store and autosaves changes to the local library.
 */
import { engine } from '@/lib/audio/engine';
import { createDemoProject } from '@/lib/project/templates';
import { loadCurrentProject, saveProject, StorageError } from '@/lib/store/persistence';
import { getProject, useStudio } from '@/lib/store/studio';
import { ui, useUi } from '@/lib/store/ui';

const AUTOSAVE_MS = 600;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSaveError = 0;

export function saveNow(showToast = false): boolean {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  try {
    saveProject(getProject());
    useUi.setState({ saveStatus: 'saved', savedAt: Date.now() });
    if (showToast) ui.toast('Saved to your library', 'success');
    return true;
  } catch (error) {
    useUi.setState({ saveStatus: 'error' });
    const now = Date.now();
    if (showToast || now - lastSaveError > 30000) {
      lastSaveError = now;
      ui.toast(error instanceof StorageError ? error.message : 'Could not save your beat.', 'error');
    }
    return false;
  }
}

function scheduleSave() {
  useUi.setState({ saveStatus: 'saving' });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(), AUTOSAVE_MS);
}

let initialised = false;

export function bootstrap(): void {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;

  const project = loadCurrentProject() ?? createDemoProject();
  useStudio.getState().load(project);
  useUi.setState({ selectedTrackId: project.tracks[0]?.id ?? null, saveStatus: 'saved', savedAt: project.updatedAt });

  engine.attach(getProject);
  engine.setMetronome(useUi.getState().metronome);

  useStudio.subscribe((state, prev) => {
    if (state.project === prev.project) return;
    engine.sync(state.project);
    if (state.project.name !== prev.project.name) document.title = `${state.project.name} · LofiLoop`;
    // A new project replaced the old one: persist immediately so the library is up to date.
    if (state.project.id !== prev.project.id) saveNow();
    else scheduleSave();
  });
  document.title = `${project.name} · LofiLoop`;

  const flush = () => {
    if (saveTimer) saveNow();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
