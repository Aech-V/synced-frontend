import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

const VoiceNotePlayer = ({ audioUrl, duration, senderAvatar, isOwn }) => {
    const audioRef = useRef(null);
    const waveformRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    // Smooth, aesthetic static waveform distribution
    const bars = useMemo(() => {
        return [
            15, 25, 40, 60, 85, 100, 90, 70, 50, 35, 
            30, 45, 65, 80, 60, 40, 30, 45, 75, 95, 
            85, 60, 40, 25, 20, 35, 55, 65, 40, 20
        ];
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const togglePlay = () => {
        triggerHaptic('light');
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const total = audioRef.current.duration;
            setCurrentTime(current);
            if (total) setProgress((current / total) * 100);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !audioRef.current.duration) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        
        const newTime = percentage * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        setProgress(percentage * 100);
    };

    const toggleSpeed = () => {
        triggerHaptic('light');
        const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
        setPlaybackRate(nextRate);
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Color Palette based on your #FCCB06 accent
    const activeColor = isOwn ? '#ffffff' : 'var(--accent-primary)';
    const inactiveWaveColor = isOwn ? 'rgba(255, 255, 255, 0.35)' : 'rgba(107, 114, 128, 0.25)'; // var(--text-secondary) with opacity
    const playBtnBg = isOwn ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-surface-hover)';
    const textColor = isOwn ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)';
    
    // The "Cutout" ring color to match the chat bubble background
    const bubbleBgColor = isOwn ? 'var(--accent-primary)' : 'var(--bg-primary)';

    return (
        // FIX: Replaced rigid minWidth with a responsive width so it never overflows the parent bubble
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '250px', maxWidth: '100%', padding: '4px 2px' }}>
            <audio 
                ref={audioRef} src={audioUrl} 
                onTimeUpdate={handleTimeUpdate} onEnded={handleEnded}
                preload="metadata" 
            />

            {/* Avatar Section */}
            <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                <img 
                    src={senderAvatar} alt="Sender" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                />
                
                {/* Premium Cutout Mic Badge */}
                <div style={{ 
                    position: 'absolute', bottom: -2, right: -4, 
                    backgroundColor: isOwn ? '#10b981' : 'var(--bg-surface)', 
                    borderRadius: '50%', padding: '3px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    // This creates the seamless visual cutout against the bubble background
                    boxShadow: `0 0 0 2px ${bubbleBgColor}`
                }}>
                    <Mic size={10} color={isOwn ? '#fff' : 'var(--accent-primary)'} fill="currentColor" />
                </div>
            </div>

            {/* Glassmorphic Play Button */}
            <button onClick={togglePlay} style={{ 
                width: '38px', height: '38px', borderRadius: '50%', 
                backgroundColor: playBtnBg, color: activeColor, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0,
                transition: 'background-color 0.2s, transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
            </button>

            {/* Interactive Waveform & Metadata Container */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '4px' }}>
                
                {/* Scrubber Area */}
                <div 
                    ref={waveformRef} onClick={handleSeek}
                    style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                        height: '28px', cursor: 'pointer', padding: '2px 0'
                    }}
                >
                    {bars.map((height, idx) => {
                        const isPlayed = (idx / bars.length) * 100 <= progress;
                        return (
                            <div key={idx} style={{ 
                                width: '3px', 
                                height: `${height}%`, 
                                backgroundColor: isPlayed ? activeColor : inactiveWaveColor, 
                                borderRadius: '10px', // Perfect pill shape
                                transition: 'background-color 0.15s ease',
                                transform: isPlayed && isPlaying && Math.abs((progress / 100) * bars.length - idx) < 1 ? 'scaleY(1.15)' : 'scaleY(1)'
                            }} />
                        );
                    })}
                </div>

                {/* Sub-Metadata Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '500', color: textColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.3px' }}>
                        {isPlaying || progress > 0 ? formatTime(currentTime) : formatTime(duration || 0)}
                    </span>
                    
                    {/* Sleek Speed Toggle */}
                    <button onClick={toggleSpeed} style={{ 
                        background: 'transparent', border: 'none', 
                        color: activeColor, fontSize: '0.7rem', fontWeight: '700', 
                        padding: '0', cursor: 'pointer', opacity: 0.85
                    }}>
                        {playbackRate}x
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceNotePlayer;