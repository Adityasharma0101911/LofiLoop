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
import ExportModal from '@/components/ExportModal';
import LofiBackground from '@/components/LofiBackground';
import ArrangementView from '@/components/ArrangementView';
import SampleBrowser from '@/components/SampleBrowser';
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
import { startRecording, stopRecording, exportToMidi, encodeProjectToUrl } from '@/lib/audio/exporter';
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
import { Song, createEmptySong, createPattern, addBlock, removeBlock, moveBlock, resizeBlock, toggleBlockMute, PATTERN_COLORS } from '@/lib/audio/songMode';
import { UserSample, generateId } from '@/lib/audio/sampleLibrary';

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
    const [projectName, setProjectName] = useState('Untitled Song');
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [activeTab, setActiveTab] = useState<'sequencer' | 'arrange' | 'samples' | 'effects' | 'generator'>('sequencer');

    // Song mode state
    const [song, setSong] = useState<Song>(() => createEmptySong('Untitled Song', 85));
    const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
    const [currentBar, setCurrentBar] = useState(0);

    // Sample library state
    const [userSamples, setUserSamples] = useState<UserSample[]>([]);
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

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
            getAnalyser();
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

    // Save current pattern to song
    const handleSavePatternToSong = useCallback(() => {
        const patternId = generateId();
        const patternCount = Object.keys(song.patterns).length;
        const newPattern = createPattern(
            patternId,
            `Pattern ${patternCount + 1}`,
            drumPatterns[currentPattern],
            synthPatterns[currentPattern],
            patternCount
        );
        setSong(prev => ({
            ...prev,
            patterns: { ...prev.patterns, [patternId]: newPattern },
        }));
        setSelectedPatternId(patternId);
        alert('Pattern saved to song!');
    }, [drumPatterns, synthPatterns, currentPattern, song.patterns]);

    // Song arrangement handlers
    const handleBlockAdd = useCallback((patternId: string, startBar: number) => {
        setSong(prev => addBlock(prev, patternId, startBar, 1));
    }, []);

    const handleBlockRemove = useCallback((index: number) => {
        setSong(prev => removeBlock(prev, index));
    }, []);

    const handleBlockMove = useCallback((index: number, newStartBar: number) => {
        setSong(prev => moveBlock(prev, index, newStartBar));
    }, []);

    const handleBlockResize = useCallback((index: number, newLength: number) => {
        setSong(prev => resizeBlock(prev, index, newLength));
    }, []);

    const handleBlockToggleMute = useCallback((index: number) => {
        setSong(prev => toggleBlockMute(prev, index));
    }, []);

    const handleTotalBarsChange = useCallback((bars: number) => {
        setSong(prev => ({ ...prev, totalBars: Math.max(4, bars) }));
    }, []);

    const handleLoopChange = useCallback((start: number, end: number) => {
        setSong(prev => ({ ...prev, loopStart: start, loopEnd: end }));
    }, []);

    const handleSeek = useCallback((bar: number) => {
        setCurrentBar(bar);
    }, []);

    // Sample handlers
    const handleSampleLoad = useCallback((sample: UserSample) => {
        setUserSamples(prev => [...prev, sample]);
    }, []);

    const handleSampleSelect = useCallback((sampleId: string) => {
        setSelectedSampleId(sampleId);
    }, []);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onPlayStop: handlePlayStop,
        onBpmChange: handleBpmDelta,
        onPatternChange: setCurrentPattern,
        onMuteTrack: handleMuteTrack,
        onSave: handleSave,
    });

    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            {/* Animated background */}
            <LofiBackground scene="particles" intensity={0.3} />

            {/* Header - fixed */}
            <header className="relative z-10 px-6 py-3 flex items-center justify-between border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-6">
                    <div>
                        <h1
                            className="text-2xl font-bold tracking-tight"
                            style={{
                                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            LofiLoop Pro
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Professional Beat Maker
                        </p>
                    </div>

                    {/* Project name */}
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="bg-transparent border-b-2 px-2 py-1 text-lg font-medium focus:outline-none"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', minWidth: '200px' }}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <ThemeSelector />
                    <button
                        onClick={() => setShowShortcuts(!showShortcuts)}
                        className="lofi-button text-sm px-3 py-2"
                        title="Keyboard Shortcuts"
                    >
                        ⌨️
                    </button>
                </div>
            </header>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Left sidebar - Tabs */}
                <aside className="w-16 flex flex-col items-center py-4 gap-2 border-r" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                    <button
                        onClick={() => setActiveTab('sequencer')}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-all ${activeTab === 'sequencer' ? 'ring-2 ring-[#e94560]' : ''}`}
                        style={{
                            background: activeTab === 'sequencer' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        }}
                        title="Sequencer"
                    >
                        🎹
                    </button>
                    <button
                        onClick={() => setActiveTab('arrange')}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-all ${activeTab === 'arrange' ? 'ring-2 ring-[#e94560]' : ''}`}
                        style={{
                            background: activeTab === 'arrange' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        }}
                        title="Arrange (Song Mode)"
                    >
                        🎬
                    </button>
                    <button
                        onClick={() => setActiveTab('samples')}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-all ${activeTab === 'samples' ? 'ring-2 ring-[#e94560]' : ''}`}
                        style={{
                            background: activeTab === 'samples' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        }}
                        title="Sample Browser"
                    >
                        🎧
                    </button>
                    <button
                        onClick={() => setActiveTab('effects')}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-all ${activeTab === 'effects' ? 'ring-2 ring-[#e94560]' : ''}`}
                        style={{
                            background: activeTab === 'effects' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        }}
                        title="Effects"
                    >
                        🎛️
                    </button>
                    <button
                        onClick={() => setActiveTab('generator')}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-all ${activeTab === 'generator' ? 'ring-2 ring-[#e94560]' : ''}`}
                        style={{
                            background: activeTab === 'generator' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        }}
                        title="Generator"
                    >
                        🎲
                    </button>
                </aside>

                {/* Center content */}
                <main className="flex-1 flex flex-col overflow-hidden p-4">
                    {/* Visualizer */}
                    <div className="mb-4">
                        <Visualizer isPlaying={isPlaying} mode="both" height={80} />
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

                    {/* Tab content */}
                    <div className="flex-1 overflow-auto">
                        {activeTab === 'sequencer' && (
                            <div className="flex gap-4">
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
                                    {/* Save to song button */}
                                    <div className="mt-4 text-center">
                                        <button
                                            onClick={handleSavePatternToSong}
                                            className="lofi-button px-6 py-2"
                                        >
                                            💾 Save Pattern to Song
                                        </button>
                                    </div>
                                </div>
                                <div className="w-80">
                                    <SynthPanel
                                        params={synthParams}
                                        onChange={handleSynthParamsChange}
                                        presets={synthPresets}
                                        onPresetChange={handleSynthPresetChange}
                                        currentPreset={currentSynthPreset}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'arrange' && (
                            <div className="space-y-4">
                                <div className="lofi-panel p-4">
                                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--accent-primary)' }}>
                                        🎬 Song Mode
                                    </h3>
                                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                        Arrange your patterns into a full song. Save patterns from the sequencer, then drag them onto the timeline.
                                    </p>
                                    {Object.keys(song.patterns).length === 0 ? (
                                        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                            <p className="text-4xl mb-4">🎼</p>
                                            <p>No patterns yet!</p>
                                            <p className="text-sm mt-2">Go to the Sequencer tab and click &quot;Save Pattern to Song&quot;</p>
                                        </div>
                                    ) : (
                                        <ArrangementView
                                            song={song}
                                            currentBar={currentBar}
                                            isPlaying={isPlaying}
                                            onBlockAdd={handleBlockAdd}
                                            onBlockRemove={handleBlockRemove}
                                            onBlockMove={handleBlockMove}
                                            onBlockResize={handleBlockResize}
                                            onBlockToggleMute={handleBlockToggleMute}
                                            onTotalBarsChange={handleTotalBarsChange}
                                            onLoopChange={handleLoopChange}
                                            onSeek={handleSeek}
                                            selectedPattern={selectedPatternId}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'samples' && (
                            <div className="h-full">
                                <SampleBrowser
                                    userSamples={userSamples}
                                    onSampleLoad={handleSampleLoad}
                                    onSampleSelect={handleSampleSelect}
                                    selectedSampleId={selectedSampleId}
                                />
                            </div>
                        )}

                        {activeTab === 'effects' && (
                            <EffectsRack params={effectsParams} onChange={setEffectsParams} />
                        )}

                        {activeTab === 'generator' && (
                            <GeneratorPanel
                                drumPattern={drumPatterns[currentPattern]}
                                synthPattern={synthPatterns[currentPattern]}
                                onDrumPatternChange={handleDrumPatternChange}
                                onSynthPatternChange={handleSynthPatternChange}
                            />
                        )}
                    </div>
                </main>

                {/* Right sidebar - Actions */}
                <aside className="w-64 p-4 overflow-y-auto border-l" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                    <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Quick Actions
                    </h3>

                    <div className="space-y-3">
                        {/* Export */}
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="w-full py-3 px-4 rounded-lg text-left flex items-center gap-3 transition-all hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white' }}
                        >
                            <span className="text-xl">📥</span>
                            <div>
                                <span className="font-bold">Export Audio</span>
                                <span className="block text-xs opacity-80">WAV / MP3</span>
                            </div>
                        </button>

                        {/* Recording */}
                        <button
                            onClick={handleRecordToggle}
                            className={`w-full py-3 px-4 rounded-lg text-left flex items-center gap-3 transition-all ${recording ? 'animate-pulse' : ''}`}
                            style={{ background: recording ? '#e94560' : 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                        >
                            <span className="text-xl">{recording ? '⏹' : '🔴'}</span>
                            <div>
                                <span className="font-medium">{recording ? 'Stop Recording' : 'Record'}</span>
                                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Real-time capture</span>
                            </div>
                        </button>

                        {/* MIDI Export */}
                        <button
                            onClick={handleMidiExport}
                            className="w-full py-3 px-4 rounded-lg text-left flex items-center gap-3 lofi-button"
                        >
                            <span className="text-xl">🎹</span>
                            <div>
                                <span className="font-medium">Export MIDI</span>
                                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>.mid file</span>
                            </div>
                        </button>

                        {/* Share URL */}
                        <button
                            onClick={handleShareUrl}
                            className="w-full py-3 px-4 rounded-lg text-left flex items-center gap-3 lofi-button"
                        >
                            <span className="text-xl">🔗</span>
                            <div>
                                <span className="font-medium">Share Project</span>
                                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Copy URL</span>
                            </div>
                        </button>

                        {/* Divider */}
                        <hr style={{ borderColor: 'var(--border-subtle)' }} />

                        {/* Presets */}
                        <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--text-muted)' }}>
                            Patterns
                        </h4>

                        <select
                            value={currentDrumPreset}
                            onChange={(e) => handleDrumPresetChange(e.target.value)}
                            className="w-full p-2 rounded-lg text-sm"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                        >
                            {drumPresets.map((p) => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                            ))}
                        </select>

                        {/* Copy Pattern */}
                        <button
                            onClick={handleCopyPattern}
                            className="w-full py-2 px-4 rounded-lg text-sm lofi-button"
                        >
                            📋 Copy {currentPattern} → {currentPattern === 'A' ? 'B' : 'A'}
                        </button>

                        {/* Divider */}
                        <hr style={{ borderColor: 'var(--border-subtle)' }} />

                        {/* Save/Load */}
                        <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--text-muted)' }}>
                            Project
                        </h4>

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleSave} className="py-2 px-3 rounded-lg text-sm lofi-button">
                                💾 Save
                            </button>
                            <button onClick={() => setShowLoadModal(true)} className="py-2 px-3 rounded-lg text-sm lofi-button">
                                📂 Load
                            </button>
                            <button onClick={handleExport} className="py-2 px-3 rounded-lg text-sm lofi-button">
                                ↗ Export
                            </button>
                            <button onClick={() => document.getElementById('import-input')?.click()} className="py-2 px-3 rounded-lg text-sm lofi-button">
                                ↙ Import
                            </button>
                        </div>

                        <input
                            id="import-input"
                            type="file"
                            accept=".json"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (evt) => {
                                        handleImport(evt.target?.result as string);
                                    };
                                    reader.readAsText(file);
                                }
                            }}
                            style={{ display: 'none' }}
                        />
                    </div>
                </aside>
            </div>

            {/* Load modal */}
            <LoadModal
                isOpen={showLoadModal}
                onClose={() => setShowLoadModal(false)}
                onLoad={handleLoad}
            />

            {/* Export modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                bpm={bpm}
                drumPattern={drumPatterns[currentPattern]}
                synthPattern={synthPatterns[currentPattern]}
                trackSettings={trackSettings}
                synthParams={synthParams}
                projectName={projectName}
            />

            {/* Keyboard shortcuts overlay */}
            {showShortcuts && (
                <div className="fixed top-20 right-20 z-50">
                    <KeyboardShortcutsHelp />
                </div>
            )}
        </div>
    );
}
