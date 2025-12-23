'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Project,
    getAllProjects,
    loadProject,
    deleteProject,
} from '@/lib/storage/projectStorage';

interface LoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoad: (project: Project) => void;
}

export default function LoadModal({ isOpen, onClose, onLoad }: LoadModalProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);

    // Load projects when modal opens
    useEffect(() => {
        if (isOpen) {
            setProjects(getAllProjects());
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleLoad = useCallback((name: string) => {
        const project = loadProject(name);
        if (project) {
            onLoad(project);
            onClose();
        }
    }, [onLoad, onClose]);

    const handleDelete = useCallback((name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete project "${name}"?`)) {
            deleteProject(name);
            setProjects(getAllProjects());
        }
    }, []);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
        >
            <div
                ref={modalRef}
                className="lofi-panel p-6 w-full max-w-md max-h-[70vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Load Project</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        ×
                    </button>
                </div>

                {projects.length === 0 ? (
                    <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                        No saved projects yet
                    </p>
                ) : (
                    <div className="space-y-2">
                        {projects.map((project) => (
                            <div
                                key={project.name}
                                className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors hover:bg-[var(--step-hover)]"
                                style={{ background: 'var(--bg-tertiary)' }}
                                onClick={() => handleLoad(project.name)}
                            >
                                <div>
                                    <h3 className="font-medium">{project.name}</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        {project.bpm} BPM • {new Date(project.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>

                                <button
                                    onClick={(e) => handleDelete(project.name, e)}
                                    className="text-red-400 hover:text-red-300 transition-colors px-2"
                                    title="Delete"
                                >
                                    🗑
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
