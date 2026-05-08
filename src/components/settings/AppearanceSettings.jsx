import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Palette, Type, EyeOff, Image as ImageIcon, MessageSquare, ChevronDown, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// --- 1. PREMIUM CUSTOM DROPDOWN ---
const PremiumDropdown = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '180px' }}>
            <div 
                onClick={() => { triggerHaptic('light'); setIsOpen(!isOpen); }}
                style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', backgroundColor: 'var(--bg-surface-hover)',
                    border: `1px solid ${isOpen ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    borderRadius: '12px', cursor: 'pointer',
                    color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600',
                    transition: 'all 0.2s ease', userSelect: 'none'
                }}
            >
                {selectedOption.label}
                <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-secondary)' }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '100%',
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    overflow: 'hidden', zIndex: 100,
                    animation: 'dropdownFade 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}>
                    {options.map((opt) => (
                        <div 
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setIsOpen(false); triggerHaptic('light'); }}
                            style={{
                                padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)',
                                backgroundColor: value === opt.value ? 'var(--bg-surface-hover)' : 'transparent',
                                fontWeight: value === opt.value ? 'bold' : '500',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = value === opt.value ? 'var(--bg-surface-hover)' : 'transparent'}
                        >
                            {opt.label}
                            {value === opt.value && <Check size={16} color="var(--accent-primary)" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- 2. LIVE CHAT PREVIEW COMPONENT ---
const LivePreview = ({ appearance, localWallpaper, resolvedTheme }) => {
    const isGlass = appearance.bubbleTransparency;
    
    // Calculate precise geometry mapping based on the setting
    const radiusMap = { classic: '8px', rounded: '20px', squircle: '24px' };
    const radius = radiusMap[appearance.bubbleShape] || '20px';

    // Simulated Bubble Colors (Mapping exact CSS logic from the app)
    const myBg = isGlass ? 'rgba(var(--accent-rgb), 0.85)' : '#2A2511';
    const myBorder = isGlass ? 'rgba(128,128,128,0.15)' : '#93780B';
    const otherBg = isGlass ? (resolvedTheme === 'dark' || resolvedTheme === 'oled' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)') : 'var(--bg-surface)';
    
    return (
        <div style={{
            position: 'relative', width: '100%', height: '240px', borderRadius: '20px',
            marginBottom: '32px', border: '1px solid var(--border-subtle)', overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
            {/* Simulated Wallpaper Layer */}
            {localWallpaper && (
                <div style={{
                    position: 'absolute', inset: 0, 
                    backgroundImage: `url(${localWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: `brightness(${100 - appearance.wallpaperDimming}%)`
                }} />
            )}

            {/* Simulated Messages */}
            <div style={{ position: 'relative', zIndex: 10, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
                
                {/* Incoming Message */}
                <div style={{ alignSelf: 'flex-start', display: 'flex', position: 'relative' }}>
                    <div style={{
                        backgroundColor: otherBg, padding: '10px 14px', maxWidth: '240px',
                        borderTopLeftRadius: '0px', borderTopRightRadius: radius, borderBottomLeftRadius: radius, borderBottomRightRadius: radius,
                        border: `1px solid ${isGlass ? 'rgba(128,128,128,0.15)' : 'var(--border-subtle)'}`,
                        backdropFilter: isGlass ? 'blur(16px)' : 'none', color: 'var(--text-primary)',
                        fontSize: `calc(0.9rem * (${appearance.fontScale} / 100))`, fontFamily: appearance.fontFamily !== 'system' ? `"${appearance.fontFamily}", sans-serif` : 'inherit',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        {appearance.showBubbleTail && (
                            <svg width="10" height="13" viewBox="0 0 10 13" style={{ position: 'absolute', top: '-1px', left: '-9px' }}>
                                {!isGlass && <path d="M 10 0 L 0 0 C 4 2 7 6 9 13 L 10 13 Z" fill={otherBg} />}
                                <path d="M 10 0 L 0 0 C 4 2 7 6 9 13 L 10 13" fill="none" stroke={isGlass ? 'rgba(128,128,128,0.15)' : 'var(--border-subtle)'} strokeWidth="1" />
                            </svg>
                        )}
                        Hey! The new settings look amazing.
                    </div>
                </div>

                {/* Outgoing Message */}
                <div style={{ alignSelf: 'flex-end', display: 'flex', position: 'relative' }}>
                    <div style={{
                        backgroundColor: myBg, padding: '10px 14px', maxWidth: '240px',
                        borderTopLeftRadius: radius, borderTopRightRadius: '0px', borderBottomLeftRadius: radius, borderBottomRightRadius: radius,
                        border: `1px solid ${myBorder}`, backdropFilter: isGlass ? 'blur(16px)' : 'none',
                        color: '#ffffff', fontSize: `calc(0.9rem * (${appearance.fontScale} / 100))`, fontFamily: appearance.fontFamily !== 'system' ? `"${appearance.fontFamily}", sans-serif` : 'inherit',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        {appearance.showBubbleTail && (
                            <svg width="10" height="13" viewBox="0 0 10 13" style={{ position: 'absolute', top: '-1px', right: '-9px' }}>
                                {!isGlass && <path d="M 0 0 L 10 0 C 6 2 3 6 1 13 L 0 13 Z" fill={myBg} />}
                                <path d="M 0 0 L 10 0 C 6 2 3 6 1 13 L 0 13" fill="none" stroke={myBorder} strokeWidth="1" />
                            </svg>
                        )}
                        Right? It feels so native and fast! ✨
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. MICRO-COMPONENTS ---
const CustomToggle = ({ checked, onChange }) => (
    <div 
        onClick={() => { triggerHaptic('light'); onChange(!checked); }}
        style={{
            width: '46px', height: '26px', backgroundColor: checked ? 'var(--accent-primary)' : 'var(--border-subtle)',
            borderRadius: '13px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.3s ease', flexShrink: 0
        }}
    >
        <div style={{
            position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
            width: '22px', height: '22px', backgroundColor: '#ffffff',
            borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
        }} />
    </div>
);

const SettingsCard = ({ children }) => (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '0 16px', marginBottom: '28px' }}>
        {children}
    </div>
);

const SettingRow = ({ title, description, children, isLast }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
        <div style={{ paddingRight: '24px', flex: 1 }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: '600', display: 'block', fontSize: '0.95rem' }}>{title}</span>
            {description && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', marginTop: '4px', lineHeight: '1.4' }}>{description}</span>}
        </div>
        <div>{children}</div>
    </div>
);

const SectionHeader = ({ icon: Icon, title }) => (
    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
        <Icon size={16} strokeWidth={2.5} /> {title}
    </h3>
);

// --- MAIN COMPONENT ---
const AppearanceSettings = () => {
    const { appearance, updateAppearance, setLocalWallpaper, resolvedTheme } = useTheme();

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1080;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    setLocalWallpaper(canvas.toDataURL('image/jpeg', 0.7));
                    triggerHaptic('success');
                } catch (err) {
                    alert("Image is still too large. Please choose a smaller photo.");
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>
            <div style={{ marginBottom: '24px', marginLeft: '8px' }}>
                <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: 'bold' }}>Appearance</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>Customize Synced to match your personal style.</p>
            </div>

            {/* LIVE PREVIEW HERO */}
            <LivePreview appearance={appearance} localWallpaper={localStorage.getItem('synced_chat_wallpaper')} resolvedTheme={resolvedTheme} />

            {/* 1. THEME MODE */}
            <SectionHeader icon={Palette} title="Theme Mode" />
            <SettingsCard>
                <div style={{ display: 'flex', padding: '16px 0' }}>
                    <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '12px', padding: '6px', width: '100%', gap: '4px' }}>
                        {['light', 'dark', 'oled', 'system'].map(t => (
                            <button key={t} onClick={() => { triggerHaptic('light'); updateAppearance('theme', t); }}
                                style={{ 
                                    flex: 1, padding: '10px 4px', border: 'none', borderRadius: '8px', 
                                    background: appearance.theme === t ? 'var(--bg-primary)' : 'transparent', 
                                    color: appearance.theme === t ? 'var(--text-primary)' : 'var(--text-secondary)', 
                                    fontWeight: appearance.theme === t ? '700' : '500', textTransform: 'capitalize', 
                                    cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                    boxShadow: appearance.theme === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                    fontSize: '0.9rem'
                                }}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </SettingsCard>

            {/* 2. CHAT BACKGROUNDS */}
            <SectionHeader icon={ImageIcon} title="Chat Backgrounds" />
            <SettingsCard>
                <SettingRow title="Custom Wallpaper" description="Upload a photo for your chat backgrounds.">
                    <label style={{ 
                        padding: '10px 16px', backgroundColor: 'var(--bg-surface-hover)', 
                        color: 'var(--text-primary)', borderRadius: '12px', fontSize: '0.9rem', 
                        fontWeight: '600', cursor: 'pointer', border: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.2s', whiteSpace: 'nowrap'
                    }}>
                        Choose Image
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                </SettingRow>
                
                <SettingRow title="Wallpaper Dimming" description="Darken the wallpaper for better text legibility." isLast>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '140px' }}>
                        <input type="range" min="0" max="100" value={appearance.wallpaperDimming} onChange={(e) => updateAppearance('wallpaperDimming', parseInt(e.target.value))} className="premium-slider" />
                    </div>
                </SettingRow>
            </SettingsCard>

            {/* 3. MESSAGE BUBBLES */}
            <SectionHeader icon={MessageSquare} title="Message Bubbles" />
            <SettingsCard>
                <SettingRow title="Bubble Shape">
                    <PremiumDropdown 
                        value={appearance.bubbleShape} 
                        onChange={(val) => updateAppearance('bubbleShape', val)}
                        options={[
                            { label: 'Classic (Sharp)', value: 'classic' },
                            { label: 'Rounded', value: 'rounded' },
                            { label: 'Squircle (iOS)', value: 'squircle' }
                        ]} 
                    />
                </SettingRow>
                <SettingRow title="Translucent Bubbles" description="Enable frosted glass effects on message backgrounds.">
                    <CustomToggle checked={appearance.bubbleTransparency} onChange={(val) => updateAppearance('bubbleTransparency', val)} />
                </SettingRow>
                <SettingRow title="Show Bubble Tail" description="Display the small pointer on the side of messages." isLast>
                    <CustomToggle checked={appearance.showBubbleTail} onChange={(val) => updateAppearance('showBubbleTail', val)} />
                </SettingRow>
            </SettingsCard>

            {/* 4. TYPOGRAPHY */}
            <SectionHeader icon={Type} title="Typography" />
            <SettingsCard>
                <SettingRow title="Text Size">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '140px' }}>
                        <input type="range" min="70" max="150" step="5" value={appearance.fontScale} onChange={(e) => updateAppearance('fontScale', parseInt(e.target.value))} className="premium-slider" />
                    </div>
                </SettingRow>
                <SettingRow title="Font Family" isLast>
                    <PremiumDropdown 
                        value={appearance.fontFamily} 
                        onChange={(val) => updateAppearance('fontFamily', val)}
                        options={[
                            { label: 'System Default', value: 'system' },
                            { label: 'Tangerine', value: 'Tangerine' },
                            { label: 'Audiowide', value: 'Audiowide' },
                            { label: 'Felipa', value: 'Felipa' }
                        ]} 
                    />
                </SettingRow>
            </SettingsCard>

            {/* 5. PRIVACY & MOTION */}
            <SectionHeader icon={EyeOff} title="Privacy & Motion" />
            <SettingsCard>
                <SettingRow title="Hide Typing Indicator" description="Others won't see when you are actively typing.">
                    <CustomToggle checked={appearance.hideTypingIndicator} onChange={(val) => updateAppearance('hideTypingIndicator', val)} />
                </SettingRow>
                <SettingRow title="Gyroscope Parallax" description="Wallpaper moves dynamically when tilting your device." isLast>
                    <CustomToggle checked={appearance.parallaxEffects} onChange={(val) => updateAppearance('parallaxEffects', val)} />
                </SettingRow>
            </SettingsCard>
        </div>
    );
};

export default AppearanceSettings;