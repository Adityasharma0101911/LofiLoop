'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MAX_CHAIN } from '@/lib/project/types';
import { actions, useStudio } from '@/lib/store/studio';
import { usePlayhead } from '@/hooks/usePlayhead';
import { Menu } from '@/components/ui/Menu';
import { stepDuration } from '@/lib/audio/sequence';
import { formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export function SongChain() {
  const chain = useStudio((s) => s.project.chain);
  const patterns = useStudio((s) => s.project.patterns);
  const activeId = useStudio((s) => s.project.activePatternId);
  const bpm = useStudio((s) => s.project.bpm);
  const playhead = usePlayhead();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const byId = new Map(patterns.map((p) => [p.id, p]));
  const total = chain.reduce((sum, id) => sum + (byId.get(id)?.length ?? 0), 0) * stepDuration(bpm);

  return (
    <div className="border-line flex h-11 items-center gap-2 border-t px-2 sm:px-3">
      <span className="text-fg-subtle shrink-0 text-[10px] font-semibold tracking-widest uppercase">Song</span>
      <ol
        className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1"
        aria-label="Song arrangement"
      >
        {chain.map((id, i) => {
          const pattern = byId.get(id);
          if (!pattern) return null;
          const playing = playhead.playing && playhead.chainIndex === i;
          return (
            <li
              key={`${id}-${i}`}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) actions.moveChainItem(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn('group relative shrink-0', dragIndex === i && 'opacity-40')}
            >
              <button
                type="button"
                onClick={() => actions.selectPattern(id)}
                title={`Slot ${i + 1}: pattern ${pattern.name} (drag to reorder)`}
                className={cn(
                  'flex h-7 items-center rounded-md border px-2.5 font-mono text-xs font-semibold transition-colors',
                  playing
                    ? 'border-accent bg-accent text-accent-fg'
                    : id === activeId
                      ? 'border-accent/60 bg-accent-soft text-accent'
                      : 'border-line bg-surface-2 text-fg-muted hover:text-fg',
                )}
                style={{ minWidth: 28 + (pattern.length / 16) * 14 }}
              >
                {pattern.name}
              </button>
              {chain.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove slot ${i + 1}`}
                  onClick={() => actions.removeFromChain(i)}
                  className="bg-surface-3 text-fg-muted hover:bg-danger absolute -top-1.5 -right-1.5 hidden size-4 items-center justify-center rounded-full shadow group-hover:flex hover:text-white focus-visible:flex"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </li>
          );
        })}
        {chain.length < MAX_CHAIN && (
          <li className="shrink-0">
            <Menu
              label="Add pattern to song"
              align="start"
              trigger={(props) => (
                <button
                  type="button"
                  {...props}
                  aria-label="Add pattern to song"
                  className="border-line-strong text-fg-muted hover:border-accent hover:text-accent flex h-7 items-center gap-1 rounded-md border border-dashed px-2 text-xs"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              )}
              items={patterns.map((p) => ({ label: `Pattern ${p.name}`, onSelect: () => actions.appendToChain(p.id) }))}
            />
          </li>
        )}
      </ol>
      <span className="text-fg-subtle shrink-0 font-mono text-[11px] tabular-nums" title="Song length">
        {formatDuration(total)}
      </span>
    </div>
  );
}
