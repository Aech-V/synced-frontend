import React, { useState, useEffect } from 'react';
import { X, Send, Eye, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import { apiClient, resolveDirectMessage } from '../utils/api'; // FIX: Real backend routing added

// FIX: Changed prop from 'statusGroup' to 'status' to match what ChatListPane is actually passing!
const StatusViewerModal = ({ status, onClose }) => {
    const statusGroup = status; // Reassign internally to fix the crash
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const items = statusGroup?.items || [];
    const currentStatus = items[currentIndex]; 
    const DURATION = currentStatus?.mediaType === 'video' ? 15000 : 5000; 

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        } else {
            setProgress(0);
        }
    };

    useEffect(() => {
        if (isPaused || items.length === 0) return; 

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + (100 / (DURATION / 16.66));
            });
        }, 16.66);

        return () => clearInterval(interval);
    }, [currentIndex, isPaused, items.length, DURATION]);

    // THE REAL BACKEND REPLY ENGINE
    const handleReply = async () => {
        if (!replyText.trim() || isSending) return;
        setIsSending(true);
        setIsPaused(true); // Pause media while sending

        try {
            // 1. Ensure we have an active 1-on-1 DM room with the status creator
            const res = await resolveDirectMessage(statusGroup.user._id);
            const roomId = res.room._id;

            // 2. Post the message securely to the backend
            await apiClient.post('/messages', {
                roomId: roomId,
                type: 'text',
                text: replyText,
                // Optional: You can format the text like a quote: `> Replying to status\n\n${replyText}`
            });

            triggerHaptic('success');
            onClose(); // Close viewer when done
        } catch (error) {
            console.error("Failed to send reply", error);
            triggerHaptic('error');
            setIsSending(false);
            setIsPaused(false);
        }
    };

    if (items.length === 0) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
            
            {/* PROGRESS BAR STACK (Premium native app styling) */}
            <div style={{ display: 'flex', gap: '4px', padding: '16px 8px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }}>
                {items.map((_, idx) => (
                    <div key={idx} style={{ flex: 1, height: '2.5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                            height: '100%', backgroundColor: '#fff', 
                            width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                            transition: idx === currentIndex ? 'width 16ms linear' : 'none'
                        }} />
                    </div>
                ))}
            </div>

            {/* HEADER */}
            <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><X size={26} /></button>
                    <img src={statusGroup.user.avatar || `https://ui-avatars.com/api/?name=${statusGroup.user.username}&background=random`} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{statusGroup.isOwn ? 'My Status' : statusGroup.user.username}</span>
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                            {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* MEDIA RENDERER */}
            <div 
                onPointerDown={() => setIsPaused(true)} 
                onPointerUp={() => setIsPaused(false)}
                onPointerLeave={() => setIsPaused(false)}
                style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                {currentStatus.mediaType === 'video' ? (
                    <video src={currentStatus.mediaUrl} autoPlay playsInline style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                    <img src={currentStatus.mediaUrl} style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}

                {/* Invisible Touch Navigation Zones */}
                <div onClick={(e) => { e.stopPropagation(); handlePrev(); }} style={{ position: 'absolute', top: '100px', bottom: '100px', left: 0, width: '30%', zIndex: 5, cursor: 'w-resize' }} />
                <div onClick={(e) => { e.stopPropagation(); handleNext(); }} style={{ position: 'absolute', top: '100px', bottom: '100px', right: 0, width: '70%', zIndex: 5, cursor: 'e-resize' }} />
            </div>

            {/* FOOTER */}
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                {statusGroup.isOwn ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: '#fff', padding: '12px 0' }}>
                        <Eye size={22} />
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{currentStatus.viewers?.length || 0}</span>
                    </div>
                ) : (
                    <>
                        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '30px', padding: '14px 20px', display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <input 
                                type="text" placeholder="Reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)} onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                                disabled={isSending}
                                style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '1rem' }}
                            />
                        </div>
                        <AnimatePresence>
                            {replyText.trim() && (
                                <motion.button 
                                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                                    disabled={isSending} onClick={handleReply} 
                                    style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                >
                                    {isSending ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={20} color="#000" /></motion.div> : <Send size={20} color="#000" style={{ marginLeft: '2px' }} />}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </div>
    );
};

export default StatusViewerModal;