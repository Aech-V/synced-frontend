import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const formatTime = (secs) => `${Math.floor(secs / 60)}:${secs % 60 < 10 ? '0' : ''}${secs % 60}`;

const ActiveRecordingUI = ({ isMobile, isLocked, recordingTime, abortRecording, trashScale, trashColor, cancelOpacity, analyser }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);

    // The Canvas Renderer
    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const draw = () => {
            requestRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            
            if (rect.width === 0) return;

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, rect.width, rect.height);

            const barCount = 28; 
            const gap = 3;
            const barWidth = (rect.width - (gap * (barCount - 1))) / barCount;
            const centerY = rect.height / 2;

            let x = 0;

            for (let i = 0; i < barCount; i++) {
                const dataIndex = Math.floor(i * (analyser.frequencyBinCount / (barCount * 1.5)));
                const value = dataArray[dataIndex];
                const percent = value / 255;
                const height = Math.max(4, percent * rect.height * 0.85); 

                ctx.beginPath();
                ctx.lineCap = 'round';
                ctx.lineWidth = Math.max(2, barWidth);
                
                ctx.strokeStyle = '#FCCB06'; 
                
                ctx.moveTo(x + barWidth / 2, centerY - height / 2);
                ctx.lineTo(x + barWidth / 2, centerY + height / 2);
                ctx.stroke();

                x += barWidth + gap;
            }
        };

        draw();

        return () => cancelAnimationFrame(requestRef.current);
    }, [analyser]);

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ width: '100%', height: isMobile ? '40px' : '48px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '24px', padding: isMobile ? '0 12px' : '0 16px', overflow: 'hidden' }}>
            {isLocked ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                    <div style={{ flexShrink: 0, display: 'flex' }}>
                        <Trash2 size={20} color="#ef4444" cursor="pointer" onClick={abortRecording} />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                        <span style={{ color: '#fff', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem' }}>{formatTime(recordingTime)}</span>
                    </div>

                    <div style={{ flex: 1, height: '24px', display: 'flex', alignItems: 'center', marginLeft: '6px' }}>
                        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <motion.div style={{ scale: trashScale, color: trashColor, flexShrink: 0 }}><Trash2 size={20} /></motion.div>
                    <motion.div style={{ opacity: cancelOpacity, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            <span style={{ color: '#fff', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem' }}>{formatTime(recordingTime)}</span>
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>&lt; Slide to cancel</span>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default ActiveRecordingUI;