'use client';

import React, { useRef } from 'react';

interface PresetBarProps {
    drumPresets: { name: string }[];
    currentDrumPreset: string;
    onDrumPresetChange: (name: string) => void;
    onSave: () => void;
    onLoad: () => void;
    onExport: () => void;
    onImport: (json: string) => void;
    projectName: string;
    onProjectNameChange: (name: string) => void;
}

export default function PresetBar({
    drumPresets,
    currentDrumPreset,
    onDrumPresetChange,
    onSave,
    onLoad,
    onExport,
    onImport,
    projectName,
    onProjectNameChange,
}: PresetBarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const json = event.target?.result as string;
                onImport(json);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="lofi-panel px-6 py-4">
            <div className="flex items-center justify-between gap-6">
                {/* Project name */}
                <div className="flex items-center gap-3">
                    <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        Project
                    </label>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => onProjectNameChange(e.target.value)}
                        className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm w-40"
                        style={{ color: 'var(--text-primary)' }}
                        placeholder="Project Name"
                    />
                </div>

                {/* Drum preset selector */}
                <div className="flex items-center gap-3">
                    <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        Drums
                    </label>
                    <select
                        value={currentDrumPreset}
                        onChange={(e) => onDrumPresetChange(e.target.value)}
                        className="lofi-button text-sm py-2 px-3 bg-[var(--bg-tertiary)]"
                        style={{ border: '1px solid var(--border-subtle)' }}
                    >
                        {drumPresets.map((p) => (
                            <option key={p.name} value={p.name}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Save/Load buttons */}
                <div className="flex items-center gap-2">
                    <button onClick={onSave} className="lofi-button text-sm">
                        💾 Save
                    </button>
                    <button onClick={onLoad} className="lofi-button text-sm">
                        📂 Load
                    </button>
                    <button onClick={onExport} className="lofi-button text-sm">
                        ↗ Export
                    </button>
                    <button onClick={handleImportClick} className="lofi-button text-sm">
                        ↙ Import
                    </button>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.lofiloop.json"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>
        </div>
    );
}
