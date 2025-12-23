'use client';

import React from 'react';
import Knob from './Knob';
import { EffectsParams, defaultEffectsParams } from '@/lib/audio/effects';

interface EffectsRackProps {
    params: EffectsParams;
    onChange: (params: EffectsParams) => void;
}

export default function EffectsRack({ params, onChange }: EffectsRackProps) {
    const updateReverb = (key: keyof EffectsParams['reverb'], value: number) => {
        onChange({ ...params, reverb: { ...params.reverb, [key]: value } });
    };

    const updateDelay = (key: keyof EffectsParams['delay'], value: number) => {
        onChange({ ...params, delay: { ...params.delay, [key]: value } });
    };

    const updateDistortion = (key: keyof EffectsParams['distortion'], value: number) => {
        onChange({ ...params, distortion: { ...params.distortion, [key]: value } });
    };

    const updateCompressor = (key: keyof EffectsParams['compressor'], value: number) => {
        onChange({ ...params, compressor: { ...params.compressor, [key]: value } });
    };

    return (
        <div className="lofi-panel p-4">
            <h3 className="text-sm font-semibold tracking-wider mb-4 uppercase" style={{ color: 'var(--text-muted)' }}>
                Effects Rack
            </h3>

            <div className="grid grid-cols-4 gap-4">
                {/* Reverb */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-3 text-center" style={{ color: 'var(--accent-primary)' }}>
                        REVERB
                    </h4>
                    <div className="flex flex-col items-center gap-3">
                        <Knob
                            value={params.reverb.wet}
                            min={0}
                            max={1}
                            step={0.01}
                            label="Wet"
                            onChange={(v) => updateReverb('wet', v)}
                            size="sm"
                            formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                        />
                        <Knob
                            value={params.reverb.decay}
                            min={0.5}
                            max={5}
                            step={0.1}
                            label="Decay"
                            onChange={(v) => updateReverb('decay', v)}
                            size="sm"
                            formatValue={(v) => `${v.toFixed(1)}s`}
                        />
                    </div>
                </div>

                {/* Delay */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-3 text-center" style={{ color: 'var(--hat-color)' }}>
                        DELAY
                    </h4>
                    <div className="flex flex-col items-center gap-3">
                        <Knob
                            value={params.delay.wet}
                            min={0}
                            max={1}
                            step={0.01}
                            label="Wet"
                            onChange={(v) => updateDelay('wet', v)}
                            size="sm"
                            formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                        />
                        <Knob
                            value={params.delay.time}
                            min={0.05}
                            max={1}
                            step={0.01}
                            label="Time"
                            onChange={(v) => updateDelay('time', v)}
                            size="sm"
                            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
                        />
                        <Knob
                            value={params.delay.feedback}
                            min={0}
                            max={0.9}
                            step={0.01}
                            label="Feedback"
                            onChange={(v) => updateDelay('feedback', v)}
                            size="sm"
                            formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                        />
                    </div>
                </div>

                {/* Distortion */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-3 text-center" style={{ color: 'var(--snare-color)' }}>
                        DISTORTION
                    </h4>
                    <div className="flex flex-col items-center gap-3">
                        <Knob
                            value={params.distortion.wet}
                            min={0}
                            max={1}
                            step={0.01}
                            label="Wet"
                            onChange={(v) => updateDistortion('wet', v)}
                            size="sm"
                            formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                        />
                        <Knob
                            value={params.distortion.amount}
                            min={0}
                            max={1}
                            step={0.01}
                            label="Drive"
                            onChange={(v) => updateDistortion('amount', v)}
                            size="sm"
                            formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                        />
                    </div>
                </div>

                {/* Compressor */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-3 text-center" style={{ color: 'var(--synth-color)' }}>
                        COMP
                    </h4>
                    <div className="flex flex-col items-center gap-3">
                        <Knob
                            value={params.compressor.threshold}
                            min={-60}
                            max={0}
                            step={1}
                            label="Thresh"
                            onChange={(v) => updateCompressor('threshold', v)}
                            size="sm"
                            formatValue={(v) => `${v}dB`}
                        />
                        <Knob
                            value={params.compressor.ratio}
                            min={1}
                            max={20}
                            step={0.5}
                            label="Ratio"
                            onChange={(v) => updateCompressor('ratio', v)}
                            size="sm"
                            formatValue={(v) => `${v.toFixed(1)}:1`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
