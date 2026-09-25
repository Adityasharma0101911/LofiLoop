'use client';

import dynamic from 'next/dynamic';
import { Logo } from './Logo';

function Splash() {
  return (
    <div className="bg-bg text-fg flex h-dvh flex-col items-center justify-center gap-4" role="status">
      <Logo className="size-12 animate-pulse" />
      <p className="text-fg-muted text-sm">Warming up the tape deck…</p>
    </div>
  );
}

/** The studio relies on Web Audio and localStorage, so it only renders in the browser. */
export const StudioLoader = dynamic(() => import('./Studio'), { ssr: false, loading: Splash });
