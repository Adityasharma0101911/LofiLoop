'use client';

import { DELAY_DIVISIONS, type MasterFx } from '@/lib/project/types';
import { actions, useStudio } from '@/lib/store/studio';
import { Knob } from '@/components/ui/Knob';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { defaultFx } from '@/lib/project/factory';
import { reverbSeconds, toneFrequency } from '@/lib/audio/fx';
import { formatPercent } from '@/lib/utils/format';

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="border-line bg-surface-2/50 rounded-xl border p-3">
      <header className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-fg-subtle text-xs">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

const PRESETS: { name: string; fx: Partial<MasterFx> }[] = [
  { name: 'Clean', fx: { tone: 1, crackle: 0, wow: 0, crush: 0, drive: 0, glue: 0.2 } },
  { name: 'Dusty', fx: { tone: 0.62, crackle: 0.4, wow: 0.3, crush: 0, drive: 0.3, glue: 0.45 } },
  { name: 'Old tape', fx: { tone: 0.5, crackle: 0.25, wow: 0.65, crush: 0.1, drive: 0.45, glue: 0.5 } },
  { name: 'Radio', fx: { tone: 0.35, crackle: 0.15, wow: 0.15, crush: 0.45, drive: 0.5, glue: 0.6 } },
];

export function FxPanel() {
  const fx = useStudio((s) => s.project.fx);
  const volume = useStudio((s) => s.project.volume);
  const set = (patch: Partial<MasterFx>) => actions.setFx(patch);
  const d = defaultFx();

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <Button key={p.name} size="xs" variant="outline" onClick={() => actions.setFx(p.fx, `preset:${p.name}`)}>
            {p.name}
          </Button>
        ))}
      </div>
      <Card title="Tape" subtitle="The lofi character: warmth, wobble and dust">
        <div className="grid grid-cols-3 gap-y-3">
          <Knob
            label="Tone"
            value={fx.tone}
            min={0}
            max={1}
            defaultValue={d.tone}
            format={(v) => `${(toneFrequency(v) / 1000).toFixed(1)}k`}
            onChange={(v) => set({ tone: v })}
          />
          <Knob
            label="Drive"
            value={fx.drive}
            min={0}
            max={1}
            defaultValue={d.drive}
            format={formatPercent}
            onChange={(v) => set({ drive: v })}
          />
          <Knob
            label="Wow"
            value={fx.wow}
            min={0}
            max={1}
            defaultValue={d.wow}
            format={formatPercent}
            onChange={(v) => set({ wow: v })}
          />
          <Knob
            label="Crackle"
            value={fx.crackle}
            min={0}
            max={1}
            defaultValue={d.crackle}
            format={formatPercent}
            onChange={(v) => set({ crackle: v })}
          />
          <Knob
            label="Crush"
            value={fx.crush}
            min={0}
            max={1}
            defaultValue={0}
            format={(v) => (v < 0.01 ? 'Off' : `${Math.round(14 - v * 10)} bit`)}
            onChange={(v) => set({ crush: v })}
          />
          <Knob
            label="Glue"
            value={fx.glue}
            min={0}
            max={1}
            defaultValue={d.glue}
            format={formatPercent}
            onChange={(v) => set({ glue: v })}
          />
        </div>
      </Card>
      <Card title="Space" subtitle="Send levels live on each track's Mix knobs">
        <div className="grid grid-cols-4 gap-y-3">
          <Knob
            label="Room"
            value={fx.reverbSize}
            min={0}
            max={1}
            defaultValue={d.reverbSize}
            format={(v) => `${reverbSeconds(v).toFixed(1)} s`}
            onChange={(v) => set({ reverbSize: v })}
          />
          <Knob
            label="Reverb"
            value={fx.reverbMix}
            min={0}
            max={1}
            defaultValue={d.reverbMix}
            format={formatPercent}
            onChange={(v) => set({ reverbMix: v })}
          />
          <Knob
            label="Echo"
            value={fx.delayMix}
            min={0}
            max={1}
            defaultValue={d.delayMix}
            format={formatPercent}
            onChange={(v) => set({ delayMix: v })}
          />
          <Knob
            label="Feedback"
            value={fx.delayFeedback}
            min={0}
            max={0.9}
            defaultValue={d.delayFeedback}
            format={formatPercent}
            onChange={(v) => set({ delayFeedback: v })}
          />
        </div>
        <div className="mt-3">
          <Segmented
            label="Delay time"
            size="xs"
            value={fx.delayDivision}
            onChange={(v) => actions.setFx({ delayDivision: v })}
            options={DELAY_DIVISIONS.map((v) => ({ value: v, label: v.replace('d', '.').replace('t', 'T') }))}
            className="w-full [&>button]:flex-1"
          />
        </div>
      </Card>
      <Card title="Master" subtitle="Output level after the safety limiter">
        <Knob
          label="Volume"
          value={volume}
          min={0}
          max={1}
          defaultValue={0.8}
          format={formatPercent}
          onChange={actions.setVolume}
        />
      </Card>
    </div>
  );
}
