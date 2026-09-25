'use client';

import { useEffect } from 'react';
import { createId } from '@/lib/utils/id';
import { decodeShareData, readShareHash } from '@/lib/project/share';
import { actions } from '@/lib/store/studio';
import { ui } from '@/lib/store/ui';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useMeters } from '@/hooks/useMeters';
import { useIsPlaying } from '@/hooks/usePlayhead';
import { Toaster } from '@/components/ui/Toaster';
import { ExportDialog } from '@/components/dialogs/ExportDialog';
import { LibraryDialog } from '@/components/dialogs/LibraryDialog';
import { NewBeatDialog } from '@/components/dialogs/NewBeatDialog';
import { ShareDialog } from '@/components/dialogs/ShareDialog';
import { ShortcutsDialog } from '@/components/dialogs/ShortcutsDialog';
import { bootstrap, saveNow } from './bootstrap';
import { Inspector } from './Inspector';
import { PatternBar } from './PatternBar';
import { Sequencer } from './Sequencer';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { TopBar } from './TopBar';

bootstrap();

/** Opens a beat shared via `#beat=...` as a new copy in the library. */
function useSharedBeat() {
  useEffect(() => {
    const data = readShareHash(window.location.hash);
    if (!data) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    decodeShareData(data)
      .then((shared) => {
        const now = Date.now();
        saveNow();
        const project = { ...shared, id: createId('prj'), createdAt: now, updatedAt: now };
        actions.load(project);
        ui.selectTrack(project.tracks[0]?.id ?? null);
        ui.toast(`Opened shared beat “${project.name}”. It's saved in your library.`, 'success');
      })
      .catch(() => ui.toast('That share link is broken or incomplete.', 'error'));
  }, []);
}

/** Keep the space bar from re-clicking the last focused button after we use it for play/stop. */
function useSpaceGuard() {
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.target instanceof HTMLButtonElement) e.preventDefault();
    };
    window.addEventListener('keyup', onKeyUp, true);
    return () => window.removeEventListener('keyup', onKeyUp, true);
  }, []);
}

export default function Studio() {
  const playing = useIsPlaying();
  useHotkeys();
  useSpaceGuard();
  useSharedBeat();
  useMeters(playing);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <PatternBar />
          <Sequencer />
          <Inspector />
        </main>
        <Sidebar />
      </div>
      <StatusBar />
      <ExportDialog />
      <LibraryDialog />
      <NewBeatDialog />
      <ShareDialog />
      <ShortcutsDialog />
      <Toaster />
    </div>
  );
}
