'use client';

import dynamic from 'next/dynamic';
import { Logo } from './Logo';

function Splash() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-bg text-fg" role="status">
      <Logo className="size-12 animate-pulse" />
      <p className="text-sm text-fg-muted">Warming up the tape deck…</p>
    </div>
  );
}

/** The studio relies on Web Audio and localStorage, so it only renders in the browser. */
export const StudioLoader = dynamic(() => import('./Studio'), { ssr: false, loading: Splash });
