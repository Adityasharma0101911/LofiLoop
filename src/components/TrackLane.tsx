'use client';

import React, { useState } from 'react';
import { Track, Step } from '@/lib/audio/trackEngine';
import { getInstrument, INSTRUMENTS } from '@/lib/audio/instruments';

interface TrackLaneProps {
    track: Track;
    currentStep: number;
    isPlaying: boolean;
    onToggleStep: (stepIndex: number) => void;
    onSetNote: (stepIndex: number, note: string | null) => void;
    onSetVelocity: (stepIndex: number, velocity: number) => void;
    onUpdateTrack: (updates: Partial<Track>) => void;
    onRemoveTrack: () => void;
    onDuplicateTrack: () => void;
    onClearTrack: () => void;
    onChangeInstrument: (instrumentId: string) => void;
    availableNotes: string[];
}

export default function TrackLane({
    track,
    currentStep,
    isPlaying,
    onToggleStep,
    onSetNote,
    onSetVelocity,
    onUpdateTrack,
    onRemoveTrack,
    onDuplicateTrack,
    onClearTrack,
    onChangeInstrument,
    availableNotes,
}: TrackLaneProps) {
    const [showInstrumentPicker, setShowInstrumentPicker] = useState(false);
    const [selectedStep, setSelectedStep] = useState<number | null>(null);

    const instrument = getInstrument(track.instrumentId);
    const isMelodic = instrument?.category === 'bass' || instrument?.category === 'synth';

    return (
        <div
            className="flex items-center gap-2 p-2 rounded-lg transition-all"
            style={{ background: 'var(--bg-tertiary)' }}
        >
            {/* Track controls */}
            <div className="w-40 flex-shrink-0">
                {/* Instrument selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowInstrumentPicker(!showInstrumentPicker)}
                        className="w-full flex items-center gap-2 p-2 rounded text-left text-sm font-medium transition-all hover:brightness-110"
                        style={{ background: instrument?.color || '#666', color: 'white' }}
                    >
                        <span>{instrument?.icon || '🎵'}</span>
                        <span className="truncate flex-1">{track.name}</span>
                    </button>

                    {/* Instrument picker dropdown */}
                    {showInstrumentPicker && (
                        <div
                            className="absolute top-full left-0 mt-1 w-48 max-h-64 overflow-y-auto rounded-lg shadow-xl z-50"
                            style={{ background: 'var(--bg-panel)' }}
                        >
                            {['bass', 'drums', 'synth'].map(category => (
                                <div key={category}>
                                    <div className="px-3 py-1 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        {category}
                                    </div>
                                    {INSTRUMENTS.filter(i => i.category === category).map(inst => (
                                        <button
                                            key={inst.id}
                                            onClick={() => {
                                                onChangeInstrument(inst.id);
                                                onUpdateTrack({ name: inst.name });
                                                setShowInstrumentPicker(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            <span>{inst.icon}</span>
                                            <span>{inst.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Track controls row */}
                <div className="flex items-center gap-1 mt-1">
                    {/* Volume */}
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={track.volume}
                        onChange={(e) => onUpdateTrack({ volume: parseFloat(e.target.value) })}
                        className="w-12 h-1 accent-[var(--accent-primary)]"
                        title={`Volume: ${Math.round(track.volume * 100)}%`}
                    />

                    {/* Pan */}
                    <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        value={track.pan}
                        onChange={(e) => onUpdateTrack({ pan: parseFloat(e.target.value) })}
                        className="w-10 h-1"
                        title={`Pan: ${track.pan > 0 ? 'R' : track.pan < 0 ? 'L' : 'C'}`}
                    />

                    {/* Mute */}
                    <button
                        onClick={() => onUpdateTrack({ muted: !track.muted })}
                        className={`w-6 h-6 rounded text-xs font-bold ${track.muted ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'}`}
                        title="Mute"
                    >
                        M
                    </button>

                    {/* Solo */}
                    <button
                        onClick={() => onUpdateTrack({ solo: !track.solo })}
                        className={`w-6 h-6 rounded text-xs font-bold ${track.solo ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-gray-300'}`}
                        title="Solo"
                    >
                        S
                    </button>

                    {/* Menu */}
                    <div className="relative group">
                        <button className="w-6 h-6 rounded text-xs bg-gray-600 hover:bg-gray-500">⋮</button>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-24 rounded shadow-lg z-50" style={{ background: 'var(--bg-panel)' }}>
                            <button onClick={onDuplicateTrack} className="w-full px-2 py-1 text-xs text-left hover:bg-white/10">📋 Duplicate</button>
                            <button onClick={onClearTrack} className="w-full px-2 py-1 text-xs text-left hover:bg-white/10">🗑️ Clear</button>
                            <button onClick={onRemoveTrack} className="w-full px-2 py-1 text-xs text-left hover:bg-white/10 text-red-400">✕ Remove</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step grid */}
            <div className="flex-1 flex gap-0.5 overflow-x-auto">
                {track.steps.map((step, index) => {
                    const isCurrentlyPlaying = isPlaying && index === currentStep;
                    const isBarStart = index % 4 === 0;

                    return (
                        <div key={index} className="flex flex-col items-center">
                            {/* Note selector for melodic instruments */}
                            {isMelodic && step.active && (
                                <select
                                    value={step.note || ''}
                                    onChange={(e) => onSetNote(index, e.target.value || null)}
                                    className="w-10 text-[9px] rounded mb-0.5 bg-[var(--bg-panel)] text-[var(--text-primary)]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="">--</option>
                                    {availableNotes.map(note => (
                                        <option key={note} value={note}>{note}</option>
                                    ))}
                                </select>
                            )}

                            {/* Step button */}
                            <button
                                onClick={() => onToggleStep(index)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setSelectedStep(selectedStep === index ? null : index);
                                }}
                                className={`w-10 h-10 rounded transition-all ${isBarStart ? 'border-l-2 border-white/20' : ''
                                    }`}
                                style={{
                                    background: step.active
                                        ? `linear-gradient(180deg, ${instrument?.color || '#e94560'} ${100 - step.velocity * 100}%, ${instrument?.color || '#e94560'}dd ${step.velocity * 100}%)`
                                        : 'var(--bg-panel)',
                                    opacity: track.muted ? 0.4 : 1,
                                    boxShadow: isCurrentlyPlaying ? '0 0 12px var(--accent-primary)' : 'none',
                                    transform: isCurrentlyPlaying ? 'scale(1.05)' : 'scale(1)',
                                }}
                            >
                                {step.active && (
                                    <div
                                        className="w-full h-full rounded flex items-end justify-center pb-1 text-[8px] text-white/70"
                                    >
                                        {isMelodic && step.note ? step.note.replace(/\d/, '') : ''}
                                    </div>
                                )}
                            </button>

                            {/* Velocity slider on right-click */}
                            {selectedStep === index && (
                                <div className="absolute mt-12 p-1 rounded shadow-lg z-50" style={{ background: 'var(--bg-panel)' }}>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.05"
                                        value={step.velocity}
                                        onChange={(e) => onSetVelocity(index, parseFloat(e.target.value))}
                                        className="w-20"
                                    />
                                    <div className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
                                        {Math.round(step.velocity * 100)}%
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
