'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Sample, UserSample, loadSampleFromFile, generateId } from '@/lib/audio/sampleLibrary';
import { getAudioContext } from '@/lib/audio/audioContext';

interface SampleBrowserProps {
    userSamples: UserSample[];
    onSampleLoad: (sample: UserSample) => void;
    onSampleSelect: (sampleId: string) => void;
    selectedSampleId: string | null;
}

const CATEGORIES: { id: Sample['category']; name: string; icon: string }[] = [
    { id: 'kick', name: 'Kicks', icon: '🥁' },
    { id: 'snare', name: 'Snares', icon: '🪘' },
    { id: 'hat', name: 'Hi-Hats', icon: '🔔' },
    { id: 'clap', name: 'Claps', icon: '👏' },
    { id: 'percussion', name: 'Perc', icon: '🎵' },
    { id: 'bass', name: 'Bass', icon: '🎸' },
    { id: 'fx', name: 'FX', icon: '✨' },
    { id: 'vocal', name: 'Vocals', icon: '🎤' },
    { id: 'melody', name: 'Melody', icon: '🎹' },
];

export default function SampleBrowser({
    userSamples,
    onSampleLoad,
    onSampleSelect,
    selectedSampleId,
}: SampleBrowserProps) {
    const [activeCategory, setActiveCategory] = useState<Sample['category']>('kick');
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter samples by category
    const filteredSamples = userSamples.filter(s => s.category === activeCategory);

    // Handle file upload
    const handleFileUpload = useCallback(async (files: FileList) => {
        setLoading(true);
        const ctx = getAudioContext();

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('audio/')) continue;

            try {
                const buffer = await loadSampleFromFile(ctx, file);
                const sample: UserSample = {
                    id: generateId(),
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    category: activeCategory,
                    buffer,
                    file,
                };
                onSampleLoad(sample);
            } catch (error) {
                console.error('Failed to load sample:', file.name, error);
            }
        }

        setLoading(false);
    }, [activeCategory, onSampleLoad]);

    // Handle drag and drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    // Play preview
    const handlePreview = useCallback((sample: UserSample) => {
        const ctx = getAudioContext();
        const source = ctx.createBufferSource();
        source.buffer = sample.buffer;
        source.connect(ctx.destination);
        source.start();
    }, []);

    return (
        <div className="lofi-panel p-4 h-full flex flex-col">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                🎧 Sample Browser
            </h3>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-1 mb-4">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-2 py-1 rounded text-xs transition-all ${activeCategory === cat.id ? 'ring-1 ring-white' : ''
                            }`}
                        style={{
                            background: activeCategory === cat.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        {cat.icon} {cat.name}
                    </button>
                ))}
            </div>

            {/* Drop zone */}
            <div
                className={`border-2 border-dashed rounded-lg p-4 mb-4 text-center transition-all ${dragOver ? 'scale-105' : ''
                    }`}
                style={{
                    borderColor: dragOver ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: dragOver ? 'rgba(233, 69, 96, 0.1)' : 'transparent',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                />

                {loading ? (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Loading...
                    </span>
                ) : (
                    <>
                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Drag & drop audio files here
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="lofi-button text-xs"
                        >
                            📁 Browse Files
                        </button>
                    </>
                )}
            </div>

            {/* Sample list */}
            <div className="flex-1 overflow-y-auto space-y-1">
                {filteredSamples.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                        No samples in this category.<br />
                        Upload some audio files!
                    </p>
                ) : (
                    filteredSamples.map((sample) => (
                        <div
                            key={sample.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${selectedSampleId === sample.id ? 'ring-1 ring-white' : ''
                                }`}
                            style={{
                                background: selectedSampleId === sample.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            }}
                            onClick={() => onSampleSelect(sample.id)}
                            onDoubleClick={() => handlePreview(sample)}
                        >
                            {/* Waveform preview */}
                            <div
                                className="w-12 h-8 rounded flex-shrink-0"
                                style={{ background: 'var(--bg-panel)' }}
                            >
                                <WaveformPreview buffer={sample.buffer} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                    {sample.name}
                                </p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    {(sample.buffer.duration).toFixed(2)}s
                                </p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreview(sample);
                                }}
                                className="p-1 rounded hover:bg-white/10"
                            >
                                ▶️
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Simple waveform preview component
function WaveformPreview({ buffer }: { buffer: AudioBuffer }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(233, 69, 96, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, amp);

        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[i * step + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.lineTo(i, (1 + min) * amp);
        }

        for (let i = canvas.width - 1; i >= 0; i--) {
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[i * step + j];
                if (datum > max) max = datum;
            }
            ctx.lineTo(i, (1 + max) * amp);
        }

        ctx.closePath();
        ctx.fill();
    }, [buffer]);

    return <canvas ref={canvasRef} width={48} height={32} className="w-full h-full" />;
}
