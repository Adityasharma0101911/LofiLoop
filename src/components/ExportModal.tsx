'use client';

import React, { useState } from 'react';
import { DrumPattern, SynthPattern, TrackSettings } from '@/lib/audio/scheduler';
import { SynthParams } from '@/lib/audio/synth';
import { exportToWav, downloadBlob } from '@/lib/audio/professionalExporter';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    bpm: number;
    drumPattern: DrumPattern;
    synthPattern: SynthPattern;
    trackSettings: TrackSettings;
    synthParams: SynthParams;
    projectName: string;
}

export default function ExportModal({
    isOpen,
    onClose,
    bpm,
    drumPattern,
    synthPattern,
    trackSettings,
    synthParams,
    projectName,
}: ExportModalProps) {
    const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
    const [loops, setLoops] = useState(4);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleExport = async () => {
        setExporting(true);
        setProgress(0);

        try {
            const blob = await exportToWav(
                bpm,
                drumPattern,
                synthPattern,
                trackSettings,
                synthParams,
                loops,
                (p) => setProgress(p * 100)
            );

            const filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}_${bpm}bpm_${loops}loops.${format}`;
            downloadBlob(blob, filename);

            onClose();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
            setProgress(0);
        }
    };

    if (!isOpen) return null;

    const estimatedDuration = ((60 / bpm) * 4 * loops).toFixed(1);
    const estimatedSize = ((44100 * 2 * 2 * parseFloat(estimatedDuration)) / 1024 / 1024).toFixed(1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
            <div className="lofi-panel p-8 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                        🎵 Export Audio
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-2xl hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                        disabled={exporting}
                    >
                        ×
                    </button>
                </div>

                {/* Format selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Format
                    </label>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setFormat('wav')}
                            className={`flex-1 py-3 px-4 rounded-lg text-center transition-all ${format === 'wav' ? 'ring-2 ring-[#e94560]' : ''}`}
                            style={{
                                background: format === 'wav' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                color: format === 'wav' ? 'white' : 'var(--text-primary)',
                            }}
                        >
                            <span className="text-2xl block mb-1">📀</span>
                            <span className="font-medium">WAV</span>
                            <span className="block text-xs opacity-70">Lossless</span>
                        </button>
                        <button
                            onClick={() => setFormat('mp3')}
                            className={`flex-1 py-3 px-4 rounded-lg text-center transition-all ${format === 'mp3' ? 'ring-2 ring-[#e94560]' : ''}`}
                            style={{
                                background: format === 'mp3' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                color: format === 'mp3' ? 'white' : 'var(--text-primary)',
                            }}
                        >
                            <span className="text-2xl block mb-1">🎧</span>
                            <span className="font-medium">MP3</span>
                            <span className="block text-xs opacity-70">Compressed</span>
                        </button>
                    </div>
                </div>

                {/* Loop count */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Number of Loops
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="16"
                            value={loops}
                            onChange={(e) => setLoops(Number(e.target.value))}
                            className="lofi-slider flex-1"
                            disabled={exporting}
                        />
                        <span className="w-12 text-center font-mono text-lg" style={{ color: 'var(--text-primary)' }}>
                            {loops}x
                        </span>
                    </div>
                </div>

                {/* Info */}
                <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>BPM:</span>
                            <span className="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>{bpm}</span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                            <span className="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>{estimatedDuration}s</span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Est. Size:</span>
                            <span className="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>~{estimatedSize}MB</span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Quality:</span>
                            <span className="ml-2 font-mono" style={{ color: 'var(--synth-color)' }}>44.1kHz 16bit</span>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {exporting && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Rendering...</span>
                            <span className="text-sm font-mono" style={{ color: 'var(--accent-primary)' }}>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                            <div
                                className="h-full transition-all duration-300"
                                style={{
                                    width: `${progress}%`,
                                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Export button */}
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="w-full py-4 rounded-lg font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        color: 'white',
                        boxShadow: '0 4px 20px rgba(233, 69, 96, 0.3)',
                    }}
                >
                    {exporting ? '⏳ Exporting...' : `📥 Export ${format.toUpperCase()}`}
                </button>

                <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    High-quality offline render • Perfect for sharing
                </p>
            </div>
        </div>
    );
}
