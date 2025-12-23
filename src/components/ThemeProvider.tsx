'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'midnight' | 'sunset' | 'sakura' | 'ocean' | 'forest';

interface Theme {
    name: ThemeName;
    label: string;
    colors: {
        bgPrimary: string;
        bgSecondary: string;
        bgTertiary: string;
        bgPanel: string;
        accentPrimary: string;
        accentSecondary: string;
        textPrimary: string;
        textSecondary: string;
        textMuted: string;
    };
}

const themes: Theme[] = [
    {
        name: 'midnight',
        label: '🌙 Midnight',
        colors: {
            bgPrimary: '#1a1a2e',
            bgSecondary: '#16213e',
            bgTertiary: '#0f0f23',
            bgPanel: '#1e1e3f',
            accentPrimary: '#e94560',
            accentSecondary: '#ff6b6b',
            textPrimary: '#f5e6d3',
            textSecondary: '#a0a0b0',
            textMuted: '#6a6a7a',
        },
    },
    {
        name: 'sunset',
        label: '🌅 Sunset',
        colors: {
            bgPrimary: '#2d1b2e',
            bgSecondary: '#3d2a3e',
            bgTertiary: '#1d0d1e',
            bgPanel: '#4d3a4e',
            accentPrimary: '#ff7b54',
            accentSecondary: '#ffb26b',
            textPrimary: '#fff5e4',
            textSecondary: '#d4a574',
            textMuted: '#8a6a5a',
        },
    },
    {
        name: 'sakura',
        label: '🌸 Sakura',
        colors: {
            bgPrimary: '#2a1f2d',
            bgSecondary: '#3a2f3d',
            bgTertiary: '#1a0f1d',
            bgPanel: '#4a3f4d',
            accentPrimary: '#ff9a9e',
            accentSecondary: '#fecfef',
            textPrimary: '#fff0f5',
            textSecondary: '#d8a0b0',
            textMuted: '#987080',
        },
    },
    {
        name: 'ocean',
        label: '🌊 Ocean',
        colors: {
            bgPrimary: '#0a192f',
            bgSecondary: '#112240',
            bgTertiary: '#020c1b',
            bgPanel: '#1d3461',
            accentPrimary: '#64ffda',
            accentSecondary: '#7efff5',
            textPrimary: '#ccd6f6',
            textSecondary: '#8892b0',
            textMuted: '#495670',
        },
    },
    {
        name: 'forest',
        label: '🌲 Forest',
        colors: {
            bgPrimary: '#1a2f1a',
            bgSecondary: '#2a3f2a',
            bgTertiary: '#0a1f0a',
            bgPanel: '#3a4f3a',
            accentPrimary: '#7ed957',
            accentSecondary: '#a8e063',
            textPrimary: '#e8f5e0',
            textSecondary: '#a8c8a0',
            textMuted: '#688860',
        },
    },
];

interface ThemeContextType {
    theme: Theme;
    setTheme: (name: ThemeName) => void;
    themes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

    useEffect(() => {
        // Load saved theme
        const savedTheme = localStorage.getItem('lofiloop-theme');
        if (savedTheme) {
            const theme = themes.find(t => t.name === savedTheme);
            if (theme) setCurrentTheme(theme);
        }
    }, []);

    useEffect(() => {
        // Apply theme CSS variables
        const root = document.documentElement;
        const { colors } = currentTheme;

        root.style.setProperty('--bg-primary', colors.bgPrimary);
        root.style.setProperty('--bg-secondary', colors.bgSecondary);
        root.style.setProperty('--bg-tertiary', colors.bgTertiary);
        root.style.setProperty('--bg-panel', colors.bgPanel);
        root.style.setProperty('--accent-primary', colors.accentPrimary);
        root.style.setProperty('--accent-secondary', colors.accentSecondary);
        root.style.setProperty('--text-primary', colors.textPrimary);
        root.style.setProperty('--text-secondary', colors.textSecondary);
        root.style.setProperty('--text-muted', colors.textMuted);

        // Update body background
        document.body.style.background = colors.bgPrimary;
    }, [currentTheme]);

    const setTheme = (name: ThemeName) => {
        const theme = themes.find(t => t.name === name);
        if (theme) {
            setCurrentTheme(theme);
            localStorage.setItem('lofiloop-theme', name);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme: currentTheme, setTheme, themes }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

// Theme selector component
export function ThemeSelector() {
    const { theme, setTheme, themes } = useTheme();

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Theme
            </span>
            <select
                value={theme.name}
                onChange={(e) => setTheme(e.target.value as ThemeName)}
                className="lofi-button text-sm py-2 px-3 bg-[var(--bg-tertiary)]"
                style={{ border: '1px solid var(--border-subtle)' }}
            >
                {themes.map((t) => (
                    <option key={t.name} value={t.name}>
                        {t.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
