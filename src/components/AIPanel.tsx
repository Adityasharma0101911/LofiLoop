'use client';

import React, { useState } from 'react';
import { GENRES, getAISuggestions, AISuggestion } from '@/lib/audio/aiGenerator';
import { BeatProject } from '@/lib/audio/trackEngine';

interface AIPanelProps {
    project: BeatProject;
    onApplySuggestion: (patterns: { [instrumentId: string]: import('@/lib/audio/trackEngine').Step[] }) => void;
}

export default function AIPanel({ project, onApplySuggestion }: AIPanelProps) {
    const [selectedGenre, setSelectedGenre] = useState('trap');
    const [isGenerating, setIsGenerating] = useState(false);

    const suggestions = getAISuggestions(
        selectedGenre,
        project.key,
        project.scale,
        project.stepsPerBar * project.bars
    );

    const handleApply = async (suggestion: AISuggestion) => {
        setIsGenerating(true);

        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));

        const patterns = suggestion.apply();
        onApplySuggestion(patterns);

        setIsGenerating(false);
    };

    return (
        <div className="lofi-panel p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>
                    🤖 AI Beat Generator
                </h3>
                {isGenerating && (
                    <span className="text-sm animate-pulse" style={{ color: 'var(--synth-color)' }}>
                        Generating...
                    </span>
                )}
            </div>

            {/* Genre selector */}
            <div className="mb-4">
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Genre Style
                </label>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(GENRES).map(([id, genre]) => (
                        <button
                            key={id}
                            onClick={() => setSelectedGenre(id)}
                            className={`px-3 py-1 rounded text-sm transition-all ${selectedGenre === id ? 'ring-2 ring-white' : ''
                                }`}
                            style={{
                                background: selectedGenre === id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            {genre.name}
                        </button>
                    ))}
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {GENRES[selectedGenre]?.characteristics.join(' • ')}
                </p>
            </div>

            {/* Key and Scale */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                        Key
                    </label>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {project.key}
                    </span>
                </div>
                <div>
                    <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                        Scale
                    </label>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {project.scale}
                    </span>
                </div>
            </div>

            {/* AI Suggestions */}
            <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Quick Generate
                </label>
                <div className="space-y-2">
                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleApply(suggestion)}
                            disabled={isGenerating}
                            className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:scale-[1.02] disabled:opacity-50"
                            style={{ background: 'var(--bg-tertiary)' }}
                        >
                            <span className="text-2xl">
                                {suggestion.type === 'drum' ? '🥁' :
                                    suggestion.type === 'bass' ? '🎸' :
                                        suggestion.type === 'melody' ? '🎵' : '✨'}
                            </span>
                            <div className="flex-1">
                                <span className="block font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {suggestion.name}
                                </span>
                                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {suggestion.description}
                                </span>
                            </div>
                            <span className="text-lg">🪄</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* BPM Suggestion */}
            <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--bg-panel)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    💡 <strong>{GENRES[selectedGenre]?.name}</strong> typically uses{' '}
                    <strong>{GENRES[selectedGenre]?.bpmRange[0]}-{GENRES[selectedGenre]?.bpmRange[1]} BPM</strong>
                </p>
            </div>
        </div>
    );
}
