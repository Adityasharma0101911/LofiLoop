'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DrumType } from '@/lib/audio/drumSynth';
import { TrackSettings } from '@/lib/audio/scheduler';

interface StepGridProps {
    drumPatterns: {
        kick: boolean[];
        snare: boolean[];
        hat: boolean[];
        clap: boolean[];
    };
    synthNotes: (string | null)[];
    currentStep: number;
    onDrumToggle: (track: DrumType, step: number, value: boolean) => void;
    onSynthNoteChange: (step: number, note: string | null) => void;
    trackSettings: TrackSettings;
    onTrackSettingChange: (track: string, setting: 'muted' | 'solo' | 'volume', value: boolean | number) => void;
    availableNotes: string[];
}

const TRACK_LABELS: { id: DrumType; name: string; color: string }[] = [
    { id: 'kick', name: 'KICK', color: 'var(--kick-color)' },
    { id: 'snare', name: 'SNARE', color: 'var(--snare-color)' },
    { id: 'hat', name: 'HAT', color: 'var(--hat-color)' },
    { id: 'clap', name: 'CLAP', color: 'var(--clap-color)' },
];

export default function StepGrid({
    drumPatterns,
    synthNotes,
    currentStep,
    onDrumToggle,
    onSynthNoteChange,
    trackSettings,
    onTrackSettingChange,
    availableNotes,
}: StepGridProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragTrack, setDragTrack] = useState<DrumType | null>(null);
    const [dragValue, setDragValue] = useState(true);
    const [showNoteSelector, setShowNoteSelector] = useState<number | null>(null);
    const noteSelectorRef = useRef<HTMLDivElement>(null);

    // Handle mouse down on step
    const handleStepMouseDown = useCallback((track: DrumType, step: number, e: React.MouseEvent) => {
        e.preventDefault();

        // Right click clears
        if (e.button === 2) {
            onDrumToggle(track, step, false);
            return;
        }

        const currentValue = drumPatterns[track][step];
        const newValue = !currentValue;

        setIsDragging(true);
        setDragTrack(track);
        setDragValue(newValue);

        onDrumToggle(track, step, newValue);
    }, [drumPatterns, onDrumToggle]);

    // Handle mouse enter during drag
    const handleStepMouseEnter = useCallback((track: DrumType, step: number) => {
        if (isDragging && dragTrack === track) {
            onDrumToggle(track, step, dragValue);
        }
    }, [isDragging, dragTrack, dragValue, onDrumToggle]);

    // Handle mouse up
    useEffect(() => {
        const handleMouseUp = () => {
            setIsDragging(false);
            setDragTrack(null);
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    // Handle note selector click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (noteSelectorRef.current && !noteSelectorRef.current.contains(e.target as Node)) {
                setShowNoteSelector(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle synth step click
    const handleSynthStepClick = useCallback((step: number) => {
        if (synthNotes[step]) {
            // If note exists, clear it
            onSynthNoteChange(step, null);
        } else {
            // Show note selector
            setShowNoteSelector(step);
        }
    }, [synthNotes, onSynthNoteChange]);

    // Select a note from the dropdown
    const handleNoteSelect = useCallback((step: number, note: string) => {
        onSynthNoteChange(step, note);
        setShowNoteSelector(null);
    }, [onSynthNoteChange]);

    // Prevent context menu on right click
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
    }, []);

    return (
        <div className="lofi-panel p-6" onContextMenu={handleContextMenu}>
            {/* Beat markers */}
            <div className="flex mb-2 ml-[120px]">
                {Array.from({ length: 16 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-[40px] mx-[3px] text-center text-xs"
                        style={{
                            color: i % 4 === 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontWeight: i % 4 === 0 ? 600 : 400,
                        }}
                    >
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* Drum tracks */}
            {TRACK_LABELS.map(({ id, name, color }) => (
                <div key={id} className="flex items-center mb-2">
                    {/* Track controls */}
                    <div className="w-[120px] flex items-center gap-2 pr-4">
                        <button
                            className={`track-btn ${trackSettings[id]?.muted ? 'muted' : ''}`}
                            onClick={() => onTrackSettingChange(id, 'muted', !trackSettings[id]?.muted)}
                            title="Mute"
                        >
                            M
                        </button>
                        <button
                            className={`track-btn ${trackSettings[id]?.solo ? 'solo' : ''}`}
                            onClick={() => onTrackSettingChange(id, 'solo', !trackSettings[id]?.solo)}
                            title="Solo"
                        >
                            S
                        </button>
                        <span
                            className="text-sm font-medium tracking-wide"
                            style={{ color, minWidth: '50px' }}
                        >
                            {name}
                        </span>
                    </div>

                    {/* Step cells */}
                    <div className="flex gap-[6px]">
                        {drumPatterns[id].map((active, step) => (
                            <div
                                key={step}
                                className={`step-cell ${active ? 'active' : ''} ${currentStep === step ? 'playing' : ''}`}
                                data-track={id}
                                onMouseDown={(e) => handleStepMouseDown(id, step, e)}
                                onMouseEnter={() => handleStepMouseEnter(id, step)}
                                style={{
                                    background: active ? color : undefined,
                                    boxShadow: active ? `0 0 12px ${color}60` : undefined,
                                    opacity: step % 4 === 0 ? 1 : 0.85,
                                }}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Synth track */}
            <div className="flex items-center mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <div className="w-[120px] flex items-center gap-2 pr-4">
                    <button
                        className={`track-btn ${trackSettings.synth?.muted ? 'muted' : ''}`}
                        onClick={() => onTrackSettingChange('synth', 'muted', !trackSettings.synth?.muted)}
                        title="Mute"
                    >
                        M
                    </button>
                    <button
                        className={`track-btn ${trackSettings.synth?.solo ? 'solo' : ''}`}
                        onClick={() => onTrackSettingChange('synth', 'solo', !trackSettings.synth?.solo)}
                        title="Solo"
                    >
                        S
                    </button>
                    <span
                        className="text-sm font-medium tracking-wide"
                        style={{ color: 'var(--synth-color)', minWidth: '50px' }}
                    >
                        SYNTH
                    </span>
                </div>

                {/* Synth step cells with notes */}
                <div className="flex gap-[6px] relative">
                    {synthNotes.map((note, step) => (
                        <div
                            key={step}
                            className={`step-cell ${note ? 'active' : ''} ${currentStep === step ? 'playing' : ''}`}
                            data-track="synth"
                            onClick={() => handleSynthStepClick(step)}
                            style={{
                                background: note ? 'var(--synth-color)' : undefined,
                                boxShadow: note ? '0 0 12px rgba(29, 209, 161, 0.4)' : undefined,
                                opacity: step % 4 === 0 ? 1 : 0.85,
                            }}
                        >
                            {note && (
                                <span
                                    className="text-[9px] font-bold text-[var(--bg-primary)]"
                                    style={{ lineHeight: '40px' }}
                                >
                                    {note.replace(/\d/, '')}
                                </span>
                            )}

                            {/* Note selector dropdown */}
                            {showNoteSelector === step && (
                                <div
                                    ref={noteSelectorRef}
                                    className="absolute top-full left-0 mt-2 z-50 lofi-panel p-2 max-h-[200px] overflow-y-auto"
                                    style={{ minWidth: '60px' }}
                                >
                                    {availableNotes.map((n) => (
                                        <button
                                            key={n}
                                            className="block w-full text-left px-3 py-1 text-sm rounded hover:bg-[var(--step-hover)] transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNoteSelect(step, n);
                                            }}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
