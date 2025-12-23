'use client';

import React, { useState, useCallback, useEffect } from 'react';
import TransportBar from '@/components/TransportBar';
import StepGrid from '@/components/StepGrid';
import SynthPanel from '@/components/SynthPanel';
import PresetBar from '@/components/PresetBar';
import LoadModal from '@/components/LoadModal';
import Visualizer from '@/components/Visualizer';
import EffectsRack from '@/components/EffectsRack';
import GeneratorPanel from '@/components/GeneratorPanel';
import { ThemeSelector } from '@/components/ThemeProvider';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '@/components/KeyboardShortcuts';
import {
    startScheduler,
    stopScheduler,
    setOnStepChange,
    createEmptyDrumPattern,
    createEmptySynthPattern,
    createDefaultTrackSettings,
    DrumPattern,
    SynthPattern,
    TrackSettings,
} from '@/lib/audio/scheduler';
import { setMasterVolume, resumeAudioContext } from '@/lib/audio/audioContext';
import { getAnalyser } from '@/lib/audio/visualizer';
import { initializeEffects, updateEffects, EffectsParams, defaultEffectsParams } from '@/lib/audio/effects';
import { startRecording, stopRecording, isRecording, exportToMidi, encodeProjectToUrl } from '@/lib/audio/exporter';
import { defaultSynthParams, SynthParams, getAllNotes } from '@/lib/audio/synth';
import { DrumType } from '@/lib/audio/drumSynth';
import { drumPresets, getDrumPreset } from '@/lib/presets/drumPresets';
import { synthPresets, getSynthPreset } from '@/lib/presets/synthPresets';
import {
    Project,
    saveProject,
    downloadProjectAsFile,
    importProjectFromJSON,
} from '@/lib/storage/projectStorage';

