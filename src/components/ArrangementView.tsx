'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Song, SongBlock, PATTERN_COLORS } from '@/lib/audio/songMode';

interface ArrangementViewProps {
    song: Song;
    currentBar: number;
    isPlaying: boolean;
    onBlockAdd: (patternId: string, startBar: number) => void;
    onBlockRemove: (index: number) => void;
    onBlockMove: (index: number, newStartBar: number) => void;
    onBlockResize: (index: number, newLength: number) => void;
    onBlockToggleMute: (index: number) => void;
    onTotalBarsChange: (bars: number) => void;
    onLoopChange: (start: number, end: number) => void;
    onSeek: (bar: number) => void;
    selectedPattern: string | null;
}

const BAR_WIDTH = 60; // pixels per bar
const TRACK_HEIGHT = 50;

export default function ArrangementView({
    song,
    currentBar,
    isPlaying,
    onBlockAdd,
    onBlockRemove,
    onBlockMove,
    onBlockResize,
    onBlockToggleMute,
    onTotalBarsChange,
    onLoopChange,
    onSeek,
    selectedPattern,
}: ArrangementViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingBlock, setDraggingBlock] = useState<number | null>(null);
    const [resizingBlock, setResizingBlock] = useState<number | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartBar, setDragStartBar] = useState(0);

    // Handle timeline click
    const handleTimelineClick = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + containerRef.current.scrollLeft;
        const bar = Math.floor(x / BAR_WIDTH);
        onSeek(bar);
    }, [onSeek]);

    // Handle empty area click to add block
    const handleEmptyClick = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current || !selectedPattern) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + containerRef.current.scrollLeft;
        const bar = Math.floor(x / BAR_WIDTH);
        onBlockAdd(selectedPattern, bar);
    }, [selectedPattern, onBlockAdd]);

    // Handle block drag start
    const handleBlockMouseDown = useCallback((e: React.MouseEvent, index: number, isResize: boolean = false) => {
        e.stopPropagation();
        if (isResize) {
            setResizingBlock(index);
        } else {
            setDraggingBlock(index);
        }
        setDragStartX(e.clientX);
        setDragStartBar(song.arrangement[index].startBar);
    }, [song.arrangement]);

    // Handle mouse move for dragging
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (draggingBlock !== null) {
            const deltaX = e.clientX - dragStartX;
            const deltaBar = Math.round(deltaX / BAR_WIDTH);
            const newStart = Math.max(0, dragStartBar + deltaBar);
            onBlockMove(draggingBlock, newStart);
        }
        if (resizingBlock !== null) {
            const block = song.arrangement[resizingBlock];
            const deltaX = e.clientX - dragStartX;
            const deltaBar = Math.round(deltaX / BAR_WIDTH);
            const newLength = Math.max(1, block.lengthBars + deltaBar);
            onBlockResize(resizingBlock, newLength);
        }
    }, [draggingBlock, resizingBlock, dragStartX, dragStartBar, song.arrangement, onBlockMove, onBlockResize]);

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        setDraggingBlock(null);
        setResizingBlock(null);
    }, []);

    const patternList = Object.entries(song.patterns);

    return (
        <div className="lofi-panel p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    🎬 Arrangement
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {song.totalBars} bars
                    </span>
                    <button
                        onClick={() => onTotalBarsChange(song.totalBars + 4)}
                        className="lofi-button text-xs px-2 py-1"
                    >
                        +4
                    </button>
                    <button
                        onClick={() => onTotalBarsChange(Math.max(4, song.totalBars - 4))}
                        className="lofi-button text-xs px-2 py-1"
                    >
                        -4
                    </button>
                </div>
            </div>

            {/* Pattern list */}
            <div className="flex gap-2 mb-4 overflow-x-auto py-2">
                {patternList.map(([id, pattern]) => (
                    <button
                        key={id}
                        onClick={() => { }}
                        className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${selectedPattern === id ? 'ring-2 ring-white scale-105' : ''
                            }`}
                        style={{ background: pattern.color, color: 'white' }}
                    >
                        {pattern.name}
                    </button>
                ))}
                {patternList.length === 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Save patterns from the sequencer to use here
                    </span>
                )}
            </div>

            {/* Timeline */}
            <div
                ref={containerRef}
                className="relative overflow-x-auto rounded-lg"
                style={{ background: 'var(--bg-tertiary)', height: `${TRACK_HEIGHT + 40}px` }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Bar markers */}
                <div
                    className="absolute top-0 left-0 flex h-6"
                    style={{ width: `${song.totalBars * BAR_WIDTH}px` }}
                    onClick={handleTimelineClick}
                >
                    {Array.from({ length: song.totalBars }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 border-r text-center text-[10px] font-mono"
                            style={{
                                width: `${BAR_WIDTH}px`,
                                borderColor: 'var(--border-subtle)',
                                color: i % 4 === 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                                background: i % 4 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                            }}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>

                {/* Playhead */}
                {isPlaying && currentBar >= 0 && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 z-20"
                        style={{
                            left: `${currentBar * BAR_WIDTH}px`,
                            background: 'var(--accent-primary)',
                            boxShadow: '0 0 10px var(--accent-primary)',
                        }}
                    />
                )}

                {/* Blocks track */}
                <div
                    className="absolute top-6 left-0"
                    style={{ width: `${song.totalBars * BAR_WIDTH}px`, height: `${TRACK_HEIGHT}px` }}
                    onClick={handleEmptyClick}
                >
                    {song.arrangement.map((block, index) => {
                        const pattern = song.patterns[block.patternId];
                        if (!pattern) return null;

                        return (
                            <div
                                key={index}
                                className={`absolute top-1 rounded cursor-move transition-opacity ${block.muted ? 'opacity-40' : ''
                                    }`}
                                style={{
                                    left: `${block.startBar * BAR_WIDTH}px`,
                                    width: `${block.lengthBars * BAR_WIDTH - 4}px`,
                                    height: `${TRACK_HEIGHT - 8}px`,
                                    background: pattern.color,
                                    boxShadow: draggingBlock === index ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                                }}
                                onMouseDown={(e) => handleBlockMouseDown(e, index)}
                                onDoubleClick={() => onBlockToggleMute(index)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    onBlockRemove(index);
                                }}
                            >
                                <div className="px-2 py-1 text-xs font-medium text-white truncate">
                                    {pattern.name}
                                </div>

                                {/* Resize handle */}
                                <div
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                                    onMouseDown={(e) => handleBlockMouseDown(e, index, true)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Help text */}
            <div className="mt-2 text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                Click to place • Drag to move • Double-click to mute • Right-click to delete
            </div>
        </div>
    );
}
