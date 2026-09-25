'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Share } from 'lucide-react';
import { createShareUrl } from '@/lib/project/share';
import { getProject } from '@/lib/store/studio';
import { ui, useUi } from '@/lib/store/ui';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

export function ShareDialog() {
  const open = useUi((s) => s.dialog === 'share');
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when reopened
    setUrl(null);
    setCopied(false);
    setError(false);
    createShareUrl(getProject(), window.location.href)
      .then((link) => !cancelled && setUrl(link))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      ui.toast('Copy failed. Select the link and copy it manually.', 'error');
    }
  };

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <Dialog
      open={open}
      onClose={ui.closeDialog}
      title="Share this beat"
      description="The whole beat is packed into the link. Nothing is uploaded, and whoever opens it gets their own copy to remix."
      size="sm"
      footer={
        <>
          {canShare && url && (
            <Button
              variant="ghost"
              icon={<Share />}
              onClick={() => navigator.share({ title: getProject().name, url }).catch(() => undefined)}
            >
              Share…
            </Button>
          )}
          <Button variant="primary" icon={copied ? <Check /> : <Copy />} onClick={copy} disabled={!url}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-danger">This browser can&apos;t create share links. Try downloading the project from the library instead.</p>
      ) : (
        <>
          <textarea
            readOnly
            aria-label="Share link"
            value={url ?? 'Creating link…'}
            onFocus={(e) => e.currentTarget.select()}
            rows={4}
            className="w-full resize-none rounded-lg border border-line bg-surface-2 p-2.5 font-mono text-[11px] leading-relaxed break-all text-fg-muted outline-none focus:border-line-strong"
          />
          {url && <p className="mt-1.5 text-xs text-fg-subtle">{url.length.toLocaleString()} characters</p>}
        </>
      )}
    </Dialog>
  );
}
