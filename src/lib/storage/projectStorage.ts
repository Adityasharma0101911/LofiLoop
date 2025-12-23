// Project save/load utilities
import { DrumPattern, SynthPattern, TrackSettings } from '../audio/scheduler';
import { SynthParams, defaultSynthParams } from '../audio/synth';

export interface Project {
    name: string;
    createdAt: number;
    updatedAt: number;
    bpm: number;
    swing: number;
    masterVolume: number;
    currentPattern: 'A' | 'B';
    drumPatterns: { A: DrumPattern; B: DrumPattern };
    synthPatterns: { A: SynthPattern; B: SynthPattern };
    trackSettings: TrackSettings;
    synthParams: SynthParams;
}

const STORAGE_KEY = 'lofiloop_projects';

export function saveProject(project: Project): void {
    const projects = getAllProjects();
    const existingIndex = projects.findIndex((p) => p.name === project.name);

    project.updatedAt = Date.now();

    if (existingIndex >= 0) {
        projects[existingIndex] = project;
    } else {
        project.createdAt = Date.now();
        projects.push(project);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function loadProject(name: string): Project | null {
    const projects = getAllProjects();
    return projects.find((p) => p.name === name) || null;
}

export function getAllProjects(): Project[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function deleteProject(name: string): void {
    const projects = getAllProjects().filter((p) => p.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function exportProjectAsJSON(project: Project): string {
    return JSON.stringify(project, null, 2);
}

export function importProjectFromJSON(json: string): Project | null {
    try {
        const project = JSON.parse(json) as Project;

        // Validate required fields
        if (!project.name || !project.drumPatterns || !project.synthPatterns) {
            return null;
        }

        // Fill in defaults for missing fields
        project.bpm = project.bpm || 85;
        project.swing = project.swing || 0;
        project.masterVolume = project.masterVolume || 0.8;
        project.currentPattern = project.currentPattern || 'A';
        project.synthParams = project.synthParams || defaultSynthParams;

        return project;
    } catch {
        return null;
    }
}

export function downloadProjectAsFile(project: Project): void {
    const json = exportProjectAsJSON(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.lofiloop.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
