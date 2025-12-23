'use client';

import React from 'react';
import Knob from './Knob';
import { SynthParams, OscillatorType } from '@/lib/audio/synth';

interface SynthPanelProps {
    params: SynthParams;
    onChange: (params: Partial<SynthParams>) => void;
    presets: { name: string }[];
    onPresetChange: (name: string) => void;
    currentPreset: string;
}

const WAVEFORMS: { id: OscillatorType; label: string; icon: string }[] = [
    { id: 'sine', label: 'Sine', icon: '∿' },
    { id: 'triangle', label: 'Triangle', icon: '△' },
    { id: 'sawtooth', label: 'Saw', icon: '⊿' },
    { id: 'square', label: 'Square', icon: '⊓' },
];

export default function SynthPanel({
    params,
    onChange,
    presets,
    onPresetChange,
    currentPreset,
}: SynthPanelProps) {
    return (
        <div className="lofi-panel p-5">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold tracking-wide" style={{ color: 'var(--synth-color)' }}>
                    SYNTH
                </h3>

                {/* Preset selector */}
                <select
                    value={currentPreset}
                    onChange={(e) => onPresetChange(e.target.value)}
                    className="lofi-button text-sm py-2 px-3 bg-[var(--bg-tertiary)]"
                    style={{ border: '1px solid var(--border-subtle)' }}
                >
                    {presets.map((p) => (
                        <option key={p.name} value={p.name}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Oscillator section */}
            <div className="mb-6">
                <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                    Oscillator
                </h4>

                {/* Waveform selector */}
                <div className="flex gap-2 mb-4">
                    {WAVEFORMS.map(({ id, label, icon }) => (
                        <button
                            key={id}
                            className={`waveform-btn flex-1 ${params.waveform === id ? 'active' : ''}`}
                            onClick={() => onChange({ waveform: id })}
                            title={label}
                        >
                            <span className="text-lg">{icon}</span>
                        </button>
                    ))}
                </div>

                {/* Detune knob */}
                <div className="flex justify-center">
                    <Knob
                        value={params.detune}
                        min={-50}
                        max={50}
                        step={1}
                        label="Detune"
                        onChange={(v) => onChange({ detune: v })}
                        size="sm"
                        formatValue={(v) => `${v > 0 ? '+' : ''}${v}¢`}
                    />
                </div>
            </div>

            {/* Envelope section */}
            <div className="mb-6">
                <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                    Envelope
                </h4>

                <div className="grid grid-cols-4 gap-3">
                    <Knob
                        value={params.attack}
                        min={0.001}
                        max={1}
                        step={0.01}
                        label="Attack"
                        onChange={(v) => onChange({ attack: v })}
                        size="sm"
                        formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
                    />
                    <Knob
                        value={params.decay}
                        min={0.01}
                        max={2}
                        step={0.01}
                        label="Decay"
                        onChange={(v) => onChange({ decay: v })}
                        size="sm"
                        formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
                    />
                    <Knob
                        value={params.sustain}
                        min={0}
                        max={1}
                        step={0.01}
                        label="Sustain"
                        onChange={(v) => onChange({ sustain: v })}
                        size="sm"
                        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <Knob
                        value={params.release}
                        min={0.01}
                        max={3}
                        step={0.01}
                        label="Release"
                        onChange={(v) => onChange({ release: v })}
                        size="sm"
                        formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
                    />
                </div>
            </div>

            {/* Filter section */}
            <div className="mb-4">
                <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                    Filter
                </h4>

                <div className="grid grid-cols-2 gap-4">
                    <Knob
                        value={params.filterCutoff}
                        min={50}
                        max={15000}
                        step={10}
                        label="Cutoff"
                        onChange={(v) => onChange({ filterCutoff: v })}
                        size="md"
                        formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${v.toFixed(0)}Hz`}
                    />
                    <Knob
                        value={params.filterResonance}
                        min={0}
                        max={20}
                        step={0.1}
                        label="Resonance"
                        onChange={(v) => onChange({ filterResonance: v })}
                        size="md"
                        formatValue={(v) => v.toFixed(1)}
                    />
                </div>
            </div>

            {/* Volume */}
            <div className="flex justify-center pt-4 border-t border-[var(--border-subtle)]">
                <Knob
                    value={params.volume}
                    min={0}
                    max={1}
                    step={0.01}
                    label="Volume"
                    onChange={(v) => onChange({ volume: v })}
                    size="md"
                    color="var(--synth-color)"
                    formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                />
            </div>
        </div>
    );
}
