'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';

interface KnobProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    label: string;
    onChange: (value: number) => void;
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    showValue?: boolean;
    formatValue?: (value: number) => string;
}

export default function Knob({
    value,
    min,
    max,
    step = 1,
    label,
    onChange,
    size = 'md',
    color = 'var(--accent-primary)',
    showValue = true,
    formatValue = (v) => v.toFixed(step < 1 ? 2 : 0),
}: KnobProps) {
    const knobRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startValue = useRef(0);

    const sizeMap = {
        sm: 44,
        md: 56,
        lg: 72,
    };

    const knobSize = sizeMap[size];

    // Calculate rotation angle (135 to 405 degrees, centered at 270)
    const normalizedValue = (value - min) / (max - min);
    const rotation = 135 + normalizedValue * 270;

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        startY.current = e.clientY;
        startValue.current = value;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        e.preventDefault();
    }, [value]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;

        const deltaY = startY.current - e.clientY;
        const range = max - min;
        const sensitivity = range / 150; // Pixels to cover full range

        let newValue = startValue.current + deltaY * sensitivity;
        newValue = Math.min(max, Math.max(min, newValue));

        // Snap to step
        newValue = Math.round(newValue / step) * step;

        onChange(newValue);
    }, [min, max, step, onChange]);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    // Handle double-click to reset
    const handleDoubleClick = useCallback(() => {
        const defaultValue = (min + max) / 2;
        onChange(Math.round(defaultValue / step) * step);
    }, [min, max, step, onChange]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div className="knob-container">
            <div
                ref={knobRef}
                className="knob"
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                style={{
                    width: knobSize,
                    height: knobSize,
                    cursor: isDragging.current ? 'grabbing' : 'grab',
                }}
            >
                {/* Indicator line */}
                <div
                    style={{
                        position: 'absolute',
                        width: '3px',
                        height: knobSize * 0.32,
                        background: color,
                        borderRadius: '2px',
                        top: knobSize * 0.12,
                        left: '50%',
                        transform: `translateX(-50%) rotate(${rotation}deg)`,
                        transformOrigin: `center ${knobSize * 0.38}px`,
                        boxShadow: `0 0 8px ${color}40`,
                    }}
                />

                {/* Track arc (optional visual) */}
                <svg
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none',
                    }}
                    width={knobSize}
                    height={knobSize}
                >
                    <circle
                        cx={knobSize / 2}
                        cy={knobSize / 2}
                        r={knobSize / 2 - 3}
                        fill="none"
                        stroke="var(--border-subtle)"
                        strokeWidth="2"
                        strokeDasharray={`${normalizedValue * 212} 212`}
                        strokeDashoffset={-53}
                        strokeLinecap="round"
                        style={{ opacity: 0.3 }}
                    />
                </svg>
            </div>

            <span className="knob-label">{label}</span>

            {showValue && (
                <span className="knob-value">{formatValue(value)}</span>
            )}
        </div>
    );
}
