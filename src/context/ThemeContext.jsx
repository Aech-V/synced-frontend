import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiClient } from '../utils/api';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [appearance, setAppearance] = useState(() => {
        const saved = localStorage.getItem('synced_appearance');
        return saved ? JSON.parse(saved) : {
            theme: 'system', fontScale: 100, fontFamily: 'system',
            highContrast: false, wallpaperDimming: 0, bubbleShape: 'rounded', showBubbleTail: true,
            bubbleTransparency: false, chatListDensity: 'comfortable', navPosition: 'bottom',
            archivedStyle: 'pinned', appIcon: 'classic', previewSize: 'large', ghostNotifications: false,
            hideTypingIndicator: false, readReceiptColor: 'accent', reducedMotion: false, parallaxEffects: true
        };
    });

    const [resolvedTheme, setResolvedTheme] = useState('light');
    const [localWallpaper, setLocalWallpaper] = useState(localStorage.getItem('synced_chat_wallpaper') || null);

    const updateAppearance = (key, value) => {
        setAppearance(prev => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        const root = document.documentElement;
        
        let activeTheme = appearance.theme;
        if (appearance.theme === 'system') activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setResolvedTheme(activeTheme);

        const colors = {
            light: { bg: '#f9fafb', surface: '#ffffff', surfaceHover: '#f3f4f6', text: '#111827', textSec: '#6b7280', border: '#e5e7eb' },
            dark: { bg: '#111827', surface: '#1f2937', surfaceHover: '#374151', text: '#f9fafb', textSec: '#9ca3af', border: '#374151' },
            oled: { bg: '#000000', surface: '#0a0a0a', surfaceHover: '#1a1a1a', text: '#f9fafb', textSec: '#9ca3af', border: '#262626' }
        };

        const themeColors = appearance.highContrast ? 
            (activeTheme.includes('dark') || activeTheme === 'oled' ? { ...colors[activeTheme], textSec: '#d1d5db', border: '#4b5563' } : { ...colors.light, textSec: '#374151', border: '#d1d5db' }) 
            : colors[activeTheme];

        root.style.setProperty('--bg-primary', themeColors.bg);
        root.style.setProperty('--bg-surface', themeColors.surface);
        root.style.setProperty('--bg-surface-hover', themeColors.surfaceHover);
        root.style.setProperty('--text-primary', themeColors.text);
        root.style.setProperty('--text-secondary', themeColors.textSec);
        root.style.setProperty('--border-subtle', themeColors.border);

        root.style.setProperty('--base-font-size', `${appearance.fontScale}%`);
        
        let fontString = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        if (appearance.fontFamily === 'rounded') fontString = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
        if (appearance.fontFamily === 'mono') fontString = 'ui-monospace, "SF Mono", Menlo, monospace';
        root.style.setProperty('--font-family', fontString);

        root.style.setProperty('--bubble-radius', appearance.bubbleShape === 'pill' ? '24px' : appearance.bubbleShape === 'square' ? '8px' : '16px');

        localStorage.setItem('synced_appearance', JSON.stringify(appearance));
    }, [appearance]);

    useEffect(() => {
        if (!appearance.parallaxEffects || appearance.reducedMotion) {
            document.documentElement.style.setProperty('--bg-offset-x', '0px');
            document.documentElement.style.setProperty('--bg-offset-y', '0px');
            return;
        }

        const handleOrientation = (e) => {
            const x = Math.min(Math.max(e.gamma, -30), 30); 
            const y = Math.min(Math.max(e.beta, -30), 30);
            
            document.documentElement.style.setProperty('--bg-offset-x', `${x * -0.5}px`);
            document.documentElement.style.setProperty('--bg-offset-y', `${y * -0.5}px`);
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [appearance.parallaxEffects, appearance.reducedMotion]);

    const lastSyncedRef = useRef(JSON.stringify(appearance));

    useEffect(() => {
        const currentStringified = JSON.stringify(appearance);
        
        if (lastSyncedRef.current === currentStringified) return;

        const syncTimeout = setTimeout(async () => {
            try {
                // Ensure a user is actually logged in before attempting to sync preferences
                const token = localStorage.getItem('synced_token');
                if (token) {
                    await apiClient.put('/users/appearance', appearance);
                    lastSyncedRef.current = currentStringified;
                }
            } catch (error) { 
                // Silent catch to prevent console flooding on minor network drops
            }
        }, 1500);
        
        return () => clearTimeout(syncTimeout);
    }, [appearance]);

    return (
        <ThemeContext.Provider value={{ appearance, updateAppearance, resolvedTheme, localWallpaper, setLocalWallpaper }}>
            {children}
        </ThemeContext.Provider>
    );
};