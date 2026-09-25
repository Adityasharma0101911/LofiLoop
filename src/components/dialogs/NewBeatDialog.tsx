'use client';

import { Dices } from 'lucide-react';
import { GENRE_IDS } from '@/lib/generate/genres';
import { generateBeat } from '@/lib/generate/generators';
import { randomSeed } from '@/lib/music/rng';
import { TEMPLATES } from '@/lib/project/templates';
import type { Project } from '@/lib/project/types';
import { actions } from '@/lib/store/studio';
import { ui, useUi } from '@/lib/store/ui';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { saveNow } from '@/components/studio/bootstrap';

function start(project: Project) {
  saveNow();
  actions.load(project);
  ui.selectTrack(project.tracks[0]?.id ?? null);
  ui.closeDialog();
}

export function NewBeatDialog() {
  const open = useUi((s) => s.dialog === 'new');
  return (
    <Dialog
      open={open}
      onClose={ui.closeDialog}
      title="Start a new beat"
      description="Your current beat is saved in the library."
      size="lg"
      footer={
        <Button
          variant="primary"
          icon={<Dices />}
          onClick={() => {
            const genre = GENRE_IDS[Math.floor(Math.random() * GENRE_IDS.length)];
            start(generateBeat(genre, { seed: randomSeed() }));
          }}
        >
          Surprise me
        </Button>
      }
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => start(t.create())}
              className="border-line bg-surface-2 hover:border-accent/60 hover:bg-accent-soft flex h-full w-full flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-colors"
            >
              <span className="text-sm font-semibold">{t.name}</span>
              <span className="text-fg-muted text-xs leading-relaxed">{t.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
