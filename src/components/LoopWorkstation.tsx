'use client';

import React, { useState, useCallback, useEffect } from 'react';
import TransportBar from '@/components/TransportBar';
import StepGrid from '@/components/StepGrid';
import SynthPanel from '@/components/SynthPanel';
import PresetBar from '@/components/PresetBar';
import LoadModal from '@/components/LoadModal';
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

    // Preset tracking
    const [currentDrumPreset, setCurrentDrumPreset] = useState('Lofi Chill');
    const [currentSynthPreset, setCurrentSynthPreset] = useState('Warm Bass');

    // Project state
    const [projectName, setProjectName] = useState('Untitled Loop');
    const [showLoadModal, setShowLoadModal] = useState(false);

    // Set up step change callback
    useEffect(() => {
        setOnStepChange((step) => {
            setCurrentStep(step);
        });
    }, []);

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

    return (
        <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="mb-6 text-center">
                <h1
                    className="text-4xl font-bold tracking-tight mb-2"
                    style={{
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    LofiLoop
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Chill beats • Step sequencer • Synth shaping
                </p>
            </header>

            {/* Transport bar */}
            <div className="mb-6">
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
            <div className="flex gap-6">
                {/* Step grid (left/center) */}
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

                {/* Synth panel (right) */}
                <div className="w-72">
                    <SynthPanel
                        params={synthParams}
                        onChange={handleSynthParamsChange}
                        presets={synthPresets}
                        onPresetChange={handleSynthPresetChange}
                        currentPreset={currentSynthPreset}
                    />
                </div>
            </div>

            {/* Preset bar */}
            <div className="mt-6">
                <PresetBar
                    drumPresets={drumPresets}
                    synthPresets={synthPresets}
                    currentDrumPreset={currentDrumPreset}
                    currentSynthPreset={currentSynthPreset}
                    onDrumPresetChange={handleDrumPresetChange}
                    onSynthPresetChange={handleSynthPresetChange}
                    onSave={handleSave}
                    onLoad={() => setShowLoadModal(true)}
                    onExport={handleExport}
                    onImport={handleImport}
                    projectName={projectName}
                    onProjectNameChange={setProjectName}
                />
            </div>

            {/* Load modal */}
            <LoadModal
                isOpen={showLoadModal}
                onClose={() => setShowLoadModal(false)}
                onLoad={handleLoad}
            />

            {/* Footer */}
            <footer className="mt-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                <p>
                    Built with Web Audio API • Lookahead scheduler for tight timing •{' '}
                    <span style={{ color: 'var(--synth-color)' }}>♪</span> Make some beats!
                </p>
            </footer>
        </div>
    );
}
