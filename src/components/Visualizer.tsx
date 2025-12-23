'use client';

import React, { useRef, useEffect } from 'react';
import { getFrequencyData, getWaveformData } from '@/lib/audio/visualizer';

interface VisualizerProps {
    isPlaying: boolean;
    mode?: 'bars' | 'waveform' | 'both';
    color?: string;
    height?: number;
}

export default function Visualizer({
    isPlaying,
    mode = 'both',
    color = 'var(--accent-primary)',
    height = 80,
}: VisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;

            // Clear canvas
            ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
            ctx.fillRect(0, 0, width, height);

            if (!isPlaying) {
                // Draw idle state
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.strokeStyle = 'rgba(233, 69, 96, 0.2)';
                ctx.lineWidth = 2;
                ctx.stroke();
                animationRef.current = requestAnimationFrame(draw);
                return;
            }

            // Get frequency data
            const frequencyData = getFrequencyData();
            const waveformData = getWaveformData();

            // Draw frequency bars
            if (mode === 'bars' || mode === 'both') {
                const barCount = 32;
                const barWidth = width / barCount - 2;
                const step = Math.floor(frequencyData.length / barCount);

                for (let i = 0; i < barCount; i++) {
                    const value = frequencyData[i * step];
                    const barHeight = (value / 255) * height * 0.8;

                    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                    gradient.addColorStop(0, 'rgba(233, 69, 96, 0.8)');
                    gradient.addColorStop(1, 'rgba(255, 107, 107, 0.4)');

                    ctx.fillStyle = gradient;
                    ctx.fillRect(
                        i * (barWidth + 2),
                        height - barHeight,
                        barWidth,
                        barHeight
                    );
                }
            }

            // Draw waveform
            if (mode === 'waveform' || mode === 'both') {
                ctx.beginPath();
                ctx.strokeStyle = mode === 'both' ? 'rgba(29, 209, 161, 0.6)' : color;
                ctx.lineWidth = 2;

                const sliceWidth = width / waveformData.length;
                let x = 0;

                for (let i = 0; i < waveformData.length; i++) {
                    const v = waveformData[i] / 128.0;
                    const y = (v * height) / 2;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    x += sliceWidth;
                }

                ctx.stroke();
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, mode, color]);

    return (
        <div className="lofi-panel p-3 overflow-hidden">
            <canvas
                ref={canvasRef}
                width={800}
                height={height}
                className="w-full rounded-lg"
                style={{ height: `${height}px` }}
            />
        </div>
    );
}
