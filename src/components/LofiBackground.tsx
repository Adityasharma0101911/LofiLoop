'use client';

import React, { useEffect, useRef } from 'react';

interface LofiBackgroundProps {
    scene?: 'rain' | 'stars' | 'particles';
    intensity?: number;
}

export default function LofiBackground({ scene = 'particles', intensity = 0.5 }: LofiBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Particle system
        const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
        const particleCount = Math.floor(50 * intensity);

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: scene === 'rain' ? Math.random() * 2 + 1 : (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                alpha: Math.random() * 0.5 + 0.1,
            });
        }

        const draw = () => {
            ctx.fillStyle = 'rgba(26, 26, 46, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Draw
                ctx.beginPath();

                if (scene === 'rain') {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x, p.y + p.size * 5);
                    ctx.strokeStyle = `rgba(100, 150, 200, ${p.alpha})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else if (scene === 'stars') {
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * (0.5 + Math.sin(Date.now() / 1000 + p.x) * 0.5)})`;
                    ctx.fill();
                } else {
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(233, 69, 96, ${p.alpha * 0.3})`;
                    ctx.fill();
                }
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationRef.current);
        };
    }, [scene, intensity]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.6 }}
        />
    );
}
