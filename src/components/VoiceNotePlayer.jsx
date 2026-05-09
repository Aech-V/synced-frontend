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

    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};
    const finalAvatar = isOwn && currentUser.avatar ? currentUser.avatar : senderAvatar;

    const bars = useMemo(() => {
        return [
            15, 25, 40, 60, 85, 100, 90, 70, 50, 35, 
            30, 45, 65, 80, 60, 40, 30, 45, 75, 95, 
            85, 60, 40, 25, 20, 35, 55, 65, 40, 20
        ];
    }, []);

    useEffect(() => {
        if (audioRef.current && audioUrl) {
            audioRef.current.pause();
            audioRef.current.load(); 
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        }
    }, [audioUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    // FIX: Completely block Framer Motion from stealing the click
    const togglePlay = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        triggerHaptic('light');
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name !== 'AbortError') {
                        console.error('Audio playback error:', error);
                    }
                    setIsPlaying(false);
                });
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const total = audioRef.current.duration;
            setCurrentTime(current);
            if (total && !isNaN(total)) {
                setProgress((current / total) * 100);
            }
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
    };

    const handleSeek = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (!audioRef.current || !audioRef.current.duration) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        
        const newTime = percentage * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        setProgress(percentage * 100);
    };

    const toggleSpeed = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
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

    const activeColor = isOwn ? '#ffffff' : 'var(--accent-primary)';
    const inactiveWaveColor = isOwn ? 'rgba(255, 255, 255, 0.35)' : 'rgba(107, 114, 128, 0.25)';
    const playBtnBg = isOwn ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-surface-hover)';
    const textColor = isOwn ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)';
    const bubbleBgColor = isOwn ? 'var(--accent-primary)' : 'var(--bg-primary)';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '250px', maxWidth: '100%', padding: '4px 2px' }}>
            <audio 
                ref={audioRef} 
                src={audioUrl} 
                onTimeUpdate={handleTimeUpdate} 
                onEnded={handleEnded}
                preload="metadata"
                onError={(e) => {
                    console.error("Audio element failed to load the source:", audioUrl);
                    setIsPlaying(false);
                }}
            />

            <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                <img 
                    src={finalAvatar} alt="Sender" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                />
                <div style={{ 
                    position: 'absolute', bottom: -2, right: -4, 
                    backgroundColor: isOwn ? '#10b981' : 'var(--bg-surface)', 
                    borderRadius: '50%', padding: '3px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 0 2px ${bubbleBgColor}`
                }}>
                    <Mic size={10} color={isOwn ? '#fff' : 'var(--accent-primary)'} fill="currentColor" />
                </div>
            </div>

            <button 
                onClick={togglePlay} 
                onPointerDown={(e) => e.stopPropagation()} // Overrides Framer Motion drag hijack
                style={{ 
                    width: '38px', height: '38px', borderRadius: '50%', 
                    backgroundColor: playBtnBg, color: activeColor, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0,
                    transition: 'background-color 0.2s, transform 0.1s',
                    position: 'relative', zIndex: 10
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
            </button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '4px' }}>
                <div 
                    ref={waveformRef} 
                    onClick={handleSeek}
                    onPointerDown={(e) => e.stopPropagation()} // Overrides Framer Motion drag hijack
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '28px', cursor: 'pointer', padding: '2px 0', position: 'relative', zIndex: 10 }}
                >
                    {bars.map((height, idx) => {
                        const isPlayed = (idx / bars.length) * 100 <= progress;
                        return (
                            <div key={idx} style={{ 
                                width: '3px', height: `${height}%`, 
                                backgroundColor: isPlayed ? activeColor : inactiveWaveColor, 
                                borderRadius: '10px', transition: 'background-color 0.15s ease',
                                transform: isPlayed && isPlaying && Math.abs((progress / 100) * bars.length - idx) < 1 ? 'scaleY(1.15)' : 'scaleY(1)'
                            }} />
                        );
                    })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '500', color: textColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.3px' }}>
                        {isPlaying || progress > 0 ? formatTime(currentTime) : formatTime(duration || 0)}
                    </span>
                    <button 
                        onClick={toggleSpeed} 
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ background: 'transparent', border: 'none', color: activeColor, fontSize: '0.7rem', fontWeight: '700', padding: '0', cursor: 'pointer', opacity: 0.85, position: 'relative', zIndex: 10 }}
                    >
                        {playbackRate}x
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceNotePlayer;