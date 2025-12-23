'use client';

import React, { useState } from 'react';
import { BeatProject } from '@/lib/audio/trackEngine';
import { exportBeatToWav, exportBeatToMp3 } from '@/lib/audio/beatExporter';

interface BeatExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: BeatProject;
}

export default function BeatExportModal({ isOpen, onClose, project }: BeatExportModalProps) {
    const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
    const [loops, setLoops] = useState(4);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);

    if (!isOpen) return null;

    const stepDuration = 60 / project.bpm / 4;
    const totalSteps = project.stepsPerBar * project.bars;
    const duration = stepDuration * totalSteps * loops;
    const estimatedSize = format === 'wav'
        ? Math.round(duration * 44100 * 2 * 2 / 1024) // 16-bit stereo
        : Math.round(duration * 44100 * 2 * 2 / 1024 / 5); // ~5x compression for MP3

    const handleExport = async () => {
        setExporting(true);
        setProgress(0);

        try {
            const blob = format === 'wav'
                ? await exportBeatToWav(project, loops, setProgress)
                : await exportBeatToMp3(project, loops, setProgress);

            // Download the file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${project.bpm}bpm.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            onClose();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
            setProgress(0);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-md m-4 p-6 rounded-2xl shadow-2xl"
                style={{ background: 'var(--bg-panel)' }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                    style={{ color: 'var(--text-muted)' }}
                >
                    ✕
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>
                        📥 Export Beat
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {project.name} • {project.bpm} BPM • {project.tracks.length} tracks
                    </p>
                </div>

                {/* Format selection */}
                <div className="mb-6">
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        Format
                    </label>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setFormat('wav')}
                            className={`flex-1 py-4 px-4 rounded-lg text-center transition-all ${format === 'wav' ? 'ring-2 ring-[#e94560]' : ''}`}
                            style={{
                                background: format === 'wav' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                color: format === 'wav' ? 'white' : 'var(--text-primary)',
                            }}
                        >
                            <span className="text-3xl block mb-2">📀</span>
                            <span className="font-bold">WAV</span>
                            <span className="block text-xs opacity-70">Lossless • Best Quality</span>
                        </button>
                        <button
                            onClick={() => setFormat('mp3')}
                            className={`flex-1 py-4 px-4 rounded-lg text-center transition-all ${format === 'mp3' ? 'ring-2 ring-[#e94560]' : ''}`}
                            style={{
                                background: format === 'mp3' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                color: format === 'mp3' ? 'white' : 'var(--text-primary)',
                            }}
                        >
                            <span className="text-3xl block mb-2">🎧</span>
                            <span className="font-bold">MP3</span>
                            <span className="block text-xs opacity-70">Compressed • Smaller</span>
                        </button>
                    </div>
                </div>

                {/* Loop count */}
                <div className="mb-6">
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        Number of Loops: {loops}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="16"
                        value={loops}
                        onChange={(e) => setLoops(parseInt(e.target.value))}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        <span>1 loop</span>
                        <span>16 loops</span>
                    </div>
                </div>

                {/* Export info */}
                <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Duration</p>
                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Est. Size</p>
                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                {estimatedSize > 1024 ? `${(estimatedSize / 1024).toFixed(1)} MB` : `${estimatedSize} KB`}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Quality</p>
                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                44.1kHz
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {exporting && (
                    <div className="mb-6">
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                            <div
                                className="h-full transition-all"
                                style={{
                                    width: `${progress * 100}%`,
                                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                                }}
                            />
                        </div>
                        <p className="text-center text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                            Rendering audio... {Math.round(progress * 100)}%
                        </p>
                    </div>
                )}

                {/* Export button */}
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="w-full py-4 rounded-lg font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: 'linear-gradient(135deg, #e94560, #ff6b6b)',
                        color: 'white',
                        boxShadow: '0 4px 20px rgba(233, 69, 96, 0.3)',
                    }}
                >
                    {exporting ? '⏳ Exporting...' : `📥 Export ${format.toUpperCase()}`}
                </button>
            </div>
        </div>
    );
}
