'use client';

import { useMemo, useRef, useState } from 'react';
import { AudioWaveform, Download, FileArchive, FileMusic, Music2 } from 'lucide-react';
import { renderLength, renderMix, renderStems, type RenderMode } from '@/lib/audio/render';
import { audioBufferToPcm, encodeWav, encodeWavBytes, normalize, type WavBitDepth } from '@/lib/export/wav';
import { downloadBlob } from '@/lib/export/download';
import { useStudio } from '@/lib/store/studio';
import { ui, useUi } from '@/lib/store/ui';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { formatBytes, formatDuration, slugify } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

type Format = 'wav' | 'mp3' | 'stems' | 'midi';

const FORMATS: { id: Format; label: string; detail: string; icon: typeof Music2 }[] = [
  { id: 'wav', label: 'WAV', detail: 'Lossless master', icon: AudioWaveform },
  { id: 'mp3', label: 'MP3', detail: 'Small, easy to share', icon: Music2 },
  { id: 'stems', label: 'Stems', detail: 'One WAV per track (.zip)', icon: FileArchive },
  { id: 'midi', label: 'MIDI', detail: 'Notes for your DAW', icon: FileMusic },
];

export function ExportDialog() {
  const open = useUi((s) => s.dialog === 'export');
  const project = useStudio((s) => s.project);
  const [format, setFormat] = useState<Format>('wav');
  const [mode, setMode] = useState<RenderMode>(project.playMode);
  const [repeats, setRepeats] = useState(2);
  const [bitDepth, setBitDepth] = useState<WavBitDepth>(24);
  const [kbps, setKbps] = useState<192 | 320>(320);
  const [sampleRate, setSampleRate] = useState<44100 | 48000>(44100);
  const [tail, setTail] = useState(true);
  const [norm, setNorm] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState('');
  const abort = useRef<AbortController | null>(null);

  const busy = progress !== null;
  const seconds = useMemo(() => renderLength(project, mode, repeats, tail), [project, mode, repeats, tail]);
  const anySolo = project.tracks.some((t) => t.solo);
  const stemCount = project.tracks.filter((t) => !t.mute && (!anySolo || t.solo)).length;
  const estimate =
    format === 'wav'
      ? seconds * sampleRate * 2 * (bitDepth / 8)
      : format === 'mp3'
        ? (seconds * kbps * 1000) / 8
        : format === 'stems'
          ? seconds * sampleRate * 2 * (bitDepth / 8) * stemCount
          : 0;
  const base = `${slugify(project.name)}-${project.bpm}bpm`;

  const run = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setProgress(0);
    try {
      if (format === 'midi') {
        const { exportMidi, midiBlob } = await import('@/lib/export/midi');
        downloadBlob(midiBlob(exportMidi(project, { mode, repeats })), `${base}.mid`);
      } else if (format === 'stems') {
        setStage('Rendering stems');
        const { createZip } = await import('@/lib/export/zip');
        const stems = await renderStems(project, {
          mode,
          repeats,
          sampleRate,
          tail,
          signal: controller.signal,
          onProgress: (p) => setProgress(p * 0.95),
        });
        setStage('Packing zip');
        const files = stems.map((stem, i) => ({
          name: `${base}/${String(i + 1).padStart(2, '0')}-${slugify(stem.track.name)}.wav`,
          data: encodeWavBytes(audioBufferToPcm(stem.buffer), bitDepth),
        }));
        downloadBlob(new Blob([createZip(files)], { type: 'application/zip' }), `${base}-stems.zip`);
      } else {
        setStage('Rendering audio');
        const buffer = await renderMix(project, {
          mode,
          repeats,
          sampleRate,
          tail,
          signal: controller.signal,
          onProgress: (p) => setProgress(p * (format === 'mp3' ? 0.5 : 0.95)),
        });
        let pcm = audioBufferToPcm(buffer);
        if (norm) pcm = normalize(pcm);
        if (format === 'wav') {
          downloadBlob(encodeWav(pcm, bitDepth), `${base}.wav`);
        } else {
          setStage('Encoding MP3');
          const { encodeMp3 } = await import('@/lib/export/mp3');
          const blob = await encodeMp3(pcm, { kbps, signal: controller.signal, onProgress: (p) => setProgress(0.5 + p * 0.5) });
          downloadBlob(blob, `${base}.mp3`);
        }
      }
      ui.toast('Export ready. Check your downloads.', 'success');
      ui.closeDialog();
    } catch (error) {
      if ((error as Error).name === 'AbortError') ui.toast('Export cancelled');
      else {
        console.error(error);
        ui.toast('Export failed. Try a shorter range or another format.', 'error');
      }
    } finally {
      abort.current = null;
      setProgress(null);
      setStage('');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={ui.closeDialog}
      title="Export"
      description={`${project.name} · ${project.bpm} BPM`}
      locked={busy}
      footer={
        busy ? (
          <Button variant="ghost" onClick={() => abort.current?.abort()}>
            Cancel
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={ui.closeDialog}>
              Close
            </Button>
            <Button variant="primary" icon={<Download />} onClick={run}>
              Export {FORMATS.find((f) => f.id === format)?.label}
            </Button>
          </>
        )
      }
    >
      <fieldset disabled={busy} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={format === f.id}
              onClick={() => setFormat(f.id)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                format === f.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2 hover:border-line-strong',
              )}
            >
              <f.icon className={cn('size-5', format === f.id ? 'text-accent' : 'text-fg-muted')} />
              <span className="text-sm font-semibold">{f.label}</span>
              <span className="text-[11px] leading-tight text-fg-muted">{f.detail}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Range</span>
            <Segmented
              label="Range"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'pattern', label: 'Current pattern' },
                { value: 'song', label: `Song (${project.chain.length})` },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Repeat</span>
            <Segmented
              label="Repeat"
              value={String(repeats)}
              onChange={(v) => setRepeats(Number(v))}
              options={['1', '2', '4', '8'].map((v) => ({ value: v, label: `${v}×` }))}
            />
          </div>
          {format !== 'midi' && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-muted">{format === 'mp3' ? 'Bitrate' : 'Bit depth'}</span>
                {format === 'mp3' ? (
                  <Segmented
                    label="Bitrate"
                    value={String(kbps)}
                    onChange={(v) => setKbps(Number(v) as 192 | 320)}
                    options={[
                      { value: '192', label: '192 kbps' },
                      { value: '320', label: '320 kbps' },
                    ]}
                  />
                ) : (
                  <Segmented
                    label="Bit depth"
                    value={String(bitDepth)}
                    onChange={(v) => setBitDepth(Number(v) as WavBitDepth)}
                    options={[
                      { value: '16', label: '16-bit' },
                      { value: '24', label: '24-bit' },
                      { value: '32', label: '32-bit float' },
                    ]}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-muted">Sample rate</span>
                <Segmented
                  label="Sample rate"
                  value={String(sampleRate)}
                  onChange={(v) => setSampleRate(Number(v) as 44100 | 48000)}
                  options={[
                    { value: '44100', label: '44.1 kHz' },
                    { value: '48000', label: '48 kHz' },
                  ]}
                />
              </div>
            </>
          )}
        </div>

        {format !== 'midi' && (
          <div className="rounded-xl border border-line px-3 py-1">
            <Switch checked={tail} onChange={setTail} label="Let effects ring out" description="Adds 3 seconds so reverb and echo tails aren't cut off" />
            {format !== 'stems' && (
              <Switch checked={norm} onChange={setNorm} label="Normalize" description="Raise the peak level to −0.3 dB" />
            )}
          </div>
        )}

        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
          <div>
            <dt className="text-[10px] font-semibold tracking-widest text-fg-subtle uppercase">Length</dt>
            <dd className="font-mono text-sm font-semibold">{formatDuration(seconds)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold tracking-widest text-fg-subtle uppercase">Size</dt>
            <dd className="font-mono text-sm font-semibold">{format === 'midi' ? '< 50 KB' : `~${formatBytes(estimate)}`}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold tracking-widest text-fg-subtle uppercase">Tracks</dt>
            <dd className="font-mono text-sm font-semibold">{format === 'stems' ? `${stemCount} files` : project.tracks.length}</dd>
          </div>
        </dl>
      </fieldset>

      {busy && (
        <div className="mt-5" role="status" aria-live="polite">
          <div className="mb-1.5 flex justify-between text-xs text-fg-muted">
            <span>{stage || 'Preparing'}…</span>
            <span className="font-mono">{Math.round((progress ?? 0) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${Math.max(3, (progress ?? 0) * 100)}%` }} />
          </div>
        </div>
      )}
    </Dialog>
  );
}
