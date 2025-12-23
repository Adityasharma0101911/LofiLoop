'use client';

import React, { useState, useCallback, useEffect } from 'react';
import TrackLane from './TrackLane';
import AIPanel from './AIPanel';
import Visualizer from './Visualizer';
import LofiBackground from './LofiBackground';
import BeatExportModal from './BeatExportModal';
import { ThemeSelector } from './ThemeProvider';
import Knob from './Knob';
import {
    BeatProject,
    Track,
    Step,
    createDefaultProject,
    addTrack,
    removeTrack,
    duplicateTrack,
    updateTrack,
    toggleStep,
    setStepNote,
    setStepVelocity,
    clearTrack,
    startPlayback,
    stopPlayback,
    setOnStepCallback,
    isCurrentlyPlaying,
} from '@/lib/audio/trackEngine';
import { INSTRUMENTS, getAvailableNotes, getInstrument } from '@/lib/audio/instruments';
import { resumeAudioContext, setMasterVolume } from '@/lib/audio/audioContext';
import { getAnalyser } from '@/lib/audio/visualizer';

export default function BeatMaker() {
    // Project state
    const [project, setProject] = useState<BeatProject>(createDefaultProject);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);

    // UI state
    const [showExportModal, setShowExportModal] = useState(false);
    const [showAIPanel, setShowAIPanel] = useState(true);
    const [showAddTrack, setShowAddTrack] = useState(false);

    // Set up step callback
    useEffect(() => {
        setOnStepCallback((step) => {
            setCurrentStep(step);
        });
    }, []);

    // Sync BPM with playback on change
    useEffect(() => {
        if (isPlaying) {
            stopPlayback();
            startPlayback(project);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.bpm]);

    // Play/Stop handlers
    const handlePlay = useCallback(() => {
        resumeAudioContext();
        getAnalyser();
        setIsPlaying(true);
        startPlayback(project);
    }, [project]);

    const handleStop = useCallback(() => {
        stopPlayback();
        setIsPlaying(false);
        setCurrentStep(-1);
    }, []);

    const handlePlayStop = useCallback(() => {
        if (isPlaying) {
            handleStop();
        } else {
            handlePlay();
        }
    }, [isPlaying, handlePlay, handleStop]);

    // Track handlers
    const handleAddTrack = useCallback((instrumentId: string) => {
        setProject(prev => addTrack(prev, instrumentId));
        setShowAddTrack(false);
    }, []);

    const handleRemoveTrack = useCallback((trackId: string) => {
        setProject(prev => removeTrack(prev, trackId));
    }, []);

    const handleDuplicateTrack = useCallback((trackId: string) => {
        setProject(prev => duplicateTrack(prev, trackId));
    }, []);

    const handleUpdateTrack = useCallback((trackId: string, updates: Partial<Track>) => {
        setProject(prev => updateTrack(prev, trackId, updates));
    }, []);

    const handleToggleStep = useCallback((trackId: string, stepIndex: number) => {
        setProject(prev => toggleStep(prev, trackId, stepIndex));
    }, []);

    const handleSetNote = useCallback((trackId: string, stepIndex: number, note: string | null) => {
        setProject(prev => setStepNote(prev, trackId, stepIndex, note));
    }, []);

    const handleSetVelocity = useCallback((trackId: string, stepIndex: number, velocity: number) => {
        setProject(prev => setStepVelocity(prev, trackId, stepIndex, velocity));
    }, []);

    const handleClearTrack = useCallback((trackId: string) => {
        setProject(prev => clearTrack(prev, trackId));
    }, []);

    const handleChangeInstrument = useCallback((trackId: string, instrumentId: string) => {
        setProject(prev => updateTrack(prev, trackId, { instrumentId }));
    }, []);

    // BPM/Swing handlers
    const handleBpmChange = useCallback((bpm: number) => {
        setProject(prev => ({ ...prev, bpm: Math.max(60, Math.min(200, bpm)) }));
    }, []);

    const handleSwingChange = useCallback((swing: number) => {
        setProject(prev => ({ ...prev, swing }));
    }, []);

    const handleMasterVolumeChange = useCallback((vol: number) => {
        setProject(prev => ({ ...prev, masterVolume: vol }));
        setMasterVolume(vol);
    }, []);

    // Key/Scale handlers
    const handleKeyChange = useCallback((key: string) => {
        setProject(prev => ({ ...prev, key }));
    }, []);

    const handleScaleChange = useCallback((scale: string) => {
        setProject(prev => ({ ...prev, scale }));
    }, []);

    // AI apply patterns
    const handleApplyAIPatterns = useCallback((patterns: { [instrumentId: string]: Step[] }) => {
        setProject(prev => {
            let newProject = { ...prev };

            for (const [instrumentId, steps] of Object.entries(patterns)) {
                // Find existing track with this instrument or create new
                let track = newProject.tracks.find(t => t.instrumentId === instrumentId);

                if (track) {
                    // Update existing track
                    newProject = updateTrack(newProject, track.id, { steps });
                } else {
                    // Create new track with pattern
                    newProject = addTrack(newProject, instrumentId);
                    const newTrack = newProject.tracks[newProject.tracks.length - 1];
                    newProject = updateTrack(newProject, newTrack.id, { steps });
                }
            }

            return newProject;
        });
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;
            if (e.code === 'Space') {
                e.preventDefault();
                handlePlayStop();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePlayStop]);

    const availableNotes = getAvailableNotes();

    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            <LofiBackground scene="particles" intensity={0.2} />

            {/* Header */}
            <header className="relative z-10 px-4 py-2 flex items-center justify-between border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-4">
                    <h1
                        className="text-2xl font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #e94560, #ff6b6b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Beat Maker Pro
                    </h1>
                    <input
                        type="text"
                        value={project.name}
                        onChange={(e) => setProject(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-transparent border-b px-2 py-1 text-sm focus:outline-none"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                </div>

                {/* Transport */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handlePlayStop}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110"
                        style={{ background: isPlaying ? '#e94560' : 'var(--accent-primary)' }}
                    >
                        {isPlaying ? '⏹' : '▶️'}
                    </button>

                    <div className="flex items-center gap-3">
                        <Knob
                            value={project.bpm}
                            min={60}
                            max={200}
                            step={1}
                            label="BPM"
                            size="sm"
                            onChange={handleBpmChange}
                            formatValue={(v) => v.toFixed(0)}
                        />
                        <Knob
                            value={project.swing}
                            min={0}
                            max={50}
                            step={1}
                            label="Swing"
                            size="sm"
                            onChange={handleSwingChange}
                            formatValue={(v) => `${v}%`}
                        />
                        <Knob
                            value={project.masterVolume}
                            min={0}
                            max={1}
                            step={0.01}
                            label="Master"
                            size="sm"
                            onChange={handleMasterVolumeChange}
                            formatValue={(v) => `${Math.round(v * 100)}%`}
                        />
                    </div>

                    {/* Key/Scale */}
                    <div className="flex items-center gap-2">
                        <select
                            value={project.key}
                            onChange={(e) => handleKeyChange(e.target.value)}
                            className="bg-[var(--bg-tertiary)] text-sm rounded px-2 py-1"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                        <select
                            value={project.scale}
                            onChange={(e) => handleScaleChange(e.target.value)}
                            className="bg-[var(--bg-tertiary)] text-sm rounded px-2 py-1"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <option value="minor">Minor</option>
                            <option value="major">Major</option>
                            <option value="pentatonic_minor">Pent Minor</option>
                            <option value="pentatonic_major">Pent Major</option>
                            <option value="blues">Blues</option>
                            <option value="dorian">Dorian</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAIPanel(!showAIPanel)}
                        className={`px-3 py-2 rounded text-sm font-medium ${showAIPanel ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}`}
                    >
                        🤖 AI
                    </button>
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="px-4 py-2 rounded text-sm font-medium"
                        style={{ background: 'linear-gradient(135deg, #e94560, #ff6b6b)', color: 'white' }}
                    >
                        📥 Export
                    </button>
                    <ThemeSelector />
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Track area */}
                <main className="flex-1 flex flex-col overflow-hidden p-4">
                    {/* Visualizer */}
                    <div className="mb-3">
                        <Visualizer isPlaying={isPlaying} mode="both" height={60} />
                    </div>

                    {/* Step indicators */}
                    <div className="flex gap-0.5 mb-2 pl-[168px]">
                        {Array.from({ length: project.stepsPerBar * project.bars }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-10 h-4 flex items-center justify-center text-[9px] font-mono rounded-t ${i === currentStep ? 'bg-[var(--accent-primary)]' : i % 4 === 0 ? 'bg-white/10' : 'bg-transparent'
                                    }`}
                                style={{ color: i === currentStep ? 'white' : 'var(--text-muted)' }}
                            >
                                {i % 4 === 0 ? i / 4 + 1 : ''}
                            </div>
                        ))}
                    </div>

                    {/* Tracks */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {project.tracks.map(track => (
                            <TrackLane
                                key={track.id}
                                track={track}
                                currentStep={currentStep}
                                isPlaying={isPlaying}
                                onToggleStep={(stepIdx) => handleToggleStep(track.id, stepIdx)}
                                onSetNote={(stepIdx, note) => handleSetNote(track.id, stepIdx, note)}
                                onSetVelocity={(stepIdx, vel) => handleSetVelocity(track.id, stepIdx, vel)}
                                onUpdateTrack={(updates) => handleUpdateTrack(track.id, updates)}
                                onRemoveTrack={() => handleRemoveTrack(track.id)}
                                onDuplicateTrack={() => handleDuplicateTrack(track.id)}
                                onClearTrack={() => handleClearTrack(track.id)}
                                onChangeInstrument={(instId) => handleChangeInstrument(track.id, instId)}
                                availableNotes={availableNotes}
                            />
                        ))}

                        {/* Add track button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowAddTrack(!showAddTrack)}
                                className="w-full py-3 rounded-lg border-2 border-dashed transition-all hover:border-[var(--accent-primary)] hover:bg-white/5"
                                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                            >
                                + Add Track
                            </button>

                            {showAddTrack && (
                                <div
                                    className="absolute top-full left-0 mt-2 w-full max-h-64 overflow-y-auto rounded-lg shadow-xl z-50 grid grid-cols-3 gap-2 p-2"
                                    style={{ background: 'var(--bg-panel)' }}
                                >
                                    {INSTRUMENTS.map(inst => (
                                        <button
                                            key={inst.id}
                                            onClick={() => handleAddTrack(inst.id)}
                                            className="flex items-center gap-2 p-2 rounded text-left hover:bg-white/10"
                                        >
                                            <span
                                                className="w-8 h-8 rounded flex items-center justify-center text-lg"
                                                style={{ background: inst.color }}
                                            >
                                                {inst.icon}
                                            </span>
                                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{inst.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* AI Panel */}
                {showAIPanel && (
                    <aside className="w-80 p-4 overflow-y-auto border-l" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                        <AIPanel project={project} onApplySuggestion={handleApplyAIPatterns} />
                    </aside>
                )}
            </div>

            {/* Export modal */}
            <BeatExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                project={project}
            />

            {/* Footer */}
            <footer className="relative z-10 px-4 py-2 text-center text-xs border-t" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                {project.tracks.length} tracks • {project.stepsPerBar * project.bars} steps • {project.key} {project.scale} • Press Space to play/stop
            </footer>
        </div>
    );
}
