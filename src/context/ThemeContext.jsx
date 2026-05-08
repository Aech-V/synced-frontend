import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

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
        root.setAttribute('data-theme', activeTheme);

        root.style.setProperty('--font-scale', appearance.fontScale);
        
        const radii = { classic: '8px', rounded: '20px', squircle: '24px' };
        root.style.setProperty('--bubble-radius', radii[appearance.bubbleShape] || '20px');
        
        root.setAttribute('data-high-contrast', appearance.highContrast);
        root.setAttribute('data-transparent-bubbles', appearance.bubbleTransparency);
        root.setAttribute('data-reduced-motion', appearance.reducedMotion);

        if (localWallpaper) {
            root.style.setProperty('--chat-bg-image', `url(${localWallpaper})`);
            const dimColor = activeTheme === 'light' ? '255,255,255' : '0,0,0';
            root.style.setProperty('--chat-bg-dim', `rgba(${dimColor}, ${appearance.wallpaperDimming / 100})`);
        } else {
            root.style.setProperty('--chat-bg-image', 'none');
            root.style.setProperty('--chat-bg-dim', 'transparent');
        }

        if (appearance.fontFamily !== 'system') {
            const fontLink = document.getElementById('dynamic-google-font');
            if (!fontLink) {
                const link = document.createElement('link'); link.id = 'dynamic-google-font'; link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${appearance.fontFamily.replace(' ', '+')}&display=swap`;
                document.head.appendChild(link);
            } else fontLink.href = `https://fonts.googleapis.com/css2?family=${appearance.fontFamily.replace(' ', '+')}&display=swap`;
            root.style.setProperty('--active-font', `"${appearance.fontFamily}", sans-serif`);
        } else root.style.setProperty('--active-font', 'system-ui, -apple-system, sans-serif');

        localStorage.setItem('synced_appearance', JSON.stringify(appearance));
        if (localWallpaper) localStorage.setItem('synced_chat_wallpaper', localWallpaper);

    }, [appearance, localWallpaper]);

    useEffect(() => {
        if (!appearance.parallaxEffects || appearance.reducedMotion) return;
        const handleOrientation = (event) => {
            const root = document.documentElement;
            const shiftX = Math.max(-15, Math.min(15, event.gamma / 3)); 
            const shiftY = Math.max(-15, Math.min(15, (event.beta - 45) / 3));
            root.style.setProperty('--parallax-x', `${shiftX}px`);
            root.style.setProperty('--parallax-y', `${shiftY}px`);
        };
        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [appearance.parallaxEffects, appearance.reducedMotion]);

    const lastSyncedRef = useRef(JSON.stringify(appearance));

    useEffect(() => {
        const currentStringified = JSON.stringify(appearance);
        
        // Block redundant network pings if the exact same state was already synced
        if (lastSyncedRef.current === currentStringified) return;

        const syncTimeout = setTimeout(async () => {
            try {
                const token = localStorage.getItem('synced_token');
                if (token) {
                    await axios.put('http://localhost:5000/api/users/appearance', appearance, { 
                        headers: { Authorization: `Bearer ${token}` } 
                    });
                    // Only update the ref if the network call was a success
                    lastSyncedRef.current = currentStringified;
                }
            } catch (error) { 
                // Silent catch: Prevents console flooding if the user momentarily loses WiFi
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