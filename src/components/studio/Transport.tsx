'use client';

import { Play, Square, Timer } from 'lucide-react';
import { engine } from '@/lib/audio/engine';
import { useIsPlaying } from '@/hooks/usePlayhead';
import { ui, useUi } from '@/lib/store/ui';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export function Transport({ compact = false }: { compact?: boolean }) {
  const playing = useIsPlaying();
  const metronome = useUi((s) => s.metronome);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => void engine.toggle()}
        aria-label={playing ? 'Stop (Space)' : 'Play (Space)'}
        aria-pressed={playing}
        className={cn(
          'relative flex size-10 items-center justify-center rounded-full transition-all duration-150 active:scale-95 [&_svg]:size-[18px]',
          playing
            ? 'bg-fg text-bg'
            : 'bg-accent text-accent-fg shadow-[0_6px_24px_-6px_var(--glow)] hover:brightness-110',
        )}
      >
        {playing ? <Square className="fill-current" /> : <Play className="translate-x-px fill-current" />}
        {playing && <span className="absolute inset-0 animate-ping rounded-full bg-fg/20 [animation-duration:2s]" />}
      </button>
      {!compact && (
        <IconButton
            label={metronome ? 'Metronome on (K)' : 'Metronome off (K)'}
            active={metronome}
            onClick={() => {
              const next = !metronome;
              ui.set({ metronome: next });
              engine.setMetronome(next);
            }}
          >
          <Timer />
        </IconButton>
      )}
    </div>
  );
}
