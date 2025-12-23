'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
    onPlayStop: () => void;
    onBpmChange: (delta: number) => void;
    onPatternChange: (pattern: 'A' | 'B') => void;
    onMuteTrack: (trackIndex: number) => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onSave?: () => void;
    isEnabled?: boolean;
}

export function useKeyboardShortcuts({
    onPlayStop,
    onBpmChange,
    onPatternChange,
    onMuteTrack,
    onUndo,
    onRedo,
    onSave,
    isEnabled = true,
}: KeyboardShortcutsProps) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isEnabled) return;

        // Ignore if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        // Space = Play/Stop
        if (e.code === 'Space') {
            e.preventDefault();
            onPlayStop();
            return;
        }

        // Arrow Up/Down = BPM adjust
        if (e.code === 'ArrowUp') {
            e.preventDefault();
            onBpmChange(e.shiftKey ? 10 : 1);
            return;
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            onBpmChange(e.shiftKey ? -10 : -1);
            return;
        }

        // Q/W = Pattern A/B
        if (e.code === 'KeyQ') {
            e.preventDefault();
            onPatternChange('A');
            return;
        }
        if (e.code === 'KeyW') {
            e.preventDefault();
            onPatternChange('B');
            return;
        }

        // 1-5 = Mute tracks (Kick, Snare, Hat, Clap, Synth)
        if (e.code === 'Digit1') {
            e.preventDefault();
            onMuteTrack(0);
            return;
        }
        if (e.code === 'Digit2') {
            e.preventDefault();
            onMuteTrack(1);
            return;
        }
        if (e.code === 'Digit3') {
            e.preventDefault();
            onMuteTrack(2);
            return;
        }
        if (e.code === 'Digit4') {
            e.preventDefault();
            onMuteTrack(3);
            return;
        }
        if (e.code === 'Digit5') {
            e.preventDefault();
            onMuteTrack(4);
            return;
        }

        // Ctrl+S = Save
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
            e.preventDefault();
            onSave?.();
            return;
        }

        // Ctrl+Z = Undo
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
            e.preventDefault();
            onUndo?.();
            return;
        }

        // Ctrl+Shift+Z or Ctrl+Y = Redo
        if ((e.ctrlKey || e.metaKey) && ((e.code === 'KeyZ' && e.shiftKey) || e.code === 'KeyY')) {
            e.preventDefault();
            onRedo?.();
            return;
        }
    }, [isEnabled, onPlayStop, onBpmChange, onPatternChange, onMuteTrack, onUndo, onRedo, onSave]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

// Keyboard shortcuts help overlay
export function KeyboardShortcutsHelp() {
    const shortcuts = [
        { key: 'Space', action: 'Play / Stop' },
        { key: '↑ / ↓', action: 'Adjust BPM (+1 / -1)' },
        { key: 'Shift + ↑ / ↓', action: 'Adjust BPM (+10 / -10)' },
        { key: 'Q / W', action: 'Switch Pattern A / B' },
        { key: '1 - 5', action: 'Mute Track (Kick, Snare, Hat, Clap, Synth)' },
        { key: 'Ctrl + S', action: 'Save Project' },
    ];

    return (
        <div className="lofi-panel p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                ⌨️ Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
                {shortcuts.map(({ key, action }) => (
                    <div key={key} className="flex justify-between text-sm">
                        <kbd className="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>
                            {key}
                        </kbd>
                        <span style={{ color: 'var(--text-secondary)' }}>{action}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
