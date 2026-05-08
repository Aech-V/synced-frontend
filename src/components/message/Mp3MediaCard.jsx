import React, { useState, useRef } from 'react';
import { Play, Pause, Music, Download } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const Mp3MediaCard = ({ audioUrl, fileName, fileSize, isOwn }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const togglePlay = () => {
        triggerHaptic('light');
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleScrub = (e) => {
        const bounds = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - bounds.left) / bounds.width;
        audioRef.current.currentTime = percent * audioRef.current.duration;
        setProgress(percent * 100);
    };

    const formatSize = (bytes) => {
        if (!bytes) return "Unknown Size";
        const mb = (bytes / (1024 * 1024)).toFixed(1);
        return `${mb} MB`;
    };

    const bgColor = isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-surface-hover)';
    const textColor = isOwn ? '#ffffff' : 'var(--text-primary)';
    const subTextColor = isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)';

    return (
        <div style={{ 
            display: 'flex', flexDirection: 'column', padding: '12px', 
            backgroundColor: bgColor, borderRadius: '12px', width: '280px', border: '1px solid rgba(128,128,128,0.1)'
        }}>
            <audio ref={audioRef} src={audioUrl} onTimeUpdate={() => setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)} onEnded={() => setIsPlaying(false)} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                {/* Album Art Placeholder */}
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2A2511', flexShrink: 0 }}>
                    <Music size={24} />
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: textColor, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {fileName || 'Audio Track.mp3'}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: subTextColor, display: 'block', marginTop: '2px' }}>
                        MP3 Audio • {formatSize(fileSize)}
                    </span>
                </div>

                <button onClick={togglePlay} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: textColor, color: bgColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
                </button>
            </div>

            {/* Scrubbing Timeline */}
            <div onClick={handleScrub} style={{ height: '4px', backgroundColor: subTextColor, borderRadius: '2px', cursor: 'pointer', position: 'relative' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: isOwn ? '#ffffff' : 'var(--accent-primary)', borderRadius: '2px', transition: 'width 0.1s linear' }} />
                {/* Scrub Knob */}
                <div style={{ position: 'absolute', top: '50%', left: `${progress}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', backgroundColor: isOwn ? '#ffffff' : 'var(--accent-primary)', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
            </div>
        </div>
    );
};

export default Mp3MediaCard;