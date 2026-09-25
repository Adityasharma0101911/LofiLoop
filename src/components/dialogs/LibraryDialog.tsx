'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Download, FileUp, FolderOpen, Search, Trash2 } from 'lucide-react';
import { createId } from '@/lib/utils/id';
import { downloadBlob } from '@/lib/export/download';
import { ProjectParseError, parseProjectFile, serializeProject } from '@/lib/project/serialize';
import type { Project } from '@/lib/project/types';
import { deleteProject, listProjects, loadProject, saveProject, type ProjectMeta } from '@/lib/store/persistence';
import { actions, getProject, useStudio } from '@/lib/store/studio';
import { ui, useUi } from '@/lib/store/ui';
import { Button, IconButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { formatRelativeTime, slugify } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { saveNow } from '@/components/studio/bootstrap';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

function openProject(project: Project) {
  saveNow();
  actions.load(project);
  ui.selectTrack(project.tracks[0]?.id ?? null);
  ui.closeDialog();
}

export function LibraryDialog() {
  const open = useUi((s) => s.dialog === 'library');
  const currentId = useStudio((s) => s.project.id);
  const [items, setItems] = useState<ProjectMeta[]>([]);
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setItems(listProjects());

  useEffect(() => {
    if (!open) return;
    saveNow();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with localStorage when the dialog opens
    refresh();
    setConfirming(null);
  }, [open]);

  const importFiles = async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      ui.toast('That file is too large to be a LofiLoop project.', 'error');
      return;
    }
    try {
      const project = parseProjectFile(await file.text());
      const copy: Project = { ...project, id: createId('prj'), updatedAt: Date.now() };
      saveProject(copy);
      openProject(copy);
      ui.toast(`Imported “${copy.name}”`, 'success');
    } catch (error) {
      ui.toast(error instanceof ProjectParseError ? error.message : 'Could not import that file.', 'error');
    }
  };

  const duplicate = (id: string) => {
    const source = id === currentId ? getProject() : loadProject(id);
    if (!source) return;
    const now = Date.now();
    saveProject({ ...source, id: createId('prj'), name: `${source.name} copy`, createdAt: now, updatedAt: now });
    // saveProject marks the copy as current; keep the open project current instead.
    saveNow();
    refresh();
  };

  const download = (id: string) => {
    const project = id === currentId ? getProject() : loadProject(id);
    if (!project) return;
    downloadBlob(
      new Blob([serializeProject(project, true)], { type: 'application/json' }),
      `${slugify(project.name)}.lofiloop.json`,
    );
  };

  const remove = (id: string) => {
    deleteProject(id);
    setConfirming(null);
    if (id === currentId) {
      const next = listProjects()[0];
      const project = next ? loadProject(next.id) : null;
      if (project) actions.load(project);
      else ui.openDialog('new');
    }
    refresh();
  };

  const filtered = items.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog
      open={open}
      onClose={ui.closeDialog}
      title="Your beats"
      description="Everything is saved in this browser. Download a file to back a beat up or move it to another device."
      size="lg"
      footer={
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void importFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Button variant="ghost" icon={<FileUp />} onClick={() => fileRef.current?.click()} className="mr-auto">
            Import file
          </Button>
          <Button variant="primary" onClick={() => ui.openDialog('new')}>
            New beat
          </Button>
        </>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void importFiles(e.dataTransfer.files);
        }}
        className={cn('rounded-xl transition-colors', dragging && 'bg-accent-soft ring-accent ring-dashed ring-2')}
      >
        <label className="relative mb-3 block">
          <span className="sr-only">Search beats</span>
          <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search beats"
            className="border-line bg-surface-2 focus:border-line-strong h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none"
          />
        </label>
        {filtered.length === 0 ? (
          <p className="text-fg-muted py-10 text-center text-sm">
            {items.length
              ? 'No beats match your search.'
              : 'No saved beats yet. Drop a .json project here to import it.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {filtered.map((m) => {
              const current = m.id === currentId;
              return (
                <li
                  key={m.id}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                    current ? 'border-accent/50 bg-accent-soft' : 'hover:bg-surface-2 border-transparent',
                  )}
                >
                  <button
                    type="button"
                    disabled={current}
                    onClick={() => {
                      const project = loadProject(m.id);
                      if (project) openProject(project);
                      else ui.toast('That beat could not be opened.', 'error');
                    }}
                    className="min-w-0 flex-1 text-left disabled:cursor-default"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{m.name}</span>
                      {current && (
                        <span className="bg-accent text-accent-fg rounded px-1.5 py-px text-[10px] font-bold">
                          OPEN
                        </span>
                      )}
                    </span>
                    <span className="text-fg-muted mt-0.5 block text-xs">
                      {m.bpm} BPM · {m.key} · {m.tracks} tracks · edited {formatRelativeTime(m.updatedAt)}
                    </span>
                  </button>
                  {confirming === m.id ? (
                    <div className="flex items-center gap-1">
                      <Button size="xs" variant="danger" onClick={() => remove(m.id)}>
                        Delete
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setConfirming(null)}>
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      {!current && (
                        <IconButton
                          label="Open"
                          tip="top"
                          onClick={() => {
                            const project = loadProject(m.id);
                            if (project) openProject(project);
                          }}
                        >
                          <FolderOpen />
                        </IconButton>
                      )}
                      <IconButton label="Duplicate" tip="top" onClick={() => duplicate(m.id)}>
                        <Copy />
                      </IconButton>
                      <IconButton label="Download file" tip="top" onClick={() => download(m.id)}>
                        <Download />
                      </IconButton>
                      <IconButton
                        label="Delete"
                        tip="top"
                        onClick={() => setConfirming(m.id)}
                        className="hover:text-danger"
                      >
                        <Trash2 />
                      </IconButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