export default function LoopWorkstation() {
    // Transport state
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(85);
    const [swing, setSwing] = useState(15);
    const [masterVolume, setMasterVolumeState] = useState(0.8);
    const [currentPattern, setCurrentPattern] = useState<'A' | 'B'>('A');
    const [currentStep, setCurrentStep] = useState(-1);
    const [recording, setRecording] = useState(false);

    // Pattern state
    const [drumPatterns, setDrumPatterns] = useState<{ A: DrumPattern; B: DrumPattern }>({
        A: getDrumPreset('Lofi Chill') || createEmptyDrumPattern(),
        B: createEmptyDrumPattern(),
    });

    const [synthPatterns, setSynthPatterns] = useState<{ A: SynthPattern; B: SynthPattern }>({
        A: getSynthPreset('Warm Bass')?.pattern || createEmptySynthPattern(),
        B: createEmptySynthPattern(),
    });

    // Track settings
    const [trackSettings, setTrackSettings] = useState<TrackSettings>(createDefaultTrackSettings());

    // Synth params
    const [synthParams, setSynthParams] = useState<SynthParams>(
        getSynthPreset('Warm Bass')?.params || defaultSynthParams
    );

    // Effects params
    const [effectsParams, setEffectsParams] = useState<EffectsParams>(defaultEffectsParams);

    // Preset tracking
    const [currentDrumPreset, setCurrentDrumPreset] = useState('Lofi Chill');
    const [currentSynthPreset, setCurrentSynthPreset] = useState('Warm Bass');

    // Project state
    const [projectName, setProjectName] = useState('Untitled Loop');
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Set up step change callback
    useEffect(() => {
        setOnStepChange((step) => {
            setCurrentStep(step);
        });
    }, []);

    // Initialize effects on first play
    useEffect(() => {
        if (isPlaying) {
            initializeEffects();
            getAnalyser(); // Initialize visualizer
        }
    }, [isPlaying]);

    // Update effects when params change
    useEffect(() => {
        updateEffects(effectsParams);
    }, [effectsParams]);

    // Handle play
    const handlePlay = useCallback(() => {
        resumeAudioContext();
        setIsPlaying(true);
        startScheduler(
            bpm,
            swing,
            drumPatterns,
            synthPatterns,
            currentPattern,
            trackSettings,
            synthParams
        );
    }, [bpm, swing, drumPatterns, synthPatterns, currentPattern, trackSettings, synthParams]);

    // Handle stop
    const handleStop = useCallback(() => {
        setIsPlaying(false);
        stopScheduler();
        setCurrentStep(-1);
    }, []);

    // Handle play/stop toggle
    const handlePlayStop = useCallback(() => {
        if (isPlaying) {
            handleStop();
        } else {
            handlePlay();
        }
    }, [isPlaying, handlePlay, handleStop]);

    // Restart scheduler when parameters change during playback
    useEffect(() => {
        if (isPlaying) {
            stopScheduler();
            startScheduler(
                bpm,
                swing,
                drumPatterns,
                synthPatterns,
                currentPattern,
                trackSettings,
                synthParams
            );
        }
    }, [bpm, swing, drumPatterns, synthPatterns, currentPattern, trackSettings, synthParams, isPlaying]);

    // Handle master volume change
    const handleMasterVolumeChange = useCallback((volume: number) => {
        setMasterVolumeState(volume);
        setMasterVolume(volume);
    }, []);

    // Handle BPM change with delta
    const handleBpmDelta = useCallback((delta: number) => {
        setBpm(prev => Math.max(60, Math.min(180, prev + delta)));
    }, []);

    // Handle mute track by index
    const handleMuteTrack = useCallback((trackIndex: number) => {
        const tracks: (keyof TrackSettings)[] = ['kick', 'snare', 'hat', 'clap', 'synth'];
        const track = tracks[trackIndex];
        if (track) {
            setTrackSettings(prev => ({
                ...prev,
                [track]: { ...prev[track], muted: !prev[track].muted },
            }));
        }
    }, []);

    // Handle drum toggle
    const handleDrumToggle = useCallback((track: DrumType, step: number, value: boolean) => {
        setDrumPatterns((prev) => ({
            ...prev,
            [currentPattern]: {
                ...prev[currentPattern],
                [track]: prev[currentPattern][track].map((v, i) => (i === step ? value : v)),
            },
        }));
    }, [currentPattern]);

    // Handle synth note change
    const handleSynthNoteChange = useCallback((step: number, note: string | null) => {
        setSynthPatterns((prev) => ({
            ...prev,
            [currentPattern]: {
                notes: prev[currentPattern].notes.map((n, i) => (i === step ? note : n)),
            },
        }));
    }, [currentPattern]);

    // Handle track settings change
    const handleTrackSettingChange = useCallback(
        (track: string, setting: 'muted' | 'solo' | 'volume', value: boolean | number) => {
            setTrackSettings((prev) => ({
                ...prev,
                [track]: {
                    ...prev[track as keyof TrackSettings],
                    [setting]: value,
                },
            }));
        },
        []
    );

    // Handle synth params change
    const handleSynthParamsChange = useCallback((changes: Partial<SynthParams>) => {
        setSynthParams((prev) => ({ ...prev, ...changes }));
    }, []);

    // Handle drum preset change
    const handleDrumPresetChange = useCallback((name: string) => {
        const pattern = getDrumPreset(name);
        if (pattern) {
            setDrumPatterns((prev) => ({
                ...prev,
                [currentPattern]: pattern,
            }));
            setCurrentDrumPreset(name);
        }
    }, [currentPattern]);

    // Handle synth preset change
    const handleSynthPresetChange = useCallback((name: string) => {
        const preset = getSynthPreset(name);
        if (preset) {
            setSynthParams(preset.params);
            if (preset.pattern) {
                setSynthPatterns((prev) => ({
                    ...prev,
                    [currentPattern]: preset.pattern!,
                }));
            }
            setCurrentSynthPreset(name);
        }
    }, [currentPattern]);

    // Handle drum pattern change from generator
    const handleDrumPatternChange = useCallback((pattern: DrumPattern) => {
        setDrumPatterns((prev) => ({
            ...prev,
            [currentPattern]: pattern,
        }));
    }, [currentPattern]);

    // Handle synth pattern change from generator
    const handleSynthPatternChange = useCallback((pattern: SynthPattern) => {
        setSynthPatterns((prev) => ({
            ...prev,
            [currentPattern]: pattern,
        }));
    }, [currentPattern]);

    // Handle save
    const handleSave = useCallback(() => {
        const project: Project = {
            name: projectName,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            bpm,
            swing,
            masterVolume,
            currentPattern,
            drumPatterns,
            synthPatterns,
            trackSettings,
            synthParams,
        };
        saveProject(project);
        alert(`Project "${projectName}" saved!`);
    }, [projectName, bpm, swing, masterVolume, currentPattern, drumPatterns, synthPatterns, trackSettings, synthParams]);

    // Handle load
    const handleLoad = useCallback((project: Project) => {
        setProjectName(project.name);
        setBpm(project.bpm);
        setSwing(project.swing);
        setMasterVolumeState(project.masterVolume);
        setMasterVolume(project.masterVolume);
        setCurrentPattern(project.currentPattern);
        setDrumPatterns(project.drumPatterns);
        setSynthPatterns(project.synthPatterns);
        setTrackSettings(project.trackSettings);
        setSynthParams(project.synthParams);
    }, []);

    // Handle export
    const handleExport = useCallback(() => {
        const project: Project = {
            name: projectName,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            bpm,
            swing,
            masterVolume,
            currentPattern,
            drumPatterns,
            synthPatterns,
            trackSettings,
            synthParams,
        };
        downloadProjectAsFile(project);
    }, [projectName, bpm, swing, masterVolume, currentPattern, drumPatterns, synthPatterns, trackSettings, synthParams]);

    // Handle import
    const handleImport = useCallback((json: string) => {
        const project = importProjectFromJSON(json);
        if (project) {
            handleLoad(project);
            alert(`Project "${project.name}" imported!`);
        } else {
            alert('Invalid project file');
        }
    }, [handleLoad]);

    // Handle recording
    const handleRecordToggle = useCallback(async () => {
        if (recording) {
            const blob = await stopRecording();
            setRecording(false);
            // Download the recording
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName}_recording.webm`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            await startRecording();
            setRecording(true);
            if (!isPlaying) handlePlay();
        }
    }, [recording, isPlaying, projectName, handlePlay]);

    // Handle MIDI export
    const handleMidiExport = useCallback(() => {
        const blob = exportToMidi(drumPatterns[currentPattern], synthPatterns[currentPattern], bpm);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.mid`;
        a.click();
        URL.revokeObjectURL(url);
    }, [drumPatterns, synthPatterns, currentPattern, bpm, projectName]);

    // Handle share URL
    const handleShareUrl = useCallback(() => {
        const project = {
            name: projectName,
            bpm,
            swing,
            drumPatterns,
            synthPatterns,
            synthParams,
        };
        const encoded = encodeProjectToUrl(project);
        const url = `${window.location.origin}?project=${encoded}`;
        navigator.clipboard.writeText(url);
        alert('Shareable URL copied to clipboard!');
    }, [projectName, bpm, swing, drumPatterns, synthPatterns, synthParams]);

    // Handle copy pattern
    const handleCopyPattern = useCallback(() => {
        const otherPattern = currentPattern === 'A' ? 'B' : 'A';
        setDrumPatterns((prev) => ({
            ...prev,
            [otherPattern]: { ...prev[currentPattern] },
        }));
        setSynthPatterns((prev) => ({
            ...prev,
            [otherPattern]: { ...prev[currentPattern] },
        }));
        alert(`Pattern ${currentPattern} copied to ${otherPattern}`);
    }, [currentPattern]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onPlayStop: handlePlayStop,
        onBpmChange: handleBpmDelta,
        onPatternChange: setCurrentPattern,
        onMuteTrack: handleMuteTrack,
        onSave: handleSave,
    });

    return (
        <div className="min-h-screen p-4" style={{ background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="mb-4 flex items-center justify-between">
                <div>
                    <h1
                        className="text-3xl font-bold tracking-tight"
                        style={{
                            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        LofiLoop
                    </h1>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        V2 • Chill beats • Step sequencer • Synth shaping
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeSelector />
                    <button
                        onClick={() => setShowShortcuts(!showShortcuts)}
                        className="lofi-button text-sm"
                        title="Keyboard Shortcuts"
                    >
                        ⌨️
                    </button>
                </div>
            </header>

            {/* Visualizer */}
            <div className="mb-4">
                <Visualizer isPlaying={isPlaying} mode="both" height={60} />
            </div>

            {/* Transport bar */}
            <div className="mb-4">
                <TransportBar
                    isPlaying={isPlaying}
                    bpm={bpm}
                    swing={swing}
                    masterVolume={masterVolume}
                    currentPattern={currentPattern}
                    onPlay={handlePlay}
                    onStop={handleStop}
                    onBpmChange={setBpm}
                    onSwingChange={setSwing}
                    onMasterVolumeChange={handleMasterVolumeChange}
                    onPatternChange={setCurrentPattern}
                />
            </div>

            {/* Main content */}
            <div className="flex gap-4 mb-4">
                {/* Left column: Step grid */}
                <div className="flex-1">
                    <StepGrid
                        drumPatterns={drumPatterns[currentPattern]}
                        synthNotes={synthPatterns[currentPattern].notes}
                        currentStep={currentStep}
                        onDrumToggle={handleDrumToggle}
                        onSynthNoteChange={handleSynthNoteChange}
                        trackSettings={trackSettings}
                        onTrackSettingChange={handleTrackSettingChange}
                        availableNotes={getAllNotes()}
                    />
                </div>

                {/* Right column: Synth + Generator */}
                <div className="w-72 space-y-4">
                    <SynthPanel
                        params={synthParams}
                        onChange={handleSynthParamsChange}
                        presets={synthPresets}
                        onPresetChange={handleSynthPresetChange}
                        currentPreset={currentSynthPreset}
                    />

                    <GeneratorPanel
                        drumPattern={drumPatterns[currentPattern]}
                        synthPattern={synthPatterns[currentPattern]}
                        onDrumPatternChange={handleDrumPatternChange}
                        onSynthPatternChange={handleSynthPatternChange}
                    />
                </div>
            </div>

            {/* Effects rack */}
            <div className="mb-4">
                <EffectsRack params={effectsParams} onChange={setEffectsParams} />
            </div>

            {/* Preset bar */}
            <div className="mb-4">
                <PresetBar
                    drumPresets={drumPresets}
                    currentDrumPreset={currentDrumPreset}
                    onDrumPresetChange={handleDrumPresetChange}
                    onSave={handleSave}
                    onLoad={() => setShowLoadModal(true)}
                    onExport={handleExport}
                    onImport={handleImport}
                    projectName={projectName}
                    onProjectNameChange={setProjectName}
                />
            </div>

            {/* Extra actions bar */}
            <div className="lofi-panel px-6 py-4 flex items-center justify-center gap-4">
                <button
                    onClick={handleRecordToggle}
                    className={`lofi-button text-sm ${recording ? 'active' : ''}`}
                >
                    {recording ? '⏹ Stop Recording' : '🔴 Record'}
                </button>
                <button onClick={handleMidiExport} className="lofi-button text-sm">
                    🎹 Export MIDI
                </button>
                <button onClick={handleShareUrl} className="lofi-button text-sm">
                    🔗 Share URL
                </button>
                <button onClick={handleCopyPattern} className="lofi-button text-sm">
                    📋 Copy to {currentPattern === 'A' ? 'B' : 'A'}
                </button>
            </div>

            {/* Load modal */}
            <LoadModal
                isOpen={showLoadModal}
                onClose={() => setShowLoadModal(false)}
                onLoad={handleLoad}
            />

            {/* Keyboard shortcuts overlay */}
            {showShortcuts && (
                <div className="fixed top-20 right-4 z-50">
                    <KeyboardShortcutsHelp />
                </div>
            )}

            {/* Footer */}
            <footer className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                <p>
                    Built with Web Audio API • Lookahead scheduler • Effects rack • Pattern generator •{' '}
                    <span style={{ color: 'var(--synth-color)' }}>♪</span> Make some beats!
                </p>
            </footer>
        </div>
    );
}
