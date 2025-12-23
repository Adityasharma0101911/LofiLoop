'use client';

import React from 'react';
import Knob from './Knob';

interface TransportBarProps {
    isPlaying: boolean;
    bpm: number;
    swing: number;
    masterVolume: number;
    currentPattern: 'A' | 'B';
    onPlay: () => void;
    onStop: () => void;
    onBpmChange: (bpm: number) => void;
    onSwingChange: (swing: number) => void;
    onMasterVolumeChange: (volume: number) => void;
    onPatternChange: (pattern: 'A' | 'B') => void;
}

export default function TransportBar({
    isPlaying,
    bpm,
    swing,
    masterVolume,
    currentPattern,
    onPlay,
    onStop,
    onBpmChange,
    onSwingChange,
    onMasterVolumeChange,
    onPatternChange,
}: TransportBarProps) {
    return (
        <div className="lofi-panel px-6 py-4">
            <div className="flex items-center justify-between gap-8">
                {/* Play/Stop controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={isPlaying ? onStop : onPlay}
                        className={`lofi-button flex items-center justify-center w-14 h-14 rounded-full ${isPlaying ? 'active playing-glow' : ''}`}
                        style={{
                            fontSize: '24px',
                            padding: 0,
                        }}
                        title={isPlaying ? 'Stop' : 'Play'}
                    >
                        {isPlaying ? '■' : '▶'}
                    </button>
                </div>

                {/* BPM control */}
                <div className="flex flex-col items-center gap-2">
                    <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        BPM
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={60}
                            max={180}
                            value={bpm}
                            onChange={(e) => onBpmChange(Number(e.target.value))}
                            className="lofi-slider w-32"
                        />
                        <input
                            type="number"
                            min={60}
                            max={180}
                            value={bpm}
                            onChange={(e) => onBpmChange(Math.min(180, Math.max(60, Number(e.target.value))))}
                            className="w-16 text-center bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg py-1 text-sm"
                            style={{ color: 'var(--text-primary)' }}
                        />
                    </div>
                </div>

                {/* Swing knob */}
                <Knob
                    value={swing}
                    min={0}
                    max={60}
                    step={1}
                    label="Swing"
                    onChange={onSwingChange}
                    size="sm"
                    formatValue={(v) => `${v}%`}
                />

                {/* Pattern switcher */}
                <div className="flex flex-col items-center gap-2">
                    <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        Pattern
                    </label>
                    <div className="flex gap-2">
                        <button
                            className={`pattern-tab ${currentPattern === 'A' ? 'active' : ''}`}
                            onClick={() => onPatternChange('A')}
                        >
                            A
                        </button>
                        <button
                            className={`pattern-tab ${currentPattern === 'B' ? 'active' : ''}`}
                            onClick={() => onPatternChange('B')}
                        >
                            B
                        </button>
                    </div>
                </div>

                {/* Master volume */}
                <Knob
                    value={masterVolume}
                    min={0}
                    max={1}
                    step={0.01}
                    label="Master"
                    onChange={onMasterVolumeChange}
                    size="md"
                    color="var(--accent-primary)"
                    formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                />
            </div>
        </div>
    );
}
