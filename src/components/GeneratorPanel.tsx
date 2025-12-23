'use client';

import React, { useState } from 'react';
import { generateEuclideanRhythm, mutatePattern, generateFill, applyFillToPattern, getScaleNotes, generateBassline, suggestChordProgression, SCALES } from '@/lib/audio/generator';
import { DrumPattern, SynthPattern } from '@/lib/audio/scheduler';

interface GeneratorPanelProps {
    drumPattern: DrumPattern;
    synthPattern: SynthPattern;
    onDrumPatternChange: (pattern: DrumPattern) => void;
    onSynthPatternChange: (pattern: SynthPattern) => void;
}

export default function GeneratorPanel({
    drumPattern,
    synthPattern,
    onDrumPatternChange,
    onSynthPatternChange,
}: GeneratorPanelProps) {
    const [euclideanHits, setEuclideanHits] = useState(4);
    const [selectedTrack, setSelectedTrack] = useState<'kick' | 'snare' | 'hat' | 'clap'>('hat');
    const [fillGenre, setFillGenre] = useState<'house' | 'trap' | 'dnb'>('house');
    const [scaleRoot, setScaleRoot] = useState('C');
    const [scaleType, setScaleType] = useState('minor');

    const handleEuclideanGenerate = () => {
        const rhythm = generateEuclideanRhythm(euclideanHits, 16);
        onDrumPatternChange({
            ...drumPattern,
            [selectedTrack]: rhythm,
        });
    };

    const handleMutate = () => {
        const mutated: DrumPattern = {
            kick: mutatePattern(drumPattern.kick, { addGhostNotes: true }),
            snare: mutatePattern(drumPattern.snare, { shiftHits: true }),
            hat: mutatePattern(drumPattern.hat, { addGhostNotes: true }),
            clap: mutatePattern(drumPattern.clap, { addFills: true }),
        };
        onDrumPatternChange(mutated);
    };

    const handleAddFill = () => {
        const fill = generateFill(fillGenre);
        const patternWithFill = applyFillToPattern(drumPattern, fill);
        onDrumPatternChange(patternWithFill);
    };

    const handleGenerateBassline = () => {
        const scaleNotes = getScaleNotes(scaleRoot, scaleType, [2, 4]);
        const bassline = generateBassline(scaleNotes, 0.3, [0, 4, 8, 12]);
        onSynthPatternChange({ notes: bassline });
    };

    const handleSuggestChords = () => {
        const progression = suggestChordProgression('lofi');
        alert(`Suggested progression: ${progression.join(' → ')}`);
    };

    return (
        <div className="lofi-panel p-4">
            <h3 className="text-sm font-semibold tracking-wider mb-4 uppercase" style={{ color: 'var(--text-muted)' }}>
                🎲 Pattern Generator
            </h3>

            <div className="space-y-4">
                {/* Euclidean Rhythm */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
                        Euclidean Rhythm
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                        <select
                            value={selectedTrack}
                            onChange={(e) => setSelectedTrack(e.target.value as typeof selectedTrack)}
                            className="text-xs p-1 rounded bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                        >
                            <option value="kick">Kick</option>
                            <option value="snare">Snare</option>
                            <option value="hat">Hat</option>
                            <option value="clap">Clap</option>
                        </select>
                        <input
                            type="range"
                            min="1"
                            max="16"
                            value={euclideanHits}
                            onChange={(e) => setEuclideanHits(Number(e.target.value))}
                            className="lofi-slider flex-1"
                        />
                        <span className="text-xs w-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                            {euclideanHits}
                        </span>
                    </div>
                    <button onClick={handleEuclideanGenerate} className="lofi-button text-xs w-full">
                        Generate {euclideanHits} hits in 16 steps
                    </button>
                </div>

                {/* Pattern Mutation */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--hat-color)' }}>
                        Mutate Pattern
                    </h4>
                    <button onClick={handleMutate} className="lofi-button text-xs w-full">
                        🎲 Create Variation
                    </button>
                </div>

                {/* Drum Fills */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--snare-color)' }}>
                        Add Fill
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                        <select
                            value={fillGenre}
                            onChange={(e) => setFillGenre(e.target.value as typeof fillGenre)}
                            className="text-xs p-1 rounded bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] flex-1"
                        >
                            <option value="house">House</option>
                            <option value="trap">Trap</option>
                            <option value="dnb">D&B</option>
                        </select>
                        <button onClick={handleAddFill} className="lofi-button text-xs">
                            Add Fill
                        </button>
                    </div>
                </div>

                {/* Bassline Generator */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--synth-color)' }}>
                        Bassline Generator
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                        <select
                            value={scaleRoot}
                            onChange={(e) => setScaleRoot(e.target.value)}
                            className="text-xs p-1 rounded bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                        >
                            {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <select
                            value={scaleType}
                            onChange={(e) => setScaleType(e.target.value)}
                            className="text-xs p-1 rounded bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] flex-1"
                        >
                            {Object.keys(SCALES).map(s => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={handleGenerateBassline} className="lofi-button text-xs w-full">
                        Generate Bassline
                    </button>
                </div>

                {/* Chord Suggester */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--clap-color)' }}>
                        Chord Suggester
                    </h4>
                    <button onClick={handleSuggestChords} className="lofi-button text-xs w-full">
                        💡 Suggest Progression
                    </button>
                </div>
            </div>
        </div>
    );
}
